package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                   string
	DatabaseURL            string
	JWTSecret              string
	AllowedOrigins         []string
	AdminToken             string
	JobSyncIntervalMinutes int
}

func Load() Config {
	cfg := Config{
		Port:                   getEnv("PORT", "8080"),
		DatabaseURL:            getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/taela_ai?sslmode=disable"),
		JWTSecret:              getEnv("JWT_SECRET", "dev-only-insecure-secret-change-me"),
		AdminToken:             getEnv("ADMIN_TOKEN", "dev-only-admin-token-change-me"),
		JobSyncIntervalMinutes: getEnvInt("JOB_SYNC_INTERVAL_MINUTES", 30),
	}

	origins := getEnv("ALLOWED_ORIGINS", "http://localhost:3000")
	for _, o := range strings.Split(origins, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, o)
		}
	}

	return cfg
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
