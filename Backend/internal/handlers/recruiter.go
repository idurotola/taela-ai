package handlers

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/email"
	"taela-ai-backend/internal/jobsync"
	"taela-ai-backend/internal/models"
)

type RecruiterHandler struct {
	DB        *gorm.DB
	Email     *email.Service
	JWTSecret string
}

type recruiterSignupRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

// Signup is separate from the job-seeker one: no CV is created, and the
// recruiter is routed to complete a profile before posting jobs.
func (h *RecruiterHandler) Signup(c *gin.Context) {
	var req recruiterSignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.User
	if err := h.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "an account with this email already exists"})
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process password"})
		return
	}

	user := models.User{Name: req.Name, Email: req.Email, PasswordHash: hash, Role: models.RoleRecruiter}
	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create account"})
		return
	}

	if err := h.Email.SendWelcome(c.Request.Context(), email.Recipient{Email: user.Email, Name: user.Name}); err != nil {
		log.Printf("failed to send welcome email to %s: %v", user.Email, err)
	}

	token, err := auth.GenerateToken(user.ID, user.Role, h.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	c.JSON(http.StatusCreated, dto.AuthResponse{Token: token, User: dto.FromUser(user)})
}

type recruiterProfileRequest struct {
	Type           string `json:"type" binding:"required"`
	Specialty      string `json:"specialty"`
	Bio            string `json:"bio"`
	CompanyName    string `json:"companyName"`
	CompanyWebsite string `json:"companyWebsite"`
	Industry       string `json:"industry"`
}

// GetProfile returns 404 when the recruiter hasn't completed their profile
// yet, so the frontend knows to show the "complete profile" step.
func (h *RecruiterHandler) GetProfile(c *gin.Context) {
	var profile models.RecruiterProfile
	if err := h.DB.Where("user_id = ?", auth.UserID(c)).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "profile not completed"})
		return
	}
	c.JSON(http.StatusOK, dto.FromRecruiterProfile(profile))
}

// UpdateProfile creates or updates the profile; type is independent or employer.
func (h *RecruiterHandler) UpdateProfile(c *gin.Context) {
	var req recruiterProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !models.IsValidRecruiterKind(req.Type) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'independent' or 'employer'"})
		return
	}
	if req.Type == models.RecruiterEmployer && strings.TrimSpace(req.CompanyName) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "companyName is required for an employer profile"})
		return
	}
	if req.Type == models.RecruiterIndependent && strings.TrimSpace(req.Specialty) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "specialty is required for an independent recruiter profile"})
		return
	}

	userID := auth.UserID(c)
	var profile models.RecruiterProfile
	h.DB.Where("user_id = ?", userID).First(&profile)
	profile.UserID = userID
	profile.Type = req.Type
	profile.Specialty = req.Specialty
	profile.Bio = req.Bio
	profile.CompanyName = req.CompanyName
	profile.CompanyWebsite = req.CompanyWebsite
	profile.Industry = req.Industry

	if err := h.DB.Save(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save profile"})
		return
	}
	c.JSON(http.StatusOK, dto.FromRecruiterProfile(profile))
}

type recruiterJobRequest struct {
	Title       string  `json:"title" binding:"required"`
	Company     string  `json:"company" binding:"required"`
	Location    string  `json:"location"`
	Type        string  `json:"type"`
	Salary      string  `json:"salary"`
	Description string  `json:"description"`
	ExpiresAt   *string `json:"expiresAt"`
}

// parseExpiry requires a future RFC3339 timestamp — a job posting without
// an expiry, or one already in the past, isn't accepted.
func parseExpiry(raw *string) (time.Time, error) {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return time.Time{}, errExpiryRequired
	}
	t, err := time.Parse(time.RFC3339, *raw)
	if err != nil {
		return time.Time{}, errExpiryInvalid
	}
	if !t.After(time.Now()) {
		return time.Time{}, errExpiryPast
	}
	return t, nil
}

var (
	errExpiryRequired = errors.New("expiresAt is required")
	errExpiryInvalid  = errors.New("expiresAt must be an RFC3339 timestamp")
	errExpiryPast     = errors.New("expiresAt must be in the future")
)

// CreateJob posts a job; expiresAt is required (see openJobs in jobs.go).
func (h *RecruiterHandler) CreateJob(c *gin.Context) {
	userID := auth.UserID(c)

	var profile models.RecruiterProfile
	if err := h.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "complete your recruiter profile before posting a job"})
		return
	}

	var req recruiterJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	expiresAt, err := parseExpiry(req.ExpiresAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	initials, bg, fg := jobsync.DeriveLogo(req.Company)
	now := time.Now()
	job := models.Job{
		Title: req.Title, Company: req.Company, Location: req.Location,
		Type: req.Type, Salary: req.Salary, Platform: "Direct", Description: req.Description,
		MatchScore: 75, LogoInitials: initials, LogoColor: bg, LogoTextColor: fg,
		PublishedAt: now, Source: "Direct", Active: true,
		// SourceGUID is uniquely indexed; recruiter jobs have no feed GUID so need one anyway.
		SourceGUID:  "direct:" + uuid.NewString(),
		RecruiterID: &userID, ExpiresAt: &expiresAt,
	}
	if err := h.DB.Create(&job).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create job posting"})
		return
	}

	c.JSON(http.StatusCreated, dto.FromRecruiterJob(job, 0))
}

// applicantCounts batch-counts applications per job, avoiding one query per row.
func applicantCounts(db *gorm.DB, jobIDs []string) map[string]int {
	counts := map[string]int{}
	if len(jobIDs) == 0 {
		return counts
	}
	var rows []struct {
		JobID string
		Count int
	}
	db.Model(&models.Application{}).Select("job_id, count(*) as count").
		Where("job_id IN ?", jobIDs).Group("job_id").Scan(&rows)
	for _, r := range rows {
		counts[r.JobID] = r.Count
	}
	return counts
}

// ListJobs returns every posting the signed-in recruiter has created,
// newest first, each with its computed open/expired status.
func (h *RecruiterHandler) ListJobs(c *gin.Context) {
	var jobs []models.Job
	if err := h.DB.Where("recruiter_id = ?", auth.UserID(c)).Order("created_at desc").Find(&jobs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load postings"})
		return
	}
	ids := make([]string, 0, len(jobs))
	for _, j := range jobs {
		ids = append(ids, j.ID)
	}
	counts := applicantCounts(h.DB, ids)

	result := make([]dto.RecruiterJobDTO, 0, len(jobs))
	for _, j := range jobs {
		result = append(result, dto.FromRecruiterJob(j, counts[j.ID]))
	}
	c.JSON(http.StatusOK, result)
}

type recruiterJobUpdateRequest struct {
	Title       *string `json:"title"`
	Company     *string `json:"company"`
	Location    *string `json:"location"`
	Type        *string `json:"type"`
	Salary      *string `json:"salary"`
	Description *string `json:"description"`
	ExpiresAt   *string `json:"expiresAt"`
}

// UpdateJob edits a posting; a future ExpiresAt is also how it's reopened.
func (h *RecruiterHandler) UpdateJob(c *gin.Context) {
	userID := auth.UserID(c)
	jobID := c.Param("id")

	var job models.Job
	if err := h.DB.Where("id = ? AND recruiter_id = ?", jobID, userID).First(&job).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "posting not found"})
		return
	}

	var req recruiterJobUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Title != nil {
		job.Title = *req.Title
	}
	if req.Company != nil {
		job.Company = *req.Company
	}
	if req.Location != nil {
		job.Location = *req.Location
	}
	if req.Type != nil {
		job.Type = *req.Type
	}
	if req.Salary != nil {
		job.Salary = *req.Salary
	}
	if req.Description != nil {
		job.Description = *req.Description
	}
	if req.ExpiresAt != nil {
		expiresAt, err := parseExpiry(req.ExpiresAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		job.ExpiresAt = &expiresAt
	}

	if err := h.DB.Save(&job).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update posting"})
		return
	}
	counts := applicantCounts(h.DB, []string{job.ID})
	c.JSON(http.StatusOK, dto.FromRecruiterJob(job, counts[job.ID]))
}

// ListApplicants returns everyone who applied to one of the recruiter's
// own postings, newest first.
func (h *RecruiterHandler) ListApplicants(c *gin.Context) {
	userID := auth.UserID(c)
	jobID := c.Param("id")

	var job models.Job
	if err := h.DB.Where("id = ? AND recruiter_id = ?", jobID, userID).First(&job).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "posting not found"})
		return
	}

	var apps []models.Application
	h.DB.Where("job_id = ?", jobID).Order("created_at desc").Find(&apps)

	userIDs := make([]string, 0, len(apps))
	for _, a := range apps {
		userIDs = append(userIDs, a.UserID)
	}
	var users []models.User
	if len(userIDs) > 0 {
		h.DB.Where("id IN ?", userIDs).Find(&users)
	}
	userByID := make(map[string]models.User, len(users))
	for _, u := range users {
		userByID[u.ID] = u
	}

	result := make([]dto.RecruiterApplicantDTO, 0, len(apps))
	for _, a := range apps {
		u := userByID[a.UserID]
		result = append(result, dto.FromRecruiterApplicant(a, u.Name, u.Email))
	}
	c.JSON(http.StatusOK, result)
}

type applicantStageRequest struct {
	Stage string `json:"stage" binding:"required"`
}

// UpdateApplicantStage moves a candidate through the pipeline on one of the
// recruiter's own jobs; the move also shows up in the candidate's tracker.
func (h *RecruiterHandler) UpdateApplicantStage(c *gin.Context) {
	userID := auth.UserID(c)

	var app models.Application
	if err := h.DB.Where("id = ?", c.Param("id")).First(&app).Error; err != nil || app.JobID == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "application not found"})
		return
	}
	var job models.Job
	if err := h.DB.Where("id = ? AND recruiter_id = ?", *app.JobID, userID).First(&job).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "application not found"})
		return
	}

	var req applicantStageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !models.IsValidStage(req.Stage) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid stage"})
		return
	}

	app.Stage = req.Stage
	if err := h.DB.Save(&app).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update application"})
		return
	}
	logActivity(h.DB, app.UserID, "application", app.Title+" moved to "+req.Stage, app.Company)

	var user models.User
	h.DB.First(&user, "id = ?", app.UserID)
	c.JSON(http.StatusOK, dto.FromRecruiterApplicant(app, user.Name, user.Email))
}
