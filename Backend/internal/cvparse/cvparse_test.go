package cvparse

import (
	"archive/zip"
	"bytes"
	"context"
	"strings"
	"testing"
)

func makeDocx(t *testing.T, paragraphs ...string) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	w, _ := zw.Create("word/document.xml")
	var body strings.Builder
	body.WriteString(`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>`)
	for _, p := range paragraphs {
		body.WriteString(`<w:p><w:r><w:t>` + p + `</w:t></w:r></w:p>`)
	}
	body.WriteString(`</w:body></w:document>`)
	w.Write([]byte(body.String()))
	zw.Close()
	return buf.Bytes()
}

func TestDetectByContentNotName(t *testing.T) {
	if k, err := Detect(makeDocx(t, "x")); err != nil || k != KindDOCX {
		t.Fatalf("docx: %v %v", k, err)
	}
	if k, err := Detect([]byte("%PDF-1.7 ...")); err != nil || k != KindPDF {
		t.Fatalf("pdf: %v %v", k, err)
	}
	for name, b := range map[string][]byte{
		"exe":  []byte("MZ\x90\x00"),
		"text": []byte("just text"),
		"plain zip": func() []byte {
			var bb bytes.Buffer
			z := zip.NewWriter(&bb)
			z.Create("a.txt")
			z.Close()
			return bb.Bytes()
		}(),
	} {
		if _, err := Detect(b); err != ErrUnsupported {
			t.Errorf("%s should be unsupported, got %v", name, err)
		}
	}
}

func TestExtractDocxText(t *testing.T) {
	text, err := ExtractText(makeDocx(t, "Ada Lovelace", "Senior Engineer at Acme Ltd since 2020"), KindDOCX)
	if err != nil || !strings.Contains(text, "Ada Lovelace\n") || !strings.Contains(text, "Acme Ltd") {
		t.Fatalf("got %q, %v", text, err)
	}
	if _, err := ExtractText(makeDocx(t, "hi"), KindDOCX); err != ErrNoText {
		t.Fatalf("tiny doc should be ErrNoText, got %v", err)
	}
}

type fakeAI string

func (f fakeAI) Complete(context.Context, string, string, int) (string, error) { return string(f), nil }

func TestParseToleratesFencesAndSanitizes(t *testing.T) {
	reply := "Here you go:\n```json\n" + `{"fullName":"  Ada Lovelace ","skills":["Go","","SQL"],
	 "experiences":[{"role":"Engineer","company":"Acme","dates":"2020-","bullets":["Built X","  "]},{"role":"","company":""}],
	 "education":[{"school":"UCL","degree":"BSc","dates":""}]}` + "\n```"
	got, err := Parse(context.Background(), fakeAI(reply), "some cv text")
	if err != nil {
		t.Fatal(err)
	}
	if got.FullName != "Ada Lovelace" || len(got.Skills) != 2 || len(got.Experiences) != 1 || len(got.Experiences[0].Bullets) != 1 || len(got.Education) != 1 {
		t.Fatalf("unexpected result: %+v", got)
	}
	if _, err := Parse(context.Background(), fakeAI("no json here"), "x"); err == nil {
		t.Fatal("non-JSON reply must error")
	}
}
