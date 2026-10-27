package main

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/joho/godotenv"

	"taela-ai-backend/internal/ai"
	"taela-ai-backend/internal/config"
	"taela-ai-backend/internal/db"
	"taela-ai-backend/internal/email"
	"taela-ai-backend/internal/email/providers/mailtrap"
	"taela-ai-backend/internal/jobsync"
	"taela-ai-backend/internal/router"
	"taela-ai-backend/internal/storage"
)

// buildEmailService is the one place that knows which concrete email
// provider backs internal/email.Service. Adding a provider (Mailchimp,
// Mailjet, ...) means implementing email.Provider in its own package and
// adding a case here — see internal/email/README.md.
func buildEmailService(cfg config.Config) *email.Service {
	defaultFrom := email.Recipient{Email: cfg.EmailFromAddress, Name: cfg.EmailFromName}
	marketingFrom := email.Recipient{Email: cfg.MarketingFromAddress, Name: cfg.MarketingFromName}

	var provider email.Provider
	switch strings.ToLower(cfg.EmailProvider) {
	case "", "mailtrap":
		if cfg.MailtrapAPIToken == "" {
			log.Println("MAILTRAP_API_TOKEN not set — outgoing email will be logged, not sent")
			provider = email.LoggingProvider{}
			break
		}
		provider = mailtrap.Provider{
			APIToken:  cfg.MailtrapAPIToken,
			Sandbox:   cfg.MailtrapSandbox,
			SandboxID: cfg.MailtrapSandboxID,
		}
	default:
		log.Printf("unknown EMAIL_PROVIDER %q — falling back to logging provider", cfg.EmailProvider)
		provider = email.LoggingProvider{}
	}

	return email.NewService(provider, defaultFrom, marketingFrom)
}

// buildStorage picks where uploaded CVs live. Returning nil disables upload
// features (the endpoints answer 503) rather than risking files on a disk
// that a redeploy wipes.
func buildStorage(cfg config.Config) storage.Store {
	provider := cfg.StorageProvider
	if provider == "" && !cfg.Production {
		provider = "local"
	}
	switch provider {
	case "r2":
		r2, err := storage.NewR2(storage.R2Config{
			AccountID: cfg.R2AccountID, Endpoint: cfg.R2Endpoint, AccessKeyID: cfg.R2AccessKeyID,
			SecretAccessKey: cfg.R2SecretKey, Bucket: cfg.R2Bucket,
		})
		if err != nil {
			log.Fatalf("invalid R2 storage config: %v", err)
		}
		return r2
	case "local":
		if cfg.Production {
			log.Println("WARNING: STORAGE_PROVIDER=local in production — uploads are lost on every deploy; use r2")
		}
		return storage.Local{Dir: cfg.StorageLocalDir}
	case "":
		log.Println("file storage not configured (set STORAGE_PROVIDER=r2) — CV upload and guest applications are disabled")
		return nil
	default:
		log.Fatalf("unknown STORAGE_PROVIDER %q (use r2 or local)", cfg.StorageProvider)
		return nil
	}
}

// buildAI picks the model provider behind CV reading. With none configured,
// uploads still work and the user fills the CV in by hand.
func buildAI(cfg config.Config) ai.Provider {
	switch cfg.AIProvider {
	case "":
		log.Println("AI_PROVIDER not set — uploaded CVs are stored but not read automatically")
		return ai.Disabled{}
	case "anthropic":
		if cfg.AnthropicAPIKey == "" {
			log.Fatal("AI_PROVIDER=anthropic needs ANTHROPIC_API_KEY")
		}
		model := cfg.AIModel
		if model == "" {
			model = "claude-haiku-5-5"
		}
		return ai.Anthropic{APIKey: cfg.AnthropicAPIKey, Model: model, BaseURL: cfg.AIBaseURL}
	case "gemini":
		if cfg.GeminiAPIKey == "" || cfg.AIModel == "" {
			log.Fatal("AI_PROVIDER=gemini needs GEMINI_API_KEY and AI_MODEL")
		}
		return ai.Gemini{APIKey: cfg.GeminiAPIKey, Model: cfg.AIModel, BaseURL: cfg.AIBaseURL}
	case "bedrock":
		b, err := ai.NewBedrock(context.Background(), cfg.AWSRegion, cfg.AIModel)
		if err != nil {
			log.Fatalf("bedrock: %v", err)
		}
		return b
	default:
		log.Fatalf("unknown AI_PROVIDER %q (use anthropic, gemini or bedrock)", cfg.AIProvider)
		return nil
	}
}

func main() {
	_ = godotenv.Load() // no-op if .env doesn't exist (e.g. in production)

	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("invalid configuration: %v", err)
	}

	gormDB, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(gormDB); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	// Populate the job catalog immediately on boot, then keep it fresh on an
	// interval. A failed sync is logged, not fatal — the API should still
	// come up even if the upstream feed is briefly unreachable.
	if result, err := jobsync.Sync(gormDB); err != nil {
		log.Printf("initial job sync failed: %v", err)
	} else {
		log.Printf("initial job sync: fetched=%d created=%d updated=%d deactivated=%d pruned=%d",
			result.Fetched, result.Created, result.Updated, result.Deactivated, result.Pruned)
	}
	jobsync.StartTicker(gormDB, time.Duration(cfg.JobSyncIntervalMinutes)*time.Minute)

	emailSvc := buildEmailService(cfg)

	r := router.New(gormDB, cfg, emailSvc, buildStorage(cfg), buildAI(cfg))

	log.Printf("taela-ai backend listening on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
