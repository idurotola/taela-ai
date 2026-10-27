package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

const (
	devJWTSecret   = "dev-only-insecure-secret-change-me"
	devAdminToken  = "dev-only-admin-token-change-me"
	minSecretBytes = 32
)

type Config struct {
	// Production is true when APP_ENV=production or the process runs on
	// Railway (RAILWAY_ENVIRONMENT is set). In production, Validate refuses
	// the built-in dev secrets.
	Production bool

	Port                   string
	DatabaseURL            string
	JWTSecret              string
	AllowedOrigins         []string
	TrustedProxies         []string // CIDRs/IPs whose X-Forwarded-For is believed; see ratelimit
	AdminToken             string
	JobSyncIntervalMinutes int
	FrontendURL            string

	// Email — see internal/email. EmailProvider picks which backend
	// internal/email/providers/* implements; everything else is either
	// provider-agnostic (the From addresses) or specific to the current
	// provider (the Mailtrap* fields), named so it's obvious which is
	// which when a second provider's config gets added alongside them.
	EmailProvider        string
	EmailFromAddress     string
	EmailFromName        string
	MarketingFromAddress string
	MarketingFromName    string

	MailtrapAPIToken  string
	MailtrapSandbox   bool
	MailtrapSandboxID int64
}

func Load() Config {
	cfg := Config{
		Production:             os.Getenv("APP_ENV") == "production" || os.Getenv("RAILWAY_ENVIRONMENT") != "",
		Port:                   getEnv("PORT", "8080"),
		DatabaseURL:            getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/taela_ai?sslmode=disable"),
		JWTSecret:              getEnv("JWT_SECRET", devJWTSecret),
		AdminToken:             getEnv("ADMIN_TOKEN", devAdminToken),
		JobSyncIntervalMinutes: getEnvInt("JOB_SYNC_INTERVAL_MINUTES", 30),
		// Used to build the link inside password reset emails.
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),

		// EmailProvider left at its "mailtrap" default and MailtrapAPIToken
		// left blank means "no provider configured" — outgoing mail is
		// logged instead of sent, which is fine for local dev.
		EmailProvider: getEnv("EMAIL_PROVIDER", "mailtrap"),
		// Sender used for internal/transactional mail (password resets,
		// welcome emails, ...).
		EmailFromAddress: getEnv("EMAIL_FROM_ADDRESS", "no-reply@taelahr.com"),
		EmailFromName:    getEnv("EMAIL_FROM_NAME", "TaelaAI"),
		// Sender used for marketing mail. Left blank, internal/email
		// falls back to EmailFromAddress/EmailFromName.
		MarketingFromAddress: getEnv("MARKETING_FROM_ADDRESS", ""),
		MarketingFromName:    getEnv("MARKETING_FROM_NAME", ""),

		MailtrapAPIToken: getEnv("MAILTRAP_API_TOKEN", ""),
		// false (the default) sends for real, through either the
		// transactional or bulk host depending on email.Kind. true routes
		// every send — of either kind — into a Mailtrap Testing inbox
		// (MailtrapSandboxID) instead of delivering it.
		MailtrapSandbox:   getEnvBool("MAILTRAP_SANDBOX", false),
		MailtrapSandboxID: getEnvInt64("MAILTRAP_SANDBOX_ID", 0),
	}

	origins := getEnv("ALLOWED_ORIGINS", "http://localhost:3000")
	for _, o := range strings.Split(origins, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, o)
		}
	}

	for _, p := range strings.Split(os.Getenv("TRUSTED_PROXIES"), ",") {
		if p = strings.TrimSpace(p); p != "" {
			cfg.TrustedProxies = append(cfg.TrustedProxies, p)
		}
	}

	return cfg
}

// Validate rejects configuration that is unsafe to run in production: the
// built-in dev secrets (which would let anyone forge a token or call the
// admin endpoints) or secrets too short to be real.
func (c Config) Validate() error {
	if !c.Production {
		return nil
	}
	if c.JWTSecret == devJWTSecret || len(c.JWTSecret) < minSecretBytes {
		return fmt.Errorf("JWT_SECRET must be set to a random value of at least %d characters in production (e.g. `openssl rand -base64 48`)", minSecretBytes)
	}
	if c.AdminToken == devAdminToken || len(c.AdminToken) < minSecretBytes {
		return fmt.Errorf("ADMIN_TOKEN must be set to a random value of at least %d characters in production (e.g. `openssl rand -base64 32`)", minSecretBytes)
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvInt64(key string, fallback int64) int64 {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}
