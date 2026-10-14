package email

import (
	"context"
	"fmt"
	"html"
	"strings"
)

// This file owns the copy for TaelaAI's internal/transactional
// notifications, so call sites (handlers) just say *what* happened
// ("a user signed up", "a reset was requested") and never touch wording,
// subject lines, or HTML.

// SendWelcome sends the post-signup welcome notification.
func (s *Service) SendWelcome(ctx context.Context, to Recipient) error {
	name := firstNameOr(to.Name, "there")
	subject := "Welcome to TaelaAI"
	text := fmt.Sprintf(
		"Hi %s,\n\nWelcome to TaelaAI — your account is ready. Build your CV, track your applications, and we'll surface matching roles as they come in.\n\n— TaelaAI",
		name,
	)
	htmlBody := fmt.Sprintf(
		`<p>Hi %s,</p><p>Welcome to TaelaAI — your account is ready. Build your CV, track your applications, and we'll surface matching roles as they come in.</p><p>— TaelaAI</p>`,
		html.EscapeString(name),
	)
	return s.SendTransactional(ctx, to, subject, text, htmlBody, "welcome")
}

// SendPasswordReset sends the "reset your password" notification.
// resetLink should already point at the frontend's reset-password page
// with the one-time token attached.
func (s *Service) SendPasswordReset(ctx context.Context, to Recipient, resetLink string) error {
	name := firstNameOr(to.Name, "there")
	subject := "Reset your TaelaAI password"
	text := fmt.Sprintf(
		"Hi %s,\n\nWe received a request to reset your TaelaAI password. Click the link below to choose a new one — it expires in 1 hour:\n\n%s\n\nIf you didn't request this, you can safely ignore this email and your password will stay the same.\n\n— TaelaAI",
		name, resetLink,
	)
	htmlBody := fmt.Sprintf(
		`<p>Hi %s,</p><p>We received a request to reset your TaelaAI password. Click the link below to choose a new one — it expires in 1 hour:</p><p><a href="%s">%s</a></p><p>If you didn't request this, you can safely ignore this email and your password will stay the same.</p><p>— TaelaAI</p>`,
		html.EscapeString(name), html.EscapeString(resetLink), html.EscapeString(resetLink),
	)
	return s.SendTransactional(ctx, to, subject, text, htmlBody, "password-reset")
}

func firstNameOr(name, fallback string) string {
	fields := strings.Fields(name)
	if len(fields) == 0 {
		return fallback
	}
	return fields[0]
}
