package main

import (
	"log"
	"strings"
	"time"

	"github.com/joho/godotenv"

	"taela-ai-backend/internal/config"
	"taela-ai-backend/internal/db"
	"taela-ai-backend/internal/email"
	"taela-ai-backend/internal/email/providers/mailtrap"
	"taela-ai-backend/internal/jobsync"
	"taela-ai-backend/internal/router"
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

	r := router.New(gormDB, cfg, emailSvc)

	log.Printf("taela-ai backend listening on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
