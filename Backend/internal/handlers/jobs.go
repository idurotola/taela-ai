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
	if err := openJobs(h.DB).Order("published_at desc").Find(&jobs).Error; err != nil {
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

	// External jobs are applied for on the source site, so all we can honestly
	// record is that the candidate has a CV ready ("prepared"); they confirm
	// the submission themselves from the tracker. Direct jobs are applied for
	// here and so start at "applied".
	stage := "applied"
	sourceURL := ""
	if job.SourceType == models.SourceTypeExternal {
		stage = models.StagePrepared
		sourceURL = job.SourceURL
	}
	app := models.Application{
		UserID:    userID,
		JobID:     &job.ID,
		Title:     job.Title,
		Company:   job.Company,
		Location:  job.Location,
		Platform:  job.Platform,
		SourceURL: sourceURL,
		Stage:     stage,
	}
	if err := h.DB.Create(&app).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to apply"})
		return
	}

	if stage == models.StagePrepared {
		logActivity(h.DB, userID, "application", "Prepared CV for "+job.Title, job.Company+" · apply on "+job.Platform)
	} else {
		logActivity(h.DB, userID, "application", "Applied to "+job.Title, job.Company+" · via "+job.Platform)
	}

	c.JSON(http.StatusCreated, dto.FromApplication(app))
}

// PublicGet serves the job page without authentication, looked up by the
// slug in the public URL. Closed postings are returned with open=false so
// the page can explain instead of showing a 404; only missing ones 404.
func (h *JobsHandler) PublicGet(c *gin.Context) {
	var job models.Job
	if err := h.DB.Where("slug = ?", c.Param("slug")).First(&job).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}
	c.JSON(http.StatusOK, dto.FromPublicJob(job))
}

// PublicIndex lists open recruiter-posted jobs' slugs for the sitemap.
// External feed jobs are left out: Taela doesn't own that content, so it
// isn't promoted to search engines.
func (h *JobsHandler) PublicIndex(c *gin.Context) {
	var jobs []models.Job
	if err := openJobs(h.DB).Where("source_type = ?", models.SourceTypeDirect).Select("slug", "updated_at").Order("updated_at desc").Limit(5000).Find(&jobs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load jobs"})
		return
	}
	refs := make([]dto.PublicJobRefDTO, 0, len(jobs))
	for _, j := range jobs {
		refs = append(refs, dto.PublicJobRefDTO{Slug: j.Slug, UpdatedAt: j.UpdatedAt.Format(time.RFC3339)})
	}
	c.JSON(http.StatusOK, refs)
}
