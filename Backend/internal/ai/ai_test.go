package ai

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAnthropicComplete(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-api-key") != "k" || r.URL.Path != "/v1/messages" {
			t.Errorf("bad request: %s key=%q", r.URL.Path, r.Header.Get("x-api-key"))
		}
		b, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(b), `"model":"m1"`) {
			t.Errorf("model missing from body: %s", b)
		}
		w.Write([]byte(`{"content":[{"type":"text","text":"hi "},{"type":"text","text":"there"}]}`))
	}))
	defer srv.Close()

	got, err := Anthropic{APIKey: "k", Model: "m1", BaseURL: srv.URL}.Complete(context.Background(), "sys", "user", 10)
	if err != nil || got != "hi there" {
		t.Fatalf("got %q, %v", got, err)
	}
}

func TestGeminiComplete(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-goog-api-key") != "k" || r.URL.Path != "/v1beta/models/g1:generateContent" {
			t.Errorf("bad request: %s", r.URL.Path)
		}
		w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}`))
	}))
	defer srv.Close()

	got, err := Gemini{APIKey: "k", Model: "g1", BaseURL: srv.URL}.Complete(context.Background(), "s", "u", 10)
	if err != nil || got != "ok" {
		t.Fatalf("got %q, %v", got, err)
	}
}

func TestProviderErrorsSurface(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"rate limited"}`, http.StatusTooManyRequests)
	}))
	defer srv.Close()
	if _, err := (Anthropic{APIKey: "k", Model: "m", BaseURL: srv.URL}).Complete(context.Background(), "s", "u", 5); err == nil || !strings.Contains(err.Error(), "429") {
		t.Fatalf("want a 429 error, got %v", err)
	}
	if _, err := (Disabled{}).Complete(context.Background(), "", "", 1); err != ErrNotConfigured {
		t.Fatalf("Disabled should return ErrNotConfigured, got %v", err)
	}
}
