package tailor

import (
	"context"
	"strings"
	"testing"

	"taela-ai-backend/internal/cvparse"
)

type fakeAI string

func (f fakeAI) Complete(context.Context, string, string, int) (string, error) { return string(f), nil }

var baseCV = cvparse.Parsed{
	FullName: "Ada Lovelace", JobTitle: "Software Engineer", Email: "ada@x.com",
	Summary: "Engineer who builds billing APIs.",
	Skills:  []string{"Go", "SQL"},
	Experiences: []cvparse.Experience{
		{Role: "Engineer", Company: "Acme", Dates: "2020 - Present", Bullets: []string{"Built billing API serving 2M users", "Cut costs 30%"}},
		{Role: "Intern", Company: "Beta", Dates: "2019", Bullets: []string{"Wrote tests"}},
	},
	Education: []cvparse.Education{{School: "UCL", Degree: "BSc", Dates: "2016-2019"}},
}

func TestScoreMatchesAgainstCVTextNotModelClaims(t *testing.T) {
	m, err := Score(context.Background(), fakeAI(`{"keywords":["Go","SQL","Kubernetes","Terraform"],"fit":80,"strengths":["APIs"],"gaps":["No infra"],"summary":"ok"}`), baseCV, Job{Title: "SRE", Company: "Z", Description: "<p>Go and k8s</p>"})
	if err != nil {
		t.Fatal(err)
	}
	if len(m.Matched) != 2 || len(m.Missing) != 2 || m.Coverage != 50 {
		t.Fatalf("coverage wrong: %+v", m)
	}
	if m.Score != 62 { // (6*50 + 4*80 + 5)/10
		t.Fatalf("score = %d, want 62", m.Score)
	}
}

func TestScoreClampsAndHandlesNoKeywords(t *testing.T) {
	m, _ := Score(context.Background(), fakeAI(`{"keywords":[],"fit":250}`), baseCV, Job{})
	if m.Score != 100 || len(m.Matched) != 0 {
		t.Fatalf("got %+v", m)
	}
}

func TestEnforceTruthBlocksInventedFacts(t *testing.T) {
	out := cvparse.Parsed{
		FullName: "Someone Else", JobTitle: "CTO", // identity must be restored
		Summary: "Led 500 engineers across 12 countries.", // invented figures
		Skills:  []string{"Go", "Kubernetes", "SQL"},      // Kubernetes not in CV
		Experiences: []cvparse.Experience{
			{Role: "Engineer", Company: "Acme", Dates: "1999-2030", Bullets: []string{"Built billing API serving 2M users", "Grew revenue 400%"}},
			{Role: "VP", Company: "Google", Dates: "2021", Bullets: []string{"Ran everything"}}, // invented employer
		},
	}
	got, notes := enforceTruth(baseCV, out)

	if got.FullName != "Ada Lovelace" || got.JobTitle != "Software Engineer" {
		t.Errorf("identity not restored: %q / %q", got.FullName, got.JobTitle)
	}
	if got.Summary != baseCV.Summary {
		t.Errorf("summary with invented numbers should be reverted, got %q", got.Summary)
	}
	for _, s := range got.Skills {
		if s == "Kubernetes" {
			t.Error("invented skill survived")
		}
	}
	if len(got.Experiences) != 2 || got.Experiences[0].Company != "Acme" || got.Experiences[1].Company != "Beta" {
		t.Fatalf("experiences wrong (invented dropped, dropped originals restored): %+v", got.Experiences)
	}
	if got.Experiences[0].Dates != "2020 - Present" {
		t.Errorf("dates must come from the original, got %q", got.Experiences[0].Dates)
	}
	for _, b := range got.Experiences[0].Bullets {
		if strings.Contains(b, "400%") {
			t.Error("bullet with invented figure survived")
		}
	}
	if len(got.Education) != 1 || len(notes) == 0 {
		t.Errorf("education restored=%d notes=%v", len(got.Education), notes)
	}
}

func TestTailorEndToEndWithRewording(t *testing.T) {
	reply := `{"content":{"summary":"Backend engineer building billing APIs for 2M users.","skills":["SQL","Go"],
	"experiences":[{"role":"Engineer","company":"Acme","dates":"x","bullets":["Designed billing API for 2M users","Reduced costs by 30%"]},
	               {"role":"Intern","company":"Beta","dates":"x","bullets":["Wrote automated tests"]}],
	"education":[{"school":"UCL","degree":"BSc","dates":"x"}]},"coverLetter":"Dear team, ...","changes":["Reworded bullets"]}`
	got, err := Tailor(context.Background(), fakeAI(reply), baseCV, Job{Title: "Backend", Company: "Z"})
	if err != nil {
		t.Fatal(err)
	}
	if got.Content.Experiences[0].Bullets[0] != "Designed billing API for 2M users" {
		t.Errorf("valid rewording should be kept: %+v", got.Content.Experiences[0])
	}
	if got.Content.Skills[0] != "SQL" || got.CoverLetter == "" || len(got.Changes) != 1 {
		t.Errorf("unexpected result: %+v", got)
	}
	if Hash(baseCV) == Hash(got.Content) {
		t.Error("hash should differ for different content")
	}
}

func TestQuickMatch(t *testing.T) {
	strong := QuickMatch(baseCV, Job{Title: "Backend Software Engineer", Description: "<p>Build billing APIs in Go with SQL. Experience required.</p>"})
	weak := QuickMatch(baseCV, Job{Title: "Pastry Chef", Description: "Bake croissants and sourdough for our bakery"})
	if strong <= weak || strong < 40 || weak > 15 {
		t.Fatalf("expected a clear gap, strong=%d weak=%d", strong, weak)
	}
	if got := QuickMatch(cvparse.Parsed{}, Job{Title: "Engineer"}); got != -1 {
		t.Fatalf("empty CV should be -1, got %d", got)
	}
	if got := QuickMatch(baseCV, Job{}); got != -1 {
		t.Fatalf("empty job should be -1, got %d", got)
	}
	if a, b := QuickMatch(baseCV, Job{Title: "APIs engineer"}), QuickMatch(baseCV, Job{Title: "API engineer"}); a != b {
		t.Fatalf("plural stemming: %d vs %d", a, b)
	}
}
