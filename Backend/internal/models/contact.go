package models

import "time"

// Contact is a globally shared suggested network contact.
type Contact struct {
	Base
	Name              string `gorm:"not null" json:"name"`
	Initials          string `json:"initials"`
	Role              string `json:"role"`
	Company           string `json:"company"`
	MutualConnections int    `json:"mutualConnections"`
	ReferralFit       string `json:"referralFit"` // high, medium, low
	AvatarColor       string `json:"avatarColor"`
}

// Connection records that a user has requested an introduction to a Contact.
type Connection struct {
	Base
	UserID    string    `gorm:"index:idx_user_contact,unique;not null" json:"userId"`
	ContactID string    `gorm:"index:idx_user_contact,unique;not null" json:"contactId"`
	Status    string    `gorm:"not null;default:requested" json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}
