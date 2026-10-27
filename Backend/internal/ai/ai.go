// Package ai is a thin, provider-agnostic text-completion seam. Features
// (CV parsing today; scoring and tailoring later) call Provider.Complete and
// never know whether Anthropic, Gemini or AWS Bedrock answered, so the
// backing model is chosen by configuration alone.
package ai

import (
	"context"
	"errors"
)

// ErrNotConfigured is returned when no AI provider is set up, so callers can
// degrade gracefully (e.g. let the user fill in a CV by hand).
var ErrNotConfigured = errors.New("ai: no provider configured")

type Provider interface {
	// Complete sends one system prompt and one user message and returns the
	// model's text reply.
	Complete(ctx context.Context, system, user string, maxTokens int) (string, error)
}

// Disabled is the Provider used when none is configured.
type Disabled struct{}

func (Disabled) Complete(context.Context, string, string, int) (string, error) {
	return "", ErrNotConfigured
}
