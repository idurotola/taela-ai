package tailor

import (
	"regexp"
	"strings"

	"taela-ai-backend/internal/cvparse"
)

// QuickMatch is a free, instant estimate of how much of a job's wording
// appears in a CV (0-100). It uses no AI, so it can be shown on every listing;
// the AI score from Score is the considered answer and replaces it once a
// candidate asks for one. It returns -1 when there is nothing to compare.
func QuickMatch(cv cvparse.Parsed, job Job) int {
	job = prepareJob(job)
	cvTokens := tokenSet(CVText(cv))
	if len(cvTokens) == 0 {
		return -1
	}

	weights := map[string]int{}
	order := []string{}
	add := func(text string, w, limit int) {
		n := 0
		for _, t := range tokenize(text) {
			if _, seen := weights[t]; seen {
				continue
			}
			if n >= limit {
				break
			}
			weights[t] = w
			order = append(order, t)
			n++
		}
	}
	add(job.Title, 3, 8)        // the title says what the role is
	add(job.Description, 1, 30) // then the first distinct terms of the listing
	if len(order) == 0 {
		return -1
	}

	total, hit := 0, 0
	for _, t := range order {
		total += weights[t]
		if cvTokens[t] {
			hit += weights[t]
		}
	}
	// Most of a listing is boilerplate no CV repeats, so even a strong fit
	// shares only about half its terms; double the raw overlap so the estimate
	// reads on the same scale as the AI score, and cap it below certainty.
	score := (hit*200 + total/2) / total
	if score > 95 {
		score = 95
	}
	return score
}

var tokenPattern = regexp.MustCompile(`[a-z0-9][a-z0-9+#.]*[a-z0-9+#]|[a-z0-9]`)

// shortKeep are 2-letter terms that matter in job text.
var shortKeep = map[string]bool{"go": true, "qa": true, "ui": true, "ux": true, "hr": true, "ai": true, "ml": true, "it": true, "c#": true}

// stem trims plural endings so "APIs" matches "api".
func stem(t string) string {
	if len(t) > 4 && strings.HasSuffix(t, "s") && !strings.HasSuffix(t, "ss") {
		return t[:len(t)-1]
	}
	return t
}

func tokenize(text string) []string {
	var out []string
	for _, t := range tokenPattern.FindAllString(strings.ToLower(text), -1) {
		t = strings.Trim(t, ".")
		if (len(t) < 3 && !shortKeep[t]) || stopwords[t] {
			continue
		}
		out = append(out, stem(t))
	}
	return out
}

func tokenSet(text string) map[string]bool {
	set := map[string]bool{}
	for _, t := range tokenize(text) {
		set[t] = true
	}
	return set
}

// stopwords are words that appear in nearly every job post and CV and so say
// nothing about fit.
var stopwords = func() map[string]bool {
	m := map[string]bool{}
	for _, w := range strings.Fields(`
		the and for with you your our are will have has had this that from they their them who what which when where
		not but all any can may must should would could able also such than then into over under about more most other
		per via etc job role position candidate candidates applicant applicants company team teams work working works
		experience experienced years year year's months looking seeking required requirement requirements responsibilities
		responsibility duties skills skill ability strong excellent good great knowledge understanding including include
		includes related relevant using use used within across between while both each well new high level plus
		must-have preferred minimum degree qualification qualifications opportunity opportunities apply join hiring
		full time part-time fulltime parttime permanent contract remote hybrid onsite site based location salary
		benefits competitive package offer offers day days week weeks monthly annual annually lagos abuja nigeria
		responsible ensure ensuring support supporting provide providing manage managing develop developing`) {
		m[w] = true
	}
	return m
}()
