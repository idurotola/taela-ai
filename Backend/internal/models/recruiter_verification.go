package models

import "time"

// RecruiterVerification is a one-time emailed proof that a recruiter
// controls a work address on their company's domain.
type RecruiterVerification struct {
	Base
	UserID    string `gorm:"index;not null"`
	WorkEmail string `gorm:"not null"`
	TokenHash string `gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time
	UsedAt    *time.Time
	CreatedAt time.Time
}
