package mailtrap

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	sdk "github.com/mailtrap/mailtrap-go"

	"taela-ai-backend/internal/email"
)

func TestSend_Transactional(t *testing.T) {
	var gotReq *http.Request
	var gotBody sdk.SendRequest
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotReq = r
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true,"message_ids":["abc123"]}`))
	}))
	defer srv.Close()

	p := Provider{
		APIToken:     "test-token",
		ExtraOptions: []sdk.Option{sdk.WithBaseURL(sdk.HostSend, srv.URL)},
	}
	err := p.Send(context.Background(), email.Message{
		Kind:     email.KindTransactional,
		From:     email.Recipient{Email: "no-reply@taelahr.com", Name: "TaelaAI"},
		To:       []email.Recipient{{Email: "user@example.com", Name: "User"}},
		Subject:  "Hello",
		Text:     "Hi there",
		Category: "welcome",
	})
	if err != nil {
		t.Fatalf("Send() error = %v", err)
	}

	if gotReq == nil {
		t.Fatal("server never received a request")
	}
	if gotReq.URL.Path != "/api/send" {
		t.Errorf("path = %q, want /api/send", gotReq.URL.Path)
	}
	if auth := gotReq.Header.Get("Authorization"); auth == "" {
		t.Error("expected an Authorization header to be set by the SDK")
	}
	if gotBody.From.Email != "no-reply@taelahr.com" || gotBody.Subject != "Hello" || gotBody.Category != "welcome" {
		t.Errorf("unexpected request body: %+v", gotBody)
	}
	if len(gotBody.To) != 1 || gotBody.To[0].Email != "user@example.com" {
		t.Errorf("unexpected To: %+v", gotBody.To)
	}
}

func TestSend_MarketingUsesBulkHost(t *testing.T) {
	var gotReq *http.Request
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotReq = r
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true}`))
	}))
	defer srv.Close()

	// Point only the bulk host at our test server — if the provider
	// didn't route marketing mail to the bulk host, this request would
	// go to the real (or unconfigured) transactional host and fail/hang
	// instead of landing here.
	p := Provider{
		APIToken:     "test-token",
		ExtraOptions: []sdk.Option{sdk.WithBaseURL(sdk.HostBulk, srv.URL)},
	}
	err := p.Send(context.Background(), email.Message{
		Kind:    email.KindMarketing,
		From:    email.Recipient{Email: "updates@taelahr.com"},
		To:      []email.Recipient{{Email: "user@example.com"}},
		Subject: "News",
	})
	if err != nil {
		t.Fatalf("Send() error = %v", err)
	}
	if gotReq == nil {
		t.Fatal("bulk host never received a request — marketing mail wasn't routed there")
	}
}

func TestSend_SandboxUsesSandboxHostAndID(t *testing.T) {
	var gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true}`))
	}))
	defer srv.Close()

	p := Provider{
		APIToken:     "test-token",
		Sandbox:      true,
		SandboxID:    999,
		ExtraOptions: []sdk.Option{sdk.WithBaseURL(sdk.HostSandbox, srv.URL)},
	}
	// Sandbox mode should win even for a "marketing" send — nothing should
	// ever hit a live bulk/transactional host from a non-production config.
	err := p.Send(context.Background(), email.Message{
		Kind:    email.KindMarketing,
		From:    email.Recipient{Email: "a@b.com"},
		To:      []email.Recipient{{Email: "c@d.com"}},
		Subject: "test",
	})
	if err != nil {
		t.Fatalf("Send() error = %v", err)
	}
	if gotPath != "/api/send/999" {
		t.Errorf("path = %q, want /api/send/999", gotPath)
	}
}

func TestSend_NoAPIToken(t *testing.T) {
	p := Provider{}
	err := p.Send(context.Background(), email.Message{
		From: email.Recipient{Email: "a@b.com"},
		To:   []email.Recipient{{Email: "c@d.com"}},
	})
	if err == nil {
		t.Fatal("expected error when APIToken is empty, got nil")
	}
}

func TestSend_ErrorResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = w.Write([]byte(`{"success":false,"errors":["'to' is required"]}`))
	}))
	defer srv.Close()

	p := Provider{
		APIToken:     "test-token",
		ExtraOptions: []sdk.Option{sdk.WithBaseURL(sdk.HostSend, srv.URL)},
	}
	err := p.Send(context.Background(), email.Message{
		From: email.Recipient{Email: "a@b.com"},
		To:   []email.Recipient{{Email: "c@d.com"}},
	})
	if err == nil {
		t.Fatal("expected error for a non-2xx response, got nil")
	}
}

var _ email.Provider = Provider{}
