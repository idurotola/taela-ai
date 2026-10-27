package models

import "testing"

func TestJobSlug(t *testing.T) {
	got := JobSlug("Senior Engineer (Backend)", "Acme & Co.", "1a2b3c4d-0000-0000-0000-000000000000")
	want := "senior-engineer-backend-acme-co-1a2b3c4d"
	if got != want {
		t.Fatalf("JobSlug = %q, want %q", got, want)
	}
	if got := JobSlug("!!!", "", "abcd1234-x"); got != "abcd1234" {
		t.Fatalf("symbol-only title should fall back to the id, got %q", got)
	}
}
