package models

import (
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"
)

// SourceType says where a job came from, which decides how a candidate
// applies: "direct" jobs are posted on Taela by a recruiter and take
// applications here; "external" jobs come from a third-party feed and are
// applied for on the source site.
const (
	SourceTypeDirect   = "direct"
	SourceTypeExternal = "external"
)

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
	SourceType    string     `gorm:"index;default:external" json:"sourceType"`
	Slug          string     `gorm:"index" json:"slug"` // public URL segment: /jobs/{slug}
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

// BeforeCreate assigns the ID (via Base) and then the public slug, which
// embeds the ID so it's unique without a separate uniqueness check.
func (j *Job) BeforeCreate(tx *gorm.DB) error {
	if err := j.Base.BeforeCreate(tx); err != nil {
		return err
	}
	if j.Slug == "" {
		j.Slug = JobSlug(j.Title, j.Company, j.ID)
	}
	if j.SourceType == "" {
		j.SourceType = SourceTypeExternal
	}
	return nil
}

var nonSlugChars = regexp.MustCompile(`[^a-z0-9]+`)

// JobSlug builds a readable, stable URL segment such as
// "senior-engineer-acme-1a2b3c4d": title and company for people and search
// engines, plus the first 8 characters of the ID for uniqueness.
func JobSlug(title, company, id string) string {
	words := strings.Trim(nonSlugChars.ReplaceAllString(strings.ToLower(title+" "+company), "-"), "-")
	if len(words) > 60 {
		words = strings.Trim(words[:60], "-")
	}
	short := strings.ReplaceAll(id, "-", "")
	if len(short) > 8 {
		short = short[:8]
	}
	if words == "" {
		return short
	}
	return words + "-" + short
}
