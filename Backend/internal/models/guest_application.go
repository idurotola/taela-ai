package models

import "time"

// GuestApplication is an application submitted from a public job page by
// someone who isn't signed in. It stays here, invisible to the recruiter,
// until the applicant proves they own the email address by clicking the
// emailed link; only then is it turned into a real Application on their
// (possibly newly created) account.
type GuestApplication struct {
	Base
	JobID       string `gorm:"index;not null"`
	Name        string `gorm:"not null"`
	Email       string `gorm:"index;not null"`
	Phone       string
	CoverLetter string `gorm:"type:text"`
	CVFileKey   string
	CVFileName  string
	TokenHash   string `gorm:"uniqueIndex;not null"`
	ExpiresAt   time.Time
	UsedAt      *time.Time
	CreatedAt   time.Time
}
