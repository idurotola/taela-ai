package email

import (
	"context"
	"log"
	"strings"
)

// LoggingProvider is a Provider that logs messages instead of sending them.
// It's the fallback when no real provider is configured (e.g. local dev
// without a Mailtrap API token), so the rest of the app can call Service
// unconditionally — nothing has to branch on "is email set up".
type LoggingProvider struct{}

func (LoggingProvider) Send(_ context.Context, msg Message) error {
	to := make([]string, 0, len(msg.To))
	for _, r := range msg.To {
		to = append(to, r.Email)
	}
	log.Printf(
		"[email] no provider configured — logging instead of sending.\nKind: %s  Category: %s\nTo: %s\nSubject: %s\n\n%s\n",
		msg.Kind, msg.Category, strings.Join(to, ", "), msg.Subject, msg.Text,
	)
	return nil
}

var _ Provider = LoggingProvider{}
