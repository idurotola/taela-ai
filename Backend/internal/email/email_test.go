package email

import (
	"context"
	"testing"
)

type recordingProvider struct {
	sent []Message
}

func (r *recordingProvider) Send(_ context.Context, msg Message) error {
	r.sent = append(r.sent, msg)
	return nil
}

func TestService_DefaultFromByKind(t *testing.T) {
	provider := &recordingProvider{}
	svc := NewService(provider,
		Recipient{Email: "no-reply@taelahr.com", Name: "TaelaAI"},
		Recipient{Email: "updates@taelahr.com", Name: "TaelaAI Updates"},
	)

	if err := svc.SendTransactional(context.Background(), Recipient{Email: "user@example.com"}, "Hi", "text", "", "welcome"); err != nil {
		t.Fatalf("SendTransactional() error = %v", err)
	}
	if err := svc.SendMarketing(context.Background(), []Recipient{{Email: "user@example.com"}}, "News", "text", "", "product-update"); err != nil {
		t.Fatalf("SendMarketing() error = %v", err)
	}

	if len(provider.sent) != 2 {
		t.Fatalf("got %d sends, want 2", len(provider.sent))
	}
	if got := provider.sent[0].From.Email; got != "no-reply@taelahr.com" {
		t.Errorf("transactional From = %q, want no-reply@taelahr.com", got)
	}
	if got := provider.sent[1].From.Email; got != "updates@taelahr.com" {
		t.Errorf("marketing From = %q, want updates@taelahr.com", got)
	}
}

func TestService_MarketingFromFallsBackToDefault(t *testing.T) {
	provider := &recordingProvider{}
	svc := NewService(provider, Recipient{Email: "no-reply@taelahr.com"}, Recipient{})

	if err := svc.SendMarketing(context.Background(), []Recipient{{Email: "user@example.com"}}, "News", "text", "", "product-update"); err != nil {
		t.Fatalf("SendMarketing() error = %v", err)
	}
	if got := provider.sent[0].From.Email; got != "no-reply@taelahr.com" {
		t.Errorf("From = %q, want fallback no-reply@taelahr.com", got)
	}
}

func TestService_NoRecipientsErrors(t *testing.T) {
	svc := NewService(&recordingProvider{}, Recipient{Email: "no-reply@taelahr.com"}, Recipient{})
	err := svc.Send(context.Background(), Message{Subject: "Hi"})
	if err == nil {
		t.Fatal("expected error for a message with no recipients, got nil")
	}
}

func TestService_NilProviderErrors(t *testing.T) {
	var svc *Service
	err := svc.Send(context.Background(), Message{To: []Recipient{{Email: "a@b.com"}}})
	if err == nil {
		t.Fatal("expected error for a nil service, got nil")
	}
}
