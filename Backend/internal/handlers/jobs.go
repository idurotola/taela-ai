package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
)

type JobsHandler struct {
	DB *gorm.DB
}

// openJobs scopes a query to active jobs that haven't passed a recruiter-set
// expiry — feed-ingested jobs (ExpiresAt nil) are unaffected.
func openJobs(db *gorm.DB) *gorm.DB {
	return db.Where("active = ? AND (expires_at IS NULL OR expires_at > ?)", true, time.Now())
}

func (h *JobsHandler) List(c *gin.Context) {
	var jobs []models.Job
	if err := openJobs(h.DB).Order("match_score desc").Find(&jobs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load jobs"})
		return
	}

	userID := auth.UserID(c)
	applied := appliedJobIDSet(h.DB, userID)
	saved := savedJobIDSet(h.DB, userID)

	result := make([]dto.JobDTO, 0, len(jobs))
	for _, j := range jobs {
		result = append(result, dto.FromJob(j, applied[j.ID], saved[j.ID]))
	}
	c.JSON(http.StatusOK, result)
}

// Save bookmarks a job for the signed-in user; idempotent.
func (h *JobsHandler) Save(c *gin.Context) {
	userID := auth.UserID(c)
	jobID := c.Param("id")
	saved := models.SavedJob{UserID: userID, JobID: jobID}
	if err := h.DB.Where("user_id = ? AND job_id = ?", userID, jobID).FirstOrCreate(&saved).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save job"})
		return
	}
	c.Status(http.StatusNoContent)
}

// Unsave removes a bookmark; idempotent.
func (h *JobsHandler) Unsave(c *gin.Context) {
	if err := h.DB.Where("user_id = ? AND job_id = ?", auth.UserID(c), c.Param("id")).Delete(&models.SavedJob{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unsave job"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *JobsHandler) Apply(c *gin.Context) {
	userID := auth.UserID(c)
	jobID := c.Param("id")

	var job models.Job
	if err := openJobs(h.DB).First(&job, "id = ?", jobID).Error; err != nil {
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
