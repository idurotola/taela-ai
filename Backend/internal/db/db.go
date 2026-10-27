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
		// Surface unique-constraint violations as gorm.ErrDuplicatedKey so
		// handlers can answer a signup race with 409 instead of 500.
		TranslateError: true,
	})
}

// AutoMigrate creates/updates all tables for the current models.
func AutoMigrate(gormDB *gorm.DB) error {
	if err := gormDB.AutoMigrate(
		&models.User{},
		&models.Job{},
		&models.Application{},
		&models.CV{},
		&models.CVExperience{},
		&models.ATSCheck{},
		&models.Activity{},
		&models.UserSettings{},
		&models.PasswordResetToken{},
		&models.RecruiterProfile{},
		&models.SavedJob{},
		&models.CVEducation{},
		&models.GuestApplication{},
		&models.RecruiterVerification{},
		&models.JobMatch{},
		&models.TailoredCV{},
		&models.AIUsage{},
	); err != nil {
		return err
	}
	return backfill(gormDB)
}

// backfill brings rows written before a column existed up to date. Every
// step is idempotent, so it's safe to run on each boot.
func backfill(gormDB *gorm.DB) error {
	// Emails are now stored lowercase; fix older mixed-case rows, skipping any
	// that would collide with another account.
	if err := gormDB.Exec(`
		UPDATE users u SET email = lower(email)
		WHERE email <> lower(email)
		  AND NOT EXISTS (SELECT 1 FROM users o WHERE o.id <> u.id AND lower(o.email) = lower(u.email))`).Error; err != nil {
		return err
	}

	// Recruiter profiles that predate verification are grandfathered in as
	// verified; ones created since start as "unverified" explicitly.
	if err := gormDB.Exec(`UPDATE recruiter_profiles SET verification_status = 'verified', verified_at = now() WHERE verification_status IS NULL OR verification_status = ''`).Error; err != nil {
		return err
	}

	// Jobs created before source_type existed.
	if err := gormDB.Exec(`UPDATE jobs SET source_type = 'direct' WHERE (source_type IS NULL OR source_type = '') AND recruiter_id IS NOT NULL`).Error; err != nil {
		return err
	}
	if err := gormDB.Exec(`UPDATE jobs SET source_type = 'external' WHERE source_type IS NULL OR source_type = ''`).Error; err != nil {
		return err
	}

	// Jobs created before slugs existed.
	var jobs []models.Job
	if err := gormDB.Select("id", "title", "company").Where("slug IS NULL OR slug = ''").Find(&jobs).Error; err != nil {
		return err
	}
	for _, j := range jobs {
		if err := gormDB.Model(&models.Job{}).Where("id = ?", j.ID).UpdateColumn("slug", models.JobSlug(j.Title, j.Company, j.ID)).Error; err != nil {
			return err
		}
	}
	return nil
}
