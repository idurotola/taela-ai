package models

import (
	"time"

	"github.com/lib/pq"
)

// Auto-apply modes. "review" only queues matching jobs for the user to
// approve; "auto" also submits them (up to a daily cap) without asking.
const (
	AutoApplyReview = "review"
	AutoApplyAuto   = "auto"
)

// AutoApplyRule is a user's opt-in standing instruction: which new Taela
// jobs to look for and what to do when one is a good enough fit. There is at
// most one per user and it's off until they turn it on.
type AutoApplyRule struct {
	Base
	UserID    string         `gorm:"uniqueIndex;not null" json:"-"`
	Enabled   bool           `json:"enabled"`
	Mode      string         `gorm:"not null;default:review" json:"mode"`
	Roles     pq.StringArray `gorm:"type:text[]" json:"roles"`     // job title must contain one; empty = any
	Locations pq.StringArray `gorm:"type:text[]" json:"locations"` // job location must contain one; empty = any
	MinScore  int            `gorm:"not null;default:70" json:"minScore"`
	MaxPerDay int            `gorm:"not null;default:3" json:"maxPerDay"`
	// EnabledAt keeps a freshly enabled rule from sweeping up old postings:
	// only jobs created after it (and within the last 7 days) are considered.
	EnabledAt *time.Time `json:"-"`
	CreatedAt time.Time  `json:"-"`
	UpdatedAt time.Time  `json:"-"`
}

// Item statuses.
const (
	ItemPending        = "pending"         // waiting for the user's decision
	ItemApplied        = "applied"         // the user approved it
	ItemAutoApplied    = "auto_applied"    // submitted automatically
	ItemSkipped        = "skipped"         // the user dismissed it
	ItemBelowThreshold = "below_threshold" // scored under the rule's minimum; never shown
)

// AutoApplyItem records that a job has been considered for a user, so the
// same job is never scored, queued or applied to twice.
type AutoApplyItem struct {
	Base
	UserID        string `gorm:"uniqueIndex:idx_auto_item_user_job;index;not null"`
	JobID         string `gorm:"uniqueIndex:idx_auto_item_user_job;not null"`
	Status        string `gorm:"index;not null"`
	Score         int
	Summary       string `gorm:"type:text"`
	ApplicationID *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}
