package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/email"
	"taela-ai-backend/internal/models"
	"taela-ai-backend/internal/storage"
)

type JobsHandler struct {
	DB          *gorm.DB
	Store       storage.Store
	Email       *email.Service
	FrontendURL string
}

type applyRequest struct {
	CoverLetter string `json:"coverLetter"`
	// UseTailored sends the CV (and cover letter) tailored for this job
	// instead of the master CV.
	UseTailored bool `json:"useTailored"`
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
	// An optional cover letter rides along as JSON; an empty body is fine.
	var req applyRequest
	_ = c.ShouldBindJSON(&req)
	if len(req.CoverLetter) > 5000 {
		req.CoverLetter = req.CoverLetter[:5000]
	}

	app := models.Application{
		Base:      models.Base{ID: uuid.NewString()},
		UserID:    userID,
		JobID:     &job.ID,
		Title:     job.Title,
		Company:   job.Company,
		Location:  job.Location,
		Platform:  job.Platform,
		SourceURL: sourceURL,
		Stage:     stage,
	}
	// Direct applications are delivered to a recruiter: freeze exactly what
	// they'll see. External ones never leave Taela, so there's nothing to send.
	if stage == "applied" {
		app.CoverLetter = strings.TrimSpace(req.CoverLetter)
		sent := false
		if req.UseTailored {
			var t models.TailoredCV
			if err := h.DB.Where("user_id = ? AND job_id = ?", userID, job.ID).First(&t).Error; err == nil {
				var phone string
				h.DB.Model(&models.CV{}).Where("user_id = ?", userID).Select("phone").Scan(&phone)
				if sent = freezeTailored(&app, t, phone); sent && app.CoverLetter == "" {
					app.CoverLetter = t.CoverLetter
				}
			}
		}
		if !sent {
			freezeCV(c.Request.Context(), h.DB, h.Store, userID, &app)
		}
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

	if stage == "applied" {
		h.notifyApplied(userID, job, app)
	}

	c.JSON(http.StatusCreated, dto.FromApplication(app))
}

// notifyApplied emails the candidate a receipt and, for a recruiter-posted
// job, tells the recruiter they have a new applicant.
func (h *JobsHandler) notifyApplied(userID string, job models.Job, app models.Application) {
	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return
	}
	trackLink := strings.TrimRight(h.FrontendURL, "/") + "/dashboard"
	notify("application receipt", func(ctx context.Context) error {
		return h.Email.SendApplicationReceived(ctx, email.Recipient{Email: user.Email, Name: user.Name}, job.Title, job.Company, trackLink)
	})
	sendNewApplicantEmail(h.DB, h.Email, h.FrontendURL, job, app.ID, user.Name)
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

// sendNewApplicantEmail tells the posting's recruiter about a new applicant.
func sendNewApplicantEmail(db *gorm.DB, mail *email.Service, frontendURL string, job models.Job, applicationID, applicantName string) {
	if job.RecruiterID == nil {
		return
	}
	var rec models.User
	if err := db.First(&rec, "id = ?", *job.RecruiterID).Error; err != nil {
		return
	}
	link := fmt.Sprintf("%s/recruiter/jobs/%s/applicants?open=%s", strings.TrimRight(frontendURL, "/"), job.ID, applicationID)
	notify("new applicant", func(ctx context.Context) error {
		return mail.SendNewApplicant(ctx, email.Recipient{Email: rec.Email, Name: rec.Name}, job.Title, applicantName, link)
	})
}
