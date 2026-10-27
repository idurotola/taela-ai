package storage

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"
)

func TestLocalRoundTripAndKeySafety(t *testing.T) {
	s := Local{Dir: t.TempDir()}
	ctx := context.Background()

	if err := s.Put(ctx, "cv/u1/a.pdf", strings.NewReader("hello"), 5, "application/pdf"); err != nil {
		t.Fatal(err)
	}
	rc, err := s.Get(ctx, "cv/u1/a.pdf")
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(rc)
	rc.Close()
	if string(b) != "hello" {
		t.Fatalf("got %q", b)
	}
	if err := s.Delete(ctx, "cv/u1/a.pdf"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Get(ctx, "cv/u1/a.pdf"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("want ErrNotFound after delete, got %v", err)
	}
	if err := s.Delete(ctx, "cv/u1/a.pdf"); err != nil {
		t.Fatalf("delete must be idempotent: %v", err)
	}
	for _, bad := range []string{"../escape", "/abs", ""} {
		if err := s.Put(ctx, bad, strings.NewReader("x"), 1, ""); err == nil {
			t.Fatalf("key %q should be rejected", bad)
		}
	}
}
