package handlers

import "testing"

func TestEmailMatchesCompany(t *testing.T) {
	cases := []struct {
		email, site string
		want        bool
	}{
		{"rex@acme.com", "https://www.acme.com", true},
		{"rex@acme.com", "acme.com/careers", true},
		{"rex@hr.acme.com", "https://acme.com", true},
		{"rex@acme.com", "https://jobs.acme.com", true},
		{"rex@gmail.com", "https://gmail.com", false}, // free mail never counts
		{"rex@evil-acme.com", "https://acme.com", false},
		{"rex@notacme.com", "https://acme.com", false},
		{"rex@acme.com", "", false},
	}
	for _, c := range cases {
		if got := emailMatchesCompany(c.email, c.site); got != c.want {
			t.Errorf("emailMatchesCompany(%q,%q) = %v, want %v", c.email, c.site, got, c.want)
		}
	}
}
