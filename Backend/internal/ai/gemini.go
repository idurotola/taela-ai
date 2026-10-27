package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

type Gemini struct {
	APIKey  string
	Model   string
	BaseURL string // override for tests
	Client  *http.Client
}

func (g Gemini) Complete(ctx context.Context, system, user string, maxTokens int) (string, error) {
	base := g.BaseURL
	if base == "" {
		base = "https://generativelanguage.googleapis.com"
	}
	body, _ := json.Marshal(map[string]any{
		"systemInstruction": map[string]any{"parts": []map[string]string{{"text": system}}},
		"contents":          []map[string]any{{"role": "user", "parts": []map[string]string{{"text": user}}}},
		"generationConfig":  map[string]any{"maxOutputTokens": maxTokens},
	})
	endpoint := fmt.Sprintf("%s/v1beta/models/%s:generateContent", base, url.PathEscape(g.Model))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("content-type", "application/json")
	req.Header.Set("x-goog-api-key", g.APIKey)

	raw, err := do(g.Client, req)
	if err != nil {
		return "", fmt.Errorf("gemini: %w", err)
	}
	var out struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", fmt.Errorf("gemini: bad response: %w", err)
	}
	var sb strings.Builder
	if len(out.Candidates) > 0 {
		for _, p := range out.Candidates[0].Content.Parts {
			sb.WriteString(p.Text)
		}
	}
	if sb.Len() == 0 {
		return "", fmt.Errorf("gemini: empty response")
	}
	return sb.String(), nil
}
