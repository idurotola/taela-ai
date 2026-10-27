package models

import "time"

// JobMatch caches a CV-vs-job score. It is valid only while CVHash still
// equals the hash of the user's current CV content, so an unchanged CV is
// never re-scored (and never re-billed).
type JobMatch struct {
	Base
	UserID    string `gorm:"uniqueIndex:idx_match_user_job;not null"`
	JobID     string `gorm:"uniqueIndex:idx_match_user_job;not null"`
	CVHash    string `gorm:"not null"`
	Result    string `gorm:"type:text"` // tailor.Match as JSON
	CreatedAt time.Time
}

// TailoredCV is a CV rewritten for one job, kept so the candidate can
// download it again and apply with it.
type TailoredCV struct {
	Base
	UserID      string `gorm:"uniqueIndex:idx_tailored_user_job;not null"`
	JobID       string `gorm:"uniqueIndex:idx_tailored_user_job;not null"`
	CVHash      string `gorm:"not null"`  // hash of the master CV it was made from
	Content     string `gorm:"type:text"` // cvparse.Parsed as JSON
	CoverLetter string `gorm:"type:text"`
	Changes     string `gorm:"type:text"` // JSON list
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// AIUsage counts a user's billable AI calls per UTC day.
type AIUsage struct {
	Base
	UserID string `gorm:"uniqueIndex:idx_ai_usage_user_day;not null"`
	Day    string `gorm:"uniqueIndex:idx_ai_usage_user_day;not null"` // YYYY-MM-DD
	Count  int
}
