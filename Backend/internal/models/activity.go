package models

import "time"

// Activity is a lightweight audit trail of user actions, used to power the
// dashboard's "Recent Updates" feed.
type Activity struct {
	Base
	UserID    string    `gorm:"index;not null" json:"userId"`
	Type      string    `gorm:"not null" json:"type"` // application, interview, network, cv
	Title     string    `gorm:"not null" json:"title"`
	Sub       string    `json:"sub"`
	CreatedAt time.Time `json:"createdAt"`
}
