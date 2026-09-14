package models

// UserSettings holds a user's notification preferences, kept separate from
// User so account credentials and preferences evolve independently.
type UserSettings struct {
	Base
	UserID             string `gorm:"uniqueIndex;not null" json:"userId"`
	JobMatchAlerts     bool   `gorm:"default:true" json:"jobMatchAlerts"`
	ApplicationUpdates bool   `gorm:"default:true" json:"applicationUpdates"`
	WeeklyDigest       bool   `gorm:"default:true" json:"weeklyDigest"`
	NetworkSuggestions bool   `gorm:"default:false" json:"networkSuggestions"`
}
