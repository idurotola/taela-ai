package db

import (
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"taela-ai-backend/internal/models"
)

func Connect(dsn string) (*gorm.DB, error) {
	gormLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             200 * time.Millisecond,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true, // "not found" is expected control flow (existence checks), not a real error
		},
	)

	return gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
	})
}

// AutoMigrate creates/updates all tables for the current models.
func AutoMigrate(gormDB *gorm.DB) error {
	return gormDB.AutoMigrate(
		&models.User{},
		&models.Job{},
		&models.Application{},
		&models.Contact{},
		&models.Connection{},
		&models.CV{},
		&models.CVExperience{},
		&models.ATSCheck{},
		&models.MarketInsight{},
		&models.Activity{},
	)
}
