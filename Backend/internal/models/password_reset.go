package models

import "time"

// PasswordResetToken is a one-time-use token issued when a user requests a
// password reset by email. Only its SHA-256 hash is stored — like a
// password, the raw token is never persisted — so a database leak alone
// can't be used to take over accounts. A row is consumed (UsedAt set) the
// moment it's redeemed, and every outstanding row for a user is invalidated
// as soon as one of them is used or a new one is requested.
type PasswordResetToken struct {
	Base
	UserID    string     `gorm:"not null;index" json:"-"`
	TokenHash string     `gorm:"not null;uniqueIndex" json:"-"`
	ExpiresAt time.Time  `json:"-"`
	UsedAt    *time.Time `json:"-"`
	CreatedAt time.Time  `json:"-"`
}
