package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
	"taela-ai-backend/internal/storage"
)

// freezeCV records what the recruiter will see for an application: the
// structured CV as it is right now, plus a private copy of the uploaded file.
// Copying (rather than pointing at the user's master file) means a later
// edit, re-upload or deletion of the master CV can't change or break an
// application already sent. app.ID must already be set.
func freezeCV(ctx context.Context, db *gorm.DB, store storage.Store, userID string, app *models.Application) {
	var cv models.CV
	err := db.
		Preload("Experiences", func(d *gorm.DB) *gorm.DB { return d.Order("sort asc") }).
		Preload("Education", func(d *gorm.DB) *gorm.DB { return d.Order("sort asc") }).
		Where("user_id = ?", userID).First(&cv).Error
	if err != nil {
		return
	}
	cv.ATSChecks = nil // internal scoring isn't for the recruiter
	if b, err := json.Marshal(dto.FromCV(cv)); err == nil {
		app.CVSnapshot = string(b)
	}
	app.Phone = cv.Phone

	if cv.SourceFileKey == "" || store == nil {
		return
	}
	newKey := fmt.Sprintf("applications/%s/%s", app.ID, lastSegment(cv.SourceFileKey))
	rc, err := store.Get(ctx, cv.SourceFileKey)
	if err != nil {
		log.Printf("freezeCV: reading %s: %v", cv.SourceFileKey, err)
		return
	}
	defer rc.Close()
	if err := store.Put(ctx, newKey, rc, cv.SourceFileSize, contentTypeFor(cv.SourceFileName)); err != nil {
		log.Printf("freezeCV: copying to %s: %v", newKey, err)
		return
	}
	app.CVFileKey, app.CVFileName = newKey, cv.SourceFileName
}

func lastSegment(key string) string {
	if i := strings.LastIndexByte(key, '/'); i >= 0 {
		return key[i+1:]
	}
	return key
}

func contentTypeFor(name string) string {
	if strings.HasSuffix(strings.ToLower(name), ".pdf") {
		return "application/pdf"
	}
	return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}

// serveApplicationFile streams an application's frozen CV file.
func serveApplicationFile(c *gin.Context, store storage.Store, app models.Application) {
	if store == nil || app.CVFileKey == "" {
		c.JSON(404, gin.H{"error": "no CV file for this application"})
		return
	}
	streamFile(c, store, app.CVFileKey, app.CVFileName)
}
