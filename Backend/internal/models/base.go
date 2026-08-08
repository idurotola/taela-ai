package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Base is embedded by every model to give it a UUID primary key,
// generated automatically on insert if not already set.
type Base struct {
	ID string `gorm:"type:varchar(36);primaryKey" json:"id"`
}

func (b *Base) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}
