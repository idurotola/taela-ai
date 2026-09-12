package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
)

type ApplicationsHandler struct {
	DB *gorm.DB
}

func (h *ApplicationsHandler) List(c *gin.Context) {
	var apps []models.Application
	h.DB.Where("user_id = ?", auth.UserID(c)).Order("created_at desc").Find(&apps)

	result := make([]dto.ApplicationDTO, 0, len(apps))
	for _, a := range apps {
		result = append(result, dto.FromApplication(a))
	}
	c.JSON(http.StatusOK, result)
}

type createApplicationRequest struct {
	Title    string `json:"title" binding:"required"`
	Company  string `json:"company" binding:"required"`
	Location string `json:"location"`
	Platform string `json:"platform"`
}

func (h *ApplicationsHandler) Create(c *gin.Context) {
	userID := auth.UserID(c)

	var req createApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	app := models.Application{
		UserID: userID, Title: req.Title, Company: req.Company,
		Location: req.Location, Platform: req.Platform, Stage: "applied",
	}
	if err := h.DB.Create(&app).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create application"})
		return
	}

	logActivity(h.DB, userID, "application", "Applied to "+req.Title, req.Company)

	c.JSON(http.StatusCreated, dto.FromApplication(app))
}

type updateApplicationRequest struct {
	Stage    *string `json:"stage"`
	NextStep *string `json:"nextStep"`
}

func (h *ApplicationsHandler) Update(c *gin.Context) {
	userID := auth.UserID(c)
	id := c.Param("id")

	var app models.Application
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&app).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "application not found"})
		return
	}

	var req updateApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Stage != nil {
		if !models.IsValidStage(*req.Stage) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid stage"})
			return
		}
		app.Stage = *req.Stage
		logActivity(h.DB, userID, "application", app.Title+" moved to "+*req.Stage, app.Company)
	}
	if req.NextStep != nil {
		app.NextStep = *req.NextStep
	}

	if err := h.DB.Save(&app).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update application"})
		return
	}

	c.JSON(http.StatusOK, dto.FromApplication(app))
}

func (h *ApplicationsHandler) Delete(c *gin.Context) {
	res := h.DB.Where("id = ? AND user_id = ?", c.Param("id"), auth.UserID(c)).Delete(&models.Application{})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete application"})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "application not found"})
		return
	}
	c.Status(http.StatusNoContent)
}
