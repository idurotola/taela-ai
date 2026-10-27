package models

import "time"

// RecruiterKind is the one type a recruiter profile commits to — it
// determines which of the field groups below is meaningful.
const (
	RecruiterIndependent = "independent"
	RecruiterEmployer    = "employer"
)

// RecruiterProfile is the profile a recruiter account completes after
// signup, before it can post jobs. There is at most one per User.
type RecruiterProfile struct {
	Base
	UserID string `gorm:"uniqueIndex;not null" json:"userId"`
	Type   string `gorm:"not null" json:"type"` // independent, employer

	// Independent recruiter fields.
	Specialty string `json:"specialty,omitempty"`
	Bio       string `gorm:"type:text" json:"bio,omitempty"`

	// Employer / HR team fields.
	CompanyName    string `json:"companyName,omitempty"`
	CompanyWebsite string `json:"companyWebsite,omitempty"`
	Industry       string `json:"industry,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func IsValidRecruiterKind(kind string) bool {
	return kind == RecruiterIndependent || kind == RecruiterEmployer
}
