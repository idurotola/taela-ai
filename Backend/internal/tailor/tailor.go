// Package tailor scores a candidate's CV against one job and rewrites it for
// that job. The model proposes; this package disposes — everything it returns
// is checked against the original CV so a tailored CV can reword and reorder
// what the candidate really has, but can't invent employers, dates, skills or
// numbers.
package tailor

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"regexp"
	"strings"

	"taela-ai-backend/internal/cvparse"
)

// Job is the part of a posting the model sees.
type Job struct {
	Title       string
	Company     string
	Description string
}

const maxDescriptionChars = 8000

var tagPattern = regexp.MustCompile(`<[^>]+>`)

// prepareJob strips markup and bounds the size of untrusted job text.
func prepareJob(j Job) Job {
	d := tagPattern.ReplaceAllString(j.Description, " ")
	d = strings.Join(strings.Fields(d), " ")
	if r := []rune(d); len(r) > maxDescriptionChars {
		d = string(r[:maxDescriptionChars])
	}
	j.Description = d
	return j
}

// CVText flattens a CV to the text used for keyword matching and truth checks.
func CVText(cv cvparse.Parsed) string {
	var sb strings.Builder
	w := func(s string) { sb.WriteString(s); sb.WriteByte('\n') }
	w(cv.FullName)
	w(cv.JobTitle)
	w(cv.Summary)
	for _, s := range cv.Skills {
		w(s)
	}
	for _, e := range cv.Experiences {
		w(e.Role)
		w(e.Company)
		w(e.Dates)
		for _, b := range e.Bullets {
			w(b)
		}
	}
	for _, e := range cv.Education {
		w(e.School)
		w(e.Degree)
		w(e.Dates)
	}
	return sb.String()
}

// Hash identifies one CV's content, so a cached score or tailoring is reused
// only while the CV is unchanged.
func Hash(cv cvparse.Parsed) string {
	b, _ := json.Marshal(cv)
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

func parseJSON(reply string, into any) error {
	start, end := strings.IndexByte(reply, '{'), strings.LastIndexByte(reply, '}')
	if start < 0 || end <= start {
		return errors.New("the model did not return structured data")
	}
	if err := json.Unmarshal([]byte(reply[start:end+1]), into); err != nil {
		return errors.New("the model returned malformed data")
	}
	return nil
}

func clip(s string, max int) string {
	s = strings.TrimSpace(s)
	if r := []rune(s); len(r) > max {
		s = string(r[:max])
	}
	return s
}

func clipList(in []string, maxItems, maxLen int) []string {
	out := make([]string, 0, len(in))
	for _, s := range in {
		if s = clip(s, maxLen); s != "" && len(out) < maxItems {
			out = append(out, s)
		}
	}
	return out
}

func norm(s string) string { return strings.ToLower(strings.Join(strings.Fields(s), " ")) }
