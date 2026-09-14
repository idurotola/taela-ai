package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
)

type SettingsHandler struct {
	DB *gorm.DB
}

func (h *SettingsHandler) getOrCreate(userID string) (*models.UserSettings, error) {
	var s models.UserSettings
	err := h.DB.Where("user_id = ?", userID).First(&s).Error
	if err == nil {
		return &s, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	s = models.UserSettings{
		UserID: userID, JobMatchAlerts: true, ApplicationUpdates: true, WeeklyDigest: true,
	}
	if err := h.DB.Create(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (h *SettingsHandler) Get(c *gin.Context) {
	s, err := h.getOrCreate(auth.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load settings"})
		return
	}
	c.JSON(http.StatusOK, dto.FromUserSettings(*s))
}

type updateSettingsRequest struct {
	JobMatchAlerts     *bool `json:"jobMatchAlerts"`
	ApplicationUpdates *bool `json:"applicationUpdates"`
	WeeklyDigest       *bool `json:"weeklyDigest"`
	NetworkSuggestions *bool `json:"networkSuggestions"`
}

func (h *SettingsHandler) Update(c *gin.Context) {
	s, err := h.getOrCreate(auth.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load settings"})
		return
	}

	var req updateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.JobMatchAlerts != nil {
		s.JobMatchAlerts = *req.JobMatchAlerts
	}
	if req.ApplicationUpdates != nil {
		s.ApplicationUpdates = *req.ApplicationUpdates
	}
	if req.WeeklyDigest != nil {
		s.WeeklyDigest = *req.WeeklyDigest
	}
	if req.NetworkSuggestions != nil {
		s.NetworkSuggestions = *req.NetworkSuggestions
	}

	if err := h.DB.Save(s).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update settings"})
		return
	}
	c.JSON(http.StatusOK, dto.FromUserSettings(*s))
}
