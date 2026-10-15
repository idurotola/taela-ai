package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/email"
	"taela-ai-backend/internal/jobsync"
)

type AdminHandler struct {
	DB    *gorm.DB
	Email *email.Service
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

type sendMarketingEmailRequest struct {
	To       []string `json:"to" binding:"required,min=1,dive,email"`
	Subject  string   `json:"subject" binding:"required"`
	Text     string   `json:"text"`
	HTML     string   `json:"html"`
	Category string   `json:"category"`
}

// SendMarketingEmail fires a one-off marketing/announcement send (product
// updates, digests, ...) to an explicit recipient list via
// internal/email.Service.SendMarketing — an operator-triggered equivalent
// of what a future "notify everyone about X" feature would call
// programmatically. Gated by the same admin token as the rest of /api/admin.
func (h *AdminHandler) SendMarketingEmail(c *gin.Context) {
	var req sendMarketingEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Text == "" && req.HTML == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "text or html is required"})
		return
	}

	recipients := make([]email.Recipient, 0, len(req.To))
	for _, addr := range req.To {
		recipients = append(recipients, email.Recipient{Email: addr})
	}

	if err := h.Email.SendMarketing(c.Request.Context(), recipients, req.Subject, req.Text, req.HTML, req.Category); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sent": len(recipients)})
}
