package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/jobsync"
)

type AdminHandler struct {
	DB *gorm.DB
}

// SyncJobs forces an immediate job-feed sync, in addition to the background
// ticker (see jobsync.StartTicker), for on-demand refreshes.
func (h *AdminHandler) SyncJobs(c *gin.Context) {
	result, err := jobsync.Sync(h.DB)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
