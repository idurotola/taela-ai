package models

import "time"

// Role is set at signup and carried in the JWT, so middleware doesn't
// need a DB round-trip to check it.
const (
	RoleJobSeeker = "jobseeker"
	RoleRecruiter = "recruiter"
)

type User struct {
	Base
	Name         string    `gorm:"not null" json:"name"`
	Email        string    `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	Role         string    `gorm:"not null;default:jobseeker" json:"role"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}
