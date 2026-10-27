package handlers

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/cvparse"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/email"
	"taela-ai-backend/internal/models"
	"taela-ai-backend/internal/storage"
)

// GuestHandler lets someone apply from a public job page without an
// account. The application is held back until they prove they own the email
// address; only then does it reach the recruiter.
type GuestHandler struct {
	DB          *gorm.DB
	Store       storage.Store
	Email       *email.Service
	JWTSecret   string
	FrontendURL string
}

const guestTokenTTL = 48 * time.Hour

const genericGuestReply = "Check your email — we've sent a link to confirm your application. It isn't delivered to the employer until you click it."

func randomToken() (raw, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	raw = hex.EncodeToString(b)
	return raw, hashResetToken(raw), nil
}

// Apply accepts multipart form fields: name, email, phone, coverLetter, file
// (the CV), and a hidden "website" honeypot that real browsers leave empty.
// The response is deliberately the same whether or not the address already
// has an account, so it can't be used to discover who is registered.
func (h *GuestHandler) Apply(c *gin.Context) {
	if h.Store == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "applications with a CV upload aren't available right now"})
		return
	}

	var job models.Job
	if err := h.DB.Where("slug = ?", c.Param("slug")).First(&job).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}
	if job.SourceType != models.SourceTypeDirect {
		c.JSON(http.StatusBadRequest, gin.H{"error": "this job is applied for on the original site"})
		return
	}
	if !job.IsOpenForApplications() {
		c.JSON(http.StatusGone, gin.H{"error": "this job is no longer accepting applications"})
		return
	}

	data, fileName, kind, status, err := readUpload(c, "file")
	if err != nil {
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	if c.PostForm("website") != "" { // honeypot: pretend it worked
		c.JSON(http.StatusAccepted, gin.H{"message": genericGuestReply})
		return
	}

	name := strings.TrimSpace(c.PostForm("name"))
	emailAddr := normalizeEmail(c.PostForm("email"))
	if name == "" || len(name) > 120 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "please enter your name"})
		return
	}
	if _, err := mail.ParseAddress(emailAddr); err != nil || len(emailAddr) > 200 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "please enter a valid email address"})
		return
	}
	phone := clipStr(c.PostForm("phone"), 40)
	cover := clipStr(strings.TrimSpace(c.PostForm("coverLetter")), 5000)

	// A recruiter account can't be used to apply; stay quiet about why.
	var existing models.User
	if err := h.DB.Where("lower(email) = ?", emailAddr).First(&existing).Error; err == nil && existing.Role == models.RoleRecruiter {
		c.JSON(http.StatusAccepted, gin.H{"message": genericGuestReply})
		return
	}

	id := uuid.NewString()
	key := fmt.Sprintf("guest/%s/cv.%s", id, kind)
	if err := h.Store.Put(c.Request.Context(), key, bytes.NewReader(data), int64(len(data)), cvparse.ContentType(kind)); err != nil {
		log.Printf("guest apply: store put: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "could not store your CV, please try again"})
		return
	}

	token, hash, err := randomToken()
	if err != nil {
		_ = h.Store.Delete(c.Request.Context(), key)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "something went wrong"})
		return
	}

	// A newer submission for the same job+email replaces any still-pending one.
	var stale []models.GuestApplication
	h.DB.Where("job_id = ? AND email = ? AND used_at IS NULL", job.ID, emailAddr).Find(&stale)
	for _, s := range stale {
		_ = h.Store.Delete(c.Request.Context(), s.CVFileKey)
		h.DB.Delete(&s)
	}

	ga := models.GuestApplication{
		Base: models.Base{ID: id}, JobID: job.ID, Name: name, Email: emailAddr, Phone: phone,
		CoverLetter: cover, CVFileKey: key, CVFileName: fileName,
		TokenHash: hash, ExpiresAt: time.Now().Add(guestTokenTTL),
	}
	if err := h.DB.Create(&ga).Error; err != nil {
		_ = h.Store.Delete(c.Request.Context(), key)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save your application"})
		return
	}

	link := fmt.Sprintf("%s/applications/confirm?token=%s", strings.TrimRight(h.FrontendURL, "/"), token)
	notify("guest verification", func(ctx context.Context) error {
		return h.Email.SendGuestApplicationVerification(ctx, email.Recipient{Email: emailAddr, Name: name}, job.Title, job.Company, link)
	})

	c.JSON(http.StatusAccepted, gin.H{"message": genericGuestReply})
}

type confirmRequest struct {
	Token string `json:"token" binding:"required"`
}

type confirmResponse struct {
	dto.AuthResponse
	JobSlug     string `json:"jobSlug"`
	JobTitle    string `json:"jobTitle"`
	Company     string `json:"company"`
	NewAccount  bool   `json:"newAccount"`
	AlreadySent bool   `json:"alreadySent"`
}

// Confirm turns a verified guest application into a real one and signs the
// applicant in, so they land in their tracker. Possession of the emailed
// link proves ownership of the address (the same trust as a password-reset
// link), and it works once.
func (h *GuestHandler) Confirm(c *gin.Context) {
	var req confirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing token"})
		return
	}

	var ga models.GuestApplication
	if err := h.DB.Where("token_hash = ? AND used_at IS NULL AND expires_at > ?", hashResetToken(req.Token), time.Now()).First(&ga).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "this link is invalid or has expired — please apply again"})
		return
	}
	var job models.Job
	if err := h.DB.First(&job, "id = ?", ga.JobID).Error; err != nil || !job.IsOpenForApplications() {
		c.JSON(http.StatusGone, gin.H{"error": "this job is no longer accepting applications"})
		return
	}

	var user models.User
	newAccount := false
	err := h.DB.Where("lower(email) = ?", ga.Email).First(&user).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		// No account yet: create one with an unguessable password. They can
		// set a real one any time via "forgot password".
		pw, _, rerr := randomToken()
		if rerr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "something went wrong"})
			return
		}
		hash, herr := auth.HashPassword(pw)
		if herr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "something went wrong"})
			return
		}
		user = models.User{Name: ga.Name, Email: ga.Email, PasswordHash: hash, Role: models.RoleJobSeeker}
		if err := h.DB.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create your account"})
			return
		}
		h.DB.Create(&models.CV{UserID: user.ID, FullName: ga.Name, Email: ga.Email, Phone: ga.Phone, AutoTailor: true})
		newAccount = true
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "something went wrong"})
		return
	case user.Role == models.RoleRecruiter:
		c.JSON(http.StatusBadRequest, gin.H{"error": "this email belongs to a recruiter account"})
		return
	}

	resp := confirmResponse{JobSlug: job.Slug, JobTitle: job.Title, Company: job.Company, NewAccount: newAccount}

	var dup models.Application
	if err := h.DB.Where("user_id = ? AND job_id = ?", user.ID, job.ID).First(&dup).Error; err == nil {
		resp.AlreadySent = true // applied before (e.g. signed in) — don't deliver twice
	} else {
		appID := uuid.NewString()
		finalKey := fmt.Sprintf("applications/%s/%s", appID, lastSegment(ga.CVFileKey))
		app := models.Application{
			Base: models.Base{ID: appID}, UserID: user.ID, JobID: &job.ID,
			Title: job.Title, Company: job.Company, Location: job.Location, Platform: job.Platform,
			Stage: "applied", CoverLetter: ga.CoverLetter, Phone: ga.Phone,
			CVFileKey: finalKey, CVFileName: ga.CVFileName,
		}
		snap, _ := json.Marshal(dto.CVDTO{FullName: ga.Name, Email: ga.Email, Phone: ga.Phone, Skills: []string{}, Experiences: []dto.CVExperienceDTO{}, Education: []dto.CVEducationDTO{}, ATSChecks: []dto.ATSCheckDTO{}})
		app.CVSnapshot = string(snap)

		if err := moveFile(c, h.Store, ga.CVFileKey, finalKey, ga.CVFileName); err != nil {
			log.Printf("guest confirm: moving file: %v", err)
			c.JSON(http.StatusBadGateway, gin.H{"error": "could not finish your application, please try again"})
			return
		}
		if err := h.DB.Create(&app).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not finish your application"})
			return
		}
		logActivity(h.DB, user.ID, "application", "Applied to "+job.Title, job.Company+" · via "+job.Platform)

		trackLink := strings.TrimRight(h.FrontendURL, "/") + "/dashboard"
		notify("guest receipt", func(ctx context.Context) error {
			return h.Email.SendApplicationReceived(ctx, email.Recipient{Email: user.Email, Name: user.Name}, job.Title, job.Company, trackLink)
		})
		sendNewApplicantEmail(h.DB, h.Email, h.FrontendURL, job, app.ID, user.Name)
	}

	now := time.Now()
	h.DB.Model(&ga).Update("used_at", &now)

	token, err := auth.GenerateToken(user.ID, user.Role, h.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to sign you in"})
		return
	}
	resp.AuthResponse = dto.AuthResponse{Token: token, User: dto.FromUser(user)}
	c.JSON(http.StatusOK, resp)
}

// moveFile copies a stored object to a new key and removes the original.
func moveFile(c *gin.Context, store storage.Store, from, to, name string) error {
	rc, err := store.Get(c.Request.Context(), from)
	if err != nil {
		return err
	}
	defer rc.Close()
	data, err := readAllLimited(rc, cvparse.MaxFileBytes)
	if err != nil {
		return err
	}
	if err := store.Put(c.Request.Context(), to, bytes.NewReader(data), int64(len(data)), contentTypeFor(name)); err != nil {
		return err
	}
	return store.Delete(c.Request.Context(), from)
}

func clipStr(s string, max int) string {
	if r := []rune(s); len(r) > max {
		return string(r[:max])
	}
	return s
}

func readAllLimited(r io.Reader, max int64) ([]byte, error) {
	b, err := io.ReadAll(io.LimitReader(r, max+1))
	if err != nil {
		return nil, err
	}
	if int64(len(b)) > max {
		return nil, errors.New("file too large")
	}
	return b, nil
}
