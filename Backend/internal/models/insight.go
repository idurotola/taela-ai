package models

// MarketInsight is a globally shared market/insight card shown in Analytics.
type MarketInsight struct {
	Base
	Title  string `gorm:"not null" json:"title"`
	Text   string `gorm:"type:text" json:"text"`
	Accent string `json:"accent"` // yellow, teal, blue, pink
	Sort   int    `json:"sort"`
}
