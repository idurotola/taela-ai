package handlers

import (
	"context"
	"fmt"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/email"
	"taela-ai-backend/internal/models"
)

// freeMailDomains can't prove a company relationship: anyone can own one.
var freeMailDomains = map[string]bool{
	"gmail.com": true, "googlemail.com": true, "yahoo.com": true, "ymail.com": true,
	"outlook.com": true, "hotmail.com": true, "live.com": true, "msn.com": true,
	"icloud.com": true, "me.com": true, "aol.com": true, "proton.me": true,
	"protonmail.com": true, "gmx.com": true, "mail.com": true, "zoho.com": true,
}

// domainOf returns the lowercase host of a website URL (or bare domain),
// without a leading "www.".
func domainOf(site string) string {
	site = strings.TrimSpace(strings.ToLower(site))
	if site == "" {
		return ""
	}
	if !strings.Contains(site, "://") {
		site = "https://" + site
	}
	u, err := url.Parse(site)
	if err != nil {
		return ""
	}
	return strings.TrimPrefix(u.Hostname(), "www.")
}

// emailMatchesCompany reports whether a work address belongs to the
// company's own domain (same domain, or one is a subdomain of the other).
func emailMatchesCompany(workEmail, website string) bool {
	at := strings.LastIndexByte(workEmail, '@')
	if at < 0 {
		return false
	}
	mailDomain := workEmail[at+1:]
	site := domainOf(website)
	if mailDomain == "" || site == "" || freeMailDomains[mailDomain] {
		return false
	}
	return mailDomain == site || strings.HasSuffix(mailDomain, "."+site) || strings.HasSuffix(site, "."+mailDomain)
}

type verificationRequest struct {
	WorkEmail string `json:"workEmail"`
}

// RequestVerification starts verification. Employers prove control of an
// address on their company's domain by clicking an emailed link. Independent
// recruiters have no company domain to prove, so their request waits for a
// Taela admin to review it.
func (h *RecruiterHandler) RequestVerification(c *gin.Context) {
	userID := auth.UserID(c)
	var profile models.RecruiterProfile
	if err := h.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "complete your recruiter profile first"})
		return
	}
	if profile.IsVerified() {
		c.JSON(http.StatusOK, gin.H{"status": models.VerificationVerified})
		return
	}

	if profile.Type == models.RecruiterIndependent {
		h.DB.Model(&profile).Update("verification_status", models.VerificationPending)
		c.JSON(http.StatusAccepted, gin.H{"status": models.VerificationPending, "message": "Thanks — our team will review your account and email you once it's approved."})
		return
	}

	var req verificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	addr := normalizeEmail(req.WorkEmail)
	if _, err := mail.ParseAddress(addr); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "enter a valid work email address"})
		return
	}
	if strings.TrimSpace(profile.CompanyWebsite) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "add your company website to your profile first, so we can match your work email to it"})
		return
	}
	if !emailMatchesCompany(addr, profile.CompanyWebsite) {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("use an email address on your company's own domain (%s) — personal addresses like Gmail can't be used", domainOf(profile.CompanyWebsite))})
		return
	}

	raw, hash, err := randomToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "something went wrong"})
		return
	}
	h.DB.Where("user_id = ? AND used_at IS NULL", userID).Delete(&models.RecruiterVerification{})
	if err := h.DB.Create(&models.RecruiterVerification{UserID: userID, WorkEmail: addr, TokenHash: hash, ExpiresAt: time.Now().Add(guestTokenTTL)}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "something went wrong"})
		return
	}
	h.DB.Model(&profile).Update("verification_status", models.VerificationPending)

	var user models.User
	h.DB.First(&user, "id = ?", userID)
	link := fmt.Sprintf("%s/recruiter/verify?token=%s", strings.TrimRight(h.FrontendURL, "/"), raw)
	company := profile.CompanyName
	notify("recruiter verification", func(ctx context.Context) error {
		return h.Email.SendRecruiterVerification(ctx, email.Recipient{Email: addr, Name: user.Name}, company, link)
	})
	c.JSON(http.StatusAccepted, gin.H{"status": models.VerificationPending, "message": "We've sent a verification link to " + addr + "."})
}

type verifyTokenRequest struct {
	Token string `json:"token" binding:"required"`
}

// ConfirmVerification is the emailed link's target.
func (h *RecruiterHandler) ConfirmVerification(c *gin.Context) {
	var req verifyTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing token"})
		return
	}
	var v models.RecruiterVerification
	if err := h.DB.Where("token_hash = ? AND used_at IS NULL AND expires_at > ?", hashResetToken(req.Token), time.Now()).First(&v).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "this link is invalid or has expired — request a new one"})
		return
	}
	now := time.Now()
	res := h.DB.Model(&models.RecruiterProfile{}).Where("user_id = ?", v.UserID).
		Updates(map[string]any{"verification_status": models.VerificationVerified, "verified_at": &now})
	if res.Error != nil || res.RowsAffected == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not verify your account"})
		return
	}
	h.DB.Model(&v).Update("used_at", &now)
	c.JSON(http.StatusOK, gin.H{"status": models.VerificationVerified})
}

// PendingRecruiters lists profiles awaiting a manual decision.
func (h *AdminHandler) PendingRecruiters(c *gin.Context) {
	var rows []struct {
		UserID      string `json:"userId"`
		Name        string `json:"name"`
		Email       string `json:"email"`
		Type        string `json:"type"`
		CompanyName string `json:"companyName"`
		Specialty   string `json:"specialty"`
	}
	h.DB.Table("recruiter_profiles p").
		Select("p.user_id, u.name, u.email, p.type, p.company_name, p.specialty").
		Joins("JOIN users u ON u.id = p.user_id").
		Where("p.verification_status = ?", models.VerificationPending).
		Order("p.updated_at asc").Scan(&rows)
	c.JSON(http.StatusOK, rows)
}

// VerifyRecruiter approves a recruiter by hand (the path for independents).
func (h *AdminHandler) VerifyRecruiter(c *gin.Context) {
	now := time.Now()
	res := h.DB.Model(&models.RecruiterProfile{}).Where("user_id = ?", c.Param("userId")).
		Updates(map[string]any{"verification_status": models.VerificationVerified, "verified_at": &now})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify"})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "recruiter profile not found"})
		return
	}
	c.Status(http.StatusNoContent)
}
