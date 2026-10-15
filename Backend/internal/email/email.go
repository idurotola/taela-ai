// Package email is TaelaAI's outbound email service. It gives the rest of
// the backend one small surface — Service — to send both internal
// notifications (password resets, welcome emails, application updates, ...)
// and marketing email (product announcements, digests, ...), without any
// caller knowing which provider is actually doing the sending.
//
// Swapping providers (e.g. Mailtrap -> Mailchimp or Mailjet) means writing
// a type that satisfies the Provider interface below and pointing a
// Service at it — nothing else in the app changes. See
// providers/mailtrap for the reference implementation, and README.md in
// this package for how to add another one.
package email

import (
	"context"
	"fmt"
)

// Kind distinguishes internal/transactional mail from bulk marketing mail.
// Providers often price, rate-limit, route, or require list/consent
// handling for the two very differently, so every send declares which one
// it is rather than leaving it to the provider to guess from content.
type Kind string

const (
	KindTransactional Kind = "transactional"
	KindMarketing     Kind = "marketing"
)

// Recipient is a single email address, optionally with a display name.
type Recipient struct {
	Email string
	Name  string
}

// Message is a provider-agnostic description of a single send. Providers
// translate it into whatever shape their own API expects.
type Message struct {
	Kind    Kind
	From    Recipient
	To      []Recipient
	Cc      []Recipient
	Bcc     []Recipient
	ReplyTo string
	Subject string
	Text    string
	HTML    string
	// Category tags the send for the provider's own analytics/filtering
	// (Mailtrap calls this "category"; other providers may call it a tag
	// or template name). Keep it a short, stable, machine-readable slug,
	// e.g. "password-reset", "welcome", "product-update".
	Category string
}

// Provider is the seam every email backend implements. A Provider only
// needs to know how to hand a fully-formed Message to its API or SMTP
// relay — defaults, templating, and the transactional/marketing split all
// live in Service instead, so they're shared across every provider rather
// than duplicated per-backend.
type Provider interface {
	Send(ctx context.Context, msg Message) error
}

// Service is the thing the rest of the app calls — handlers never talk to
// a Provider directly. It fills in the right From address for the kind of
// mail being sent, then dispatches through whichever Provider it was
// built with.
type Service struct {
	Provider Provider

	// DefaultFrom is used for internal/transactional mail.
	DefaultFrom Recipient
	// MarketingFrom is used for marketing mail. Left as the zero value,
	// it falls back to DefaultFrom in NewService — most apps don't bother
	// with a separate marketing sender address until they need one
	// (e.g. "TaelaAI <updates@...>" vs "TaelaAI <no-reply@...>").
	MarketingFrom Recipient
}

// NewService wires a Provider with the From addresses used for each Kind
// of mail.
func NewService(provider Provider, defaultFrom, marketingFrom Recipient) *Service {
	if marketingFrom.Email == "" {
		marketingFrom = defaultFrom
	}
	return &Service{Provider: provider, DefaultFrom: defaultFrom, MarketingFrom: marketingFrom}
}

// Send fills in a From address appropriate for msg.Kind if the caller
// didn't set one explicitly, then dispatches through the configured
// Provider.
func (s *Service) Send(ctx context.Context, msg Message) error {
	if s == nil || s.Provider == nil {
		return fmt.Errorf("email: service has no provider configured")
	}
	if len(msg.To) == 0 {
		return fmt.Errorf("email: message has no recipients")
	}
	if msg.From.Email == "" {
		if msg.Kind == KindMarketing {
			msg.From = s.MarketingFrom
		} else {
			msg.From = s.DefaultFrom
		}
	}
	if err := s.Provider.Send(ctx, msg); err != nil {
		return fmt.Errorf("email: %w", err)
	}
	return nil
}

// SendTransactional is a convenience wrapper for the common case of a
// single internal/notification recipient.
func (s *Service) SendTransactional(ctx context.Context, to Recipient, subject, text, html, category string) error {
	return s.Send(ctx, Message{
		Kind:     KindTransactional,
		To:       []Recipient{to},
		Subject:  subject,
		Text:     text,
		HTML:     html,
		Category: category,
	})
}

// SendMarketing is a convenience wrapper for bulk/campaign mail to one or
// more recipients.
func (s *Service) SendMarketing(ctx context.Context, to []Recipient, subject, text, html, category string) error {
	return s.Send(ctx, Message{
		Kind:     KindMarketing,
		To:       to,
		Subject:  subject,
		Text:     text,
		HTML:     html,
		Category: category,
	})
}
