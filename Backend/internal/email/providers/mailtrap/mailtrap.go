// Package mailtrap implements email.Provider over Mailtrap's official Go
// SDK (github.com/mailtrap/mailtrap-go). It's deliberately thin — this is
// the only file in the whole app that knows Mailtrap exists — so it also
// doubles as the reference example for writing another provider
// (Mailchimp, Mailjet, ...); see this package's shape and ../../README.md.
package mailtrap

import (
	"context"
	"fmt"
	"net/http"

	sdk "github.com/mailtrap/mailtrap-go"

	"taela-ai-backend/internal/email"
)

// Provider sends mail through Mailtrap. It satisfies email.Provider.
//
// Routing follows email.Message.Kind: KindMarketing goes out over
// Mailtrap's bulk sending host, everything else over the transactional
// host — unless Sandbox is set, in which case every send (either kind) is
// captured by a Mailtrap Testing inbox instead of actually being
// delivered, which is what you want outside production.
type Provider struct {
	// APIToken is a Mailtrap API token (dashboard -> Settings -> API
	// Tokens). Required.
	APIToken string

	// Sandbox, when true, routes every send to SandboxID's Testing inbox
	// instead of delivering it.
	Sandbox   bool
	SandboxID int64

	// HTTPClient lets callers override the client (timeouts, transport,
	// a mock for tests). The SDK's own default is used when nil.
	HTTPClient *http.Client

	// ExtraOptions is an escape hatch appended after the options derived
	// above when building the SDK client — e.g. sdk.WithBaseURL(...) in
	// tests, to point a host at an httptest server.
	ExtraOptions []sdk.Option
}

func (p Provider) newClient(kind email.Kind) (*sdk.Client, error) {
	opts := make([]sdk.Option, 0, 3+len(p.ExtraOptions))
	if p.HTTPClient != nil {
		opts = append(opts, sdk.WithHTTPClient(p.HTTPClient))
	}
	switch {
	case p.Sandbox:
		opts = append(opts, sdk.WithSandbox(true), sdk.WithSandboxID(p.SandboxID))
	case kind == email.KindMarketing:
		opts = append(opts, sdk.WithBulk(true))
	}
	opts = append(opts, p.ExtraOptions...)
	return sdk.NewClient(p.APIToken, opts...)
}

func toAddress(r email.Recipient) sdk.Address {
	return sdk.Address{Email: r.Email, Name: r.Name}
}

func toAddresses(recipients []email.Recipient) []sdk.Address {
	if len(recipients) == 0 {
		return nil
	}
	out := make([]sdk.Address, 0, len(recipients))
	for _, r := range recipients {
		out = append(out, toAddress(r))
	}
	return out
}

// Send implements email.Provider.
func (p Provider) Send(ctx context.Context, msg email.Message) error {
	if p.APIToken == "" {
		return fmt.Errorf("mailtrap: no API token configured")
	}

	client, err := p.newClient(msg.Kind)
	if err != nil {
		return fmt.Errorf("mailtrap: building client: %w", err)
	}

	req := &sdk.SendRequest{
		From:     toAddress(msg.From),
		To:       toAddresses(msg.To),
		Cc:       toAddresses(msg.Cc),
		Bcc:      toAddresses(msg.Bcc),
		Subject:  msg.Subject,
		Text:     msg.Text,
		HTML:     msg.HTML,
		Category: msg.Category,
	}
	if msg.ReplyTo != "" {
		req.ReplyTo = &sdk.Address{Email: msg.ReplyTo}
	}

	if _, _, err := client.Send(ctx, req); err != nil {
		return fmt.Errorf("mailtrap: %w", err)
	}
	return nil
}

var _ email.Provider = Provider{}
