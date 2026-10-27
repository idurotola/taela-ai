// Package cvparse turns an uploaded CV file into structured data: it
// validates the file by content, extracts its text, and asks an ai.Provider
// to organise that text into CV sections.
package cvparse

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/ledongthuc/pdf"
)

const (
	MaxFileBytes = 5 << 20 // 5 MB
	maxTextChars = 30000   // what we hand to the model
)

type Kind string

const (
	KindPDF  Kind = "pdf"
	KindDOCX Kind = "docx"
)

var (
	ErrUnsupported = errors.New("only PDF and DOCX files are supported")
	ErrNoText      = errors.New("no readable text found — scanned or image-only files aren't supported")
)

// Detect decides the file type from its bytes, never from the name or the
// client-supplied content type, so a renamed .exe can't pass as a CV.
func Detect(data []byte) (Kind, error) {
	if bytes.HasPrefix(data, []byte("%PDF-")) {
		return KindPDF, nil
	}
	if bytes.HasPrefix(data, []byte("PK\x03\x04")) {
		zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
		if err == nil {
			for _, f := range zr.File {
				if f.Name == "word/document.xml" {
					return KindDOCX, nil
				}
			}
		}
	}
	return "", ErrUnsupported
}

func ContentType(k Kind) string {
	if k == KindPDF {
		return "application/pdf"
	}
	return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

// ExtractText returns the plain text of a validated file.
func ExtractText(data []byte, kind Kind) (string, error) {
	var text string
	var err error
	switch kind {
	case KindPDF:
		text, err = pdfText(data)
	case KindDOCX:
		text, err = docxText(data)
	default:
		return "", ErrUnsupported
	}
	if err != nil {
		return "", fmt.Errorf("could not read the file: %w", err)
	}
	text = strings.TrimSpace(text)
	if len(strings.Fields(text)) < 5 {
		return "", ErrNoText
	}
	return text, nil
}

func pdfText(data []byte) (out string, err error) {
	// The PDF library can panic on malformed input; an uploaded file must
	// never be able to crash the API.
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("malformed pdf")
		}
	}()
	r, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", err
	}
	rd, err := r.GetPlainText()
	if err != nil {
		return "", err
	}
	b, err := io.ReadAll(io.LimitReader(rd, 2<<20))
	return string(b), err
}

func docxText(data []byte) (string, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", err
	}
	for _, f := range zr.File {
		if f.Name != "word/document.xml" {
			continue
		}
		// Guard against zip bombs: cap what we'll inflate.
		if f.UncompressedSize64 > 20<<20 {
			return "", errors.New("document too large")
		}
		rc, err := f.Open()
		if err != nil {
			return "", err
		}
		defer rc.Close()
		return docxXMLText(io.LimitReader(rc, 20<<20))
	}
	return "", errors.New("word/document.xml missing")
}

// docxXMLText walks WordprocessingML, joining text runs and breaking lines at
// paragraph ends, tabs and explicit breaks.
func docxXMLText(r io.Reader) (string, error) {
	dec := xml.NewDecoder(r)
	var sb strings.Builder
	inText := false
	for {
		tok, err := dec.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "t":
				inText = true
			case "tab":
				sb.WriteByte('\t')
			case "br":
				sb.WriteByte('\n')
			}
		case xml.EndElement:
			switch t.Name.Local {
			case "t":
				inText = false
			case "p":
				sb.WriteByte('\n')
			}
		case xml.CharData:
			if inText {
				sb.Write(t)
			}
		}
	}
	return sb.String(), nil
}
