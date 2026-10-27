package models

import "time"

// SavedJob is a job seeker's bookmark, persisted so it survives a refresh.
type SavedJob struct {
	Base
	UserID    string    `gorm:"uniqueIndex:idx_saved_job_user_job;not null" json:"userId"`
	JobID     string    `gorm:"uniqueIndex:idx_saved_job_user_job;not null" json:"jobId"`
	CreatedAt time.Time `json:"createdAt"`
}
