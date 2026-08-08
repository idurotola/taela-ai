package main

import (
	"log"
	"time"

	"github.com/joho/godotenv"

	"taela-ai-backend/internal/config"
	"taela-ai-backend/internal/db"
	"taela-ai-backend/internal/jobsync"
	"taela-ai-backend/internal/router"
	"taela-ai-backend/internal/seed"
)

func main() {
	_ = godotenv.Load() // no-op if .env doesn't exist (e.g. in production)

	cfg := config.Load()

	gormDB, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(gormDB); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	if err := seed.Run(gormDB); err != nil {
		log.Fatalf("failed to seed database: %v", err)
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

	r := router.New(gormDB, cfg)

	log.Printf("taela-ai backend listening on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
