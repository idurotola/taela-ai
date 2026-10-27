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

// simpleMail renders the shared shape of the notification emails below:
// greeting, a few paragraphs, and an optional call-to-action link.
func (s *Service) simpleMail(ctx context.Context, to Recipient, subject, category string, paragraphs []string, linkLabel, link string) error {
	name := firstNameOr(to.Name, "there")

	var text strings.Builder
	var htmlBody strings.Builder
	fmt.Fprintf(&text, "Hi %s,\n\n", name)
	fmt.Fprintf(&htmlBody, "<p>Hi %s,</p>", html.EscapeString(name))
	for _, p := range paragraphs {
		text.WriteString(p + "\n\n")
		fmt.Fprintf(&htmlBody, "<p>%s</p>", html.EscapeString(p))
	}
	if link != "" {
		fmt.Fprintf(&text, "%s: %s\n\n", linkLabel, link)
		fmt.Fprintf(&htmlBody, `<p><a href="%s">%s</a></p>`, html.EscapeString(link), html.EscapeString(linkLabel))
	}
	text.WriteString("— TaelaAI")
	htmlBody.WriteString("<p>— TaelaAI</p>")
	return s.SendTransactional(ctx, to, subject, text.String(), htmlBody.String(), category)
}

// SendGuestApplicationVerification asks someone who applied without an
// account to confirm their email; the application isn't delivered until they do.
func (s *Service) SendGuestApplicationVerification(ctx context.Context, to Recipient, jobTitle, company, link string) error {
	return s.simpleMail(ctx, to, "Confirm your application to "+jobTitle, "application-verify",
		[]string{
			fmt.Sprintf("You applied for %s at %s. Please confirm your email address to send your application — it isn't delivered to the employer until you do. The link expires in 48 hours.", jobTitle, company),
			"If you didn't apply, you can ignore this email and nothing will be sent.",
		}, "Confirm and send my application", link)
}

// SendApplicationReceived tells a candidate their application was delivered.
func (s *Service) SendApplicationReceived(ctx context.Context, to Recipient, jobTitle, company, trackLink string) error {
	return s.simpleMail(ctx, to, "Application sent: "+jobTitle, "application-received",
		[]string{fmt.Sprintf("Your application for %s at %s has been delivered. We'll email you when its status changes.", jobTitle, company)},
		"Track your application", trackLink)
}

// SendNewApplicant tells a recruiter someone applied to their posting.
func (s *Service) SendNewApplicant(ctx context.Context, to Recipient, jobTitle, applicantName, link string) error {
	return s.simpleMail(ctx, to, "New applicant for "+jobTitle, "new-applicant",
		[]string{fmt.Sprintf("%s applied for %s.", applicantName, jobTitle)},
		"Review the applicant", link)
}

// stageCopy is the candidate-facing wording for each pipeline stage.
var stageCopy = map[string]string{
	"review":       "is now under review",
	"shortlisted":  "has been shortlisted — great news",
	"interviewing": "has moved to the interview stage",
	"offered":      "has resulted in an offer — congratulations",
	"rejected":     "was not successful this time. Thank you for your interest, and we wish you the best in your search",
}

// SendApplicationUpdate tells a candidate their application changed stage.
// Stages with no candidate-facing wording (e.g. "applied") send nothing.
func (s *Service) SendApplicationUpdate(ctx context.Context, to Recipient, jobTitle, company, stage, link string) error {
	copy, ok := stageCopy[stage]
	if !ok {
		return nil
	}
	return s.simpleMail(ctx, to, "Update on your application: "+jobTitle, "application-update",
		[]string{fmt.Sprintf("Your application for %s at %s %s.", jobTitle, company, copy)},
		"View your applications", link)
}

// SendRecruiterVerification proves control of a company email address.
func (s *Service) SendRecruiterVerification(ctx context.Context, to Recipient, company, link string) error {
	return s.simpleMail(ctx, to, "Verify "+company+" on TaelaAI", "recruiter-verify",
		[]string{fmt.Sprintf("Confirm this is your work address to verify %s on TaelaAI. Once verified you can publish jobs. The link expires in 48 hours.", company)},
		"Verify my company", link)
}

// SendAutoApplyDigest tells a candidate that new jobs matching their
// auto-apply rule are waiting for their approval.
func (s *Service) SendAutoApplyDigest(ctx context.Context, to Recipient, n int, link string) error {
	noun := "jobs"
	if n == 1 {
		noun = "job"
	}
	return s.simpleMail(ctx, to, fmt.Sprintf("%d new %s match your auto-apply rules", n, noun), "auto-apply-digest",
		[]string{fmt.Sprintf("We found %d new %s that fit your auto-apply rules. Nothing has been sent — review and approve the ones you want.", n, noun)},
		"Review matches", link)
}
