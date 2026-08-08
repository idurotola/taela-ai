package models

import "time"

// Application is a user's tracked job application (Kanban tracker card).
type Application struct {
	Base
	UserID    string    `gorm:"index;not null" json:"userId"`
	JobID     *string   `gorm:"index" json:"jobId,omitempty"`
	Title     string    `gorm:"not null" json:"title"`
	Company   string    `gorm:"not null" json:"company"`
	Location  string    `json:"location"`
	Platform  string    `json:"platform"`
	Stage     string    `gorm:"not null;default:applied" json:"stage"` // applied, review, shortlisted, interviewing, offered, rejected
	NextStep  string    `json:"nextStep,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

var ApplicationStages = []string{"applied", "review", "shortlisted", "interviewing", "offered", "rejected"}

func IsValidStage(stage string) bool {
	for _, s := range ApplicationStages {
		if s == stage {
			return true
		}
	}
	return false
}
