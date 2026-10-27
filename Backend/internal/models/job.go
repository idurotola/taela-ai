package models

import "time"

// Job is a globally shared listing. Most are ingested from external feeds
// (internal/jobsync); recruiter-posted ones set RecruiterID and ExpiresAt instead.
type Job struct {
	Base
	Title         string    `gorm:"not null" json:"title"`
	Company       string    `gorm:"not null" json:"company"`
	Location      string    `json:"location"`
	Type          string    `json:"type"` // Full-time, Contract, Remote, Hybrid
	Salary        string    `json:"salary"`
	Platform      string    `json:"platform"` // LinkedIn, Jobberman, Indeed, Glassdoor, Direct, MyJobMag
	Industry      string    `json:"industry"`
	Description   string    `gorm:"type:text" json:"description"`
	MatchScore    int       `json:"matchScore"`
	LogoInitials  string    `json:"logoInitials"`
	LogoColor     string    `json:"logoColor"`
	LogoTextColor string    `json:"logoTextColor"`
	PublishedAt   time.Time `json:"publishedAt"` // when the source originally posted it

	// Source tracking, so a periodic sync can upsert without duplicating rows
	// and can tell which of its own jobs disappeared from the feed.
	Source        string     `gorm:"index" json:"source"`
	SourceGUID    string     `gorm:"uniqueIndex" json:"-"`
	SourceURL     string     `json:"sourceUrl"`
	Active        bool       `gorm:"default:true;index" json:"-"`
	LastSeenAt    time.Time  `json:"-"`
	InactiveSince *time.Time `json:"-"`

	// Recruiter-posted jobs only; nil for feed-ingested jobs.
	RecruiterID *string    `gorm:"index" json:"-"`
	ExpiresAt   *time.Time `json:"-"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// IsOpenForApplications: active, and not past its expiry if one is set.
func (j Job) IsOpenForApplications() bool {
	if !j.Active {
		return false
	}
	return j.ExpiresAt == nil || j.ExpiresAt.After(time.Now())
}
