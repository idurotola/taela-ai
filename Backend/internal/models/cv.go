package models

import (
	"time"

	"github.com/lib/pq"
)

// CV holds a user's single CV/resume record.
type CV struct {
	Base
	UserID         string    `gorm:"uniqueIndex;not null" json:"userId"`
	FullName       string    `json:"fullName"`
	JobTitle       string    `json:"jobTitle"`
	Email          string    `json:"email"`
	Location       string    `json:"location"`
	Phone          string    `json:"phone"`
	LinkedIn       string    `json:"linkedin"`
	Summary        string    `gorm:"type:text" json:"summary"`
	TargetRole     string    `json:"targetRole"`
	TargetCompany  string    `json:"targetCompany"`
	AutoTailor     bool      `gorm:"default:true" json:"autoTailor"`
	JobDescription string    `gorm:"type:text" json:"jobDescription"`
	Score          int       `gorm:"default:0" json:"score"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`

	Experiences []CVExperience `gorm:"foreignKey:CVID;references:ID" json:"experiences"`
	ATSChecks   []ATSCheck     `gorm:"foreignKey:CVID;references:ID" json:"atsChecks"`
}

type CVExperience struct {
	Base
	CVID    string         `gorm:"index;not null" json:"cvId"`
	Role    string         `json:"role"`
	Company string         `json:"company"`
	Dates   string         `json:"dates"`
	Bullets pq.StringArray `gorm:"type:text[]" json:"bullets"`
	Sort    int            `json:"sort"`
}

type ATSCheck struct {
	Base
	CVID   string `gorm:"index;not null" json:"cvId"`
	Label  string `json:"label"`
	Status string `json:"status"` // ok, warn, bad
	Sort   int    `json:"sort"`
}
