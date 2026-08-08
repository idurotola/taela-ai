package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
)

type JobsHandler struct {
	DB *gorm.DB
}

func (h *JobsHandler) List(c *gin.Context) {
	var jobs []models.Job
	if err := h.DB.Where("active = ?", true).Order("match_score desc").Find(&jobs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load jobs"})
		return
	}

	applied := appliedJobIDSet(h.DB, auth.UserID(c))

	result := make([]dto.JobDTO, 0, len(jobs))
	for _, j := range jobs {
		result = append(result, dto.FromJob(j, applied[j.ID]))
	}
	c.JSON(http.StatusOK, result)
}

func (h *JobsHandler) Apply(c *gin.Context) {
	userID := auth.UserID(c)
	jobID := c.Param("id")

	var job models.Job
	if err := h.DB.Where("active = ?", true).First(&job, "id = ?", jobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found or no longer active"})
		return
	}

	var existing models.Application
	if err := h.DB.Where("user_id = ? AND job_id = ?", userID, jobID).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, dto.FromApplication(existing))
		return
	}

	app := models.Application{
		UserID:   userID,
		JobID:    &job.ID,
		Title:    job.Title,
		Company:  job.Company,
		Location: job.Location,
		Platform: job.Platform,
		Stage:    "applied",
	}
	if err := h.DB.Create(&app).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to apply"})
		return
	}

	logActivity(h.DB, userID, "application", "Applied to "+job.Title, job.Company+" · via "+job.Platform)

	c.JSON(http.StatusCreated, dto.FromApplication(app))
}
