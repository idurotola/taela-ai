package handlers

import (
	"reflect"
	"testing"
)

func TestMatchesTerms(t *testing.T) {
	if !matchesTerms("Anything", nil) {
		t.Error("no terms means everything matches")
	}
	if !matchesTerms("Senior Go Engineer", []string{"python", "GO engineer"}) {
		t.Error("match should be case-insensitive substring")
	}
	if matchesTerms("Designer", []string{"engineer"}) {
		t.Error("non-matching title must not match")
	}
}

func TestCleanTerms(t *testing.T) {
	got := cleanTerms([]string{" Go ", "go", "", "Rust"})
	if !reflect.DeepEqual(got, []string{"Go", "Rust"}) {
		t.Fatalf("got %v", got)
	}
	long := make([]string, 30)
	for i := range long {
		long[i] = string(rune('a'+i%26)) + string(rune('a'+i/26))
	}
	if len(cleanTerms(long)) != 10 {
		t.Error("terms must be capped at 10")
	}
}
