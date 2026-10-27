package models

import "time"

// Application is a user's tracked job application (Kanban tracker card).
type Application struct {
	Base
	UserID    string  `gorm:"index;not null" json:"userId"`
	JobID     *string `gorm:"index" json:"jobId,omitempty"`
	Title     string  `gorm:"not null" json:"title"`
	Company   string  `gorm:"not null" json:"company"`
	Location  string  `json:"location"`
	Platform  string  `json:"platform"`
	SourceURL string  `json:"sourceUrl,omitempty"` // external jobs: where to submit

	// What was sent to the recruiter, frozen at apply time so later edits to
	// the candidate's master CV don't change an application already in
	// flight. CVSnapshot is the structured CV as JSON; CVFileKey is a copy
	// of the uploaded file (or the guest's upload).
	CoverLetter string `gorm:"type:text" json:"-"`
	CVSnapshot  string `gorm:"type:text" json:"-"`
	CVFileKey   string `json:"-"`
	CVFileName  string `json:"-"`
	Phone       string `json:"-"`

	// Recruiter-private; never serialized to the candidate.
	RecruiterNotes  string `gorm:"type:text" json:"-"`
	RecruiterRating int    `json:"-"` // 0 = unrated, 1-5

	Stage     string    `gorm:"not null;default:applied" json:"stage"` // prepared, applied, review, shortlisted, interviewing, offered, rejected
	NextStep  string    `json:"nextStep,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// StagePrepared marks an external job the candidate has gotten a CV ready
// for but hasn't confirmed submitting on the source site yet — it is not an
// application the employer has received, so it's excluded from "sent" stats.
const StagePrepared = "prepared"

var ApplicationStages = []string{StagePrepared, "applied", "review", "shortlisted", "interviewing", "offered", "rejected"}

// IsValidRecruiterStage is the subset a recruiter can move a candidate to;
// "prepared" only exists on the candidate's side.
func IsValidRecruiterStage(stage string) bool {
	return stage != StagePrepared && IsValidStage(stage)
}

func IsValidStage(stage string) bool {
	for _, s := range ApplicationStages {
		if s == stage {
			return true
		}
	}
	return false
}
