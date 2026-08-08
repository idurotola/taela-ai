package models

import "time"

// Job is a globally shared listing in the job catalog (not owned by a user).
// Jobs are ingested from external feeds (see internal/jobsync) rather than
// entered by users, so most fields carry a Source/SourceGUID back-reference.
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

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
