package ai

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime/types"
)

// Bedrock uses the model-agnostic Converse API, so any Bedrock text model
// works by changing ModelID. Credentials come from the standard AWS chain
// (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION, or a role).
type Bedrock struct {
	client  *bedrockruntime.Client
	modelID string
}

func NewBedrock(ctx context.Context, region, modelID string) (*Bedrock, error) {
	if modelID == "" {
		return nil, errors.New("ai: bedrock needs AI_MODEL (a Bedrock model or inference-profile id)")
	}
	opts := []func(*awsconfig.LoadOptions) error{}
	if region != "" {
		opts = append(opts, awsconfig.WithRegion(region))
	}
	cfg, err := awsconfig.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		return nil, err
	}
	return &Bedrock{client: bedrockruntime.NewFromConfig(cfg), modelID: modelID}, nil
}

func (b *Bedrock) Complete(ctx context.Context, system, user string, maxTokens int) (string, error) {
	out, err := b.client.Converse(ctx, &bedrockruntime.ConverseInput{
		ModelId: aws.String(b.modelID),
		System:  []types.SystemContentBlock{&types.SystemContentBlockMemberText{Value: system}},
		Messages: []types.Message{{
			Role:    types.ConversationRoleUser,
			Content: []types.ContentBlock{&types.ContentBlockMemberText{Value: user}},
		}},
		InferenceConfig: &types.InferenceConfiguration{MaxTokens: aws.Int32(int32(maxTokens))},
	})
	if err != nil {
		return "", fmt.Errorf("bedrock: %w", err)
	}
	msg, ok := out.Output.(*types.ConverseOutputMemberMessage)
	if !ok {
		return "", errors.New("bedrock: unexpected output")
	}
	var sb strings.Builder
	for _, c := range msg.Value.Content {
		if t, ok := c.(*types.ContentBlockMemberText); ok {
			sb.WriteString(t.Value)
		}
	}
	if sb.Len() == 0 {
		return "", errors.New("bedrock: empty response")
	}
	return sb.String(), nil
}
