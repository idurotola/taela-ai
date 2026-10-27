package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/email"
	"taela-ai-backend/internal/models"
)

type AuthHandler struct {
	DB          *gorm.DB
	JWTSecret   string
	Email       *email.Service
	FrontendURL string
}

type signupRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var req signupRequest
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

	user := models.User{Name: req.Name, Email: req.Email, PasswordHash: hash, Role: models.RoleJobSeeker}
	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create account"})
		return
	}

	// Every user starts with a blank CV record to build on.
	h.DB.Create(&models.CV{UserID: user.ID, FullName: user.Name, Email: user.Email, AutoTailor: true})

	// Best-effort: a failed welcome email shouldn't fail signup.
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

type signinRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Signin(c *gin.Context) {
	var req signinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	if !auth.CheckPassword(user.PasswordHash, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	token, err := auth.GenerateToken(user.ID, user.Role, h.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	c.JSON(http.StatusOK, dto.AuthResponse{Token: token, User: dto.FromUser(user)})
}

func (h *AuthHandler) Me(c *gin.Context) {
	var user models.User
	if err := h.DB.First(&user, "id = ?", auth.UserID(c)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, dto.FromUser(user))
}

type updateAccountRequest struct {
	Name  *string `json:"name"`
	Email *string `json:"email" binding:"omitempty,email"`
}

// UpdateAccount lets a signed-in user change their display name and/or email.
// The CV record mirrors name/email as its own editable copy (set at signup
// and again on save from the CV Builder), so it is intentionally left alone
// here rather than overwritten.
func (h *AuthHandler) UpdateAccount(c *gin.Context) {
	userID := auth.UserID(c)
	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var req updateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Email != nil && *req.Email != user.Email {
		var existing models.User
		if err := h.DB.Where("email = ? AND id <> ?", *req.Email, userID).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "an account with this email already exists"})
			return
		}
		user.Email = *req.Email
	}
	if req.Name != nil {
		user.Name = *req.Name
	}

	if err := h.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update account"})
		return
	}
	c.JSON(http.StatusOK, dto.FromUser(user))
}

type updatePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=8"`
}

func (h *AuthHandler) UpdatePassword(c *gin.Context) {
	var user models.User
	if err := h.DB.First(&user, "id = ?", auth.UserID(c)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var req updatePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !auth.CheckPassword(user.PasswordHash, req.CurrentPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "current password is incorrect"})
		return
	}

	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process password"})
		return
	}
	user.PasswordHash = hash
	if err := h.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update password"})
		return
	}
	c.Status(http.StatusNoContent)
}

const (
	resetTokenBytes = 32
	resetTokenTTL   = time.Hour
)

func hashResetToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

type forgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ForgotPassword emails a one-time reset link to the account matching the
// given address, if one exists. It always responds with the same generic
// message regardless of whether the email is registered, so the endpoint
// can't be used to enumerate accounts.
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req forgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	const genericResponse = "If an account exists for that email, we've sent a password reset link."

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Don't reveal whether the address is registered.
		c.JSON(http.StatusOK, gin.H{"message": genericResponse})
		return
	}

	raw := make([]byte, resetTokenBytes)
	if _, err := rand.Read(raw); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate reset token"})
		return
	}
	token := hex.EncodeToString(raw)

	// A fresh request supersedes any still-outstanding ones for this user.
	h.DB.Where("user_id = ? AND used_at IS NULL", user.ID).Delete(&models.PasswordResetToken{})

	reset := models.PasswordResetToken{
		UserID:    user.ID,
		TokenHash: hashResetToken(token),
		ExpiresAt: time.Now().Add(resetTokenTTL),
	}
	if err := h.DB.Create(&reset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start password reset"})
		return
	}

	resetLink := fmt.Sprintf("%s/reset-password?token=%s", strings.TrimRight(h.FrontendURL, "/"), token)
	if err := h.Email.SendPasswordReset(c.Request.Context(), email.Recipient{Email: user.Email, Name: user.Name}, resetLink); err != nil {
		log.Printf("failed to send password reset email to %s: %v", user.Email, err)
	}

	c.JSON(http.StatusOK, gin.H{"message": genericResponse})
}

type resetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=8"`
}

// ResetPassword exchanges a valid, unexpired, unused reset token for setting
// a new password, then invalidates every outstanding reset token for the
// account so an older emailed link can't be replayed afterward.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var reset models.PasswordResetToken
	err := h.DB.Where("token_hash = ? AND used_at IS NULL AND expires_at > ?", hashResetToken(req.Token), time.Now()).
		First(&reset).Error
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "this reset link is invalid or has expired"})
		return
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", reset.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process password"})
		return
	}
	user.PasswordHash = hash
	if err := h.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reset password"})
		return
	}

	now := time.Now()
	h.DB.Model(&models.PasswordResetToken{}).
		Where("user_id = ? AND used_at IS NULL", user.ID).
		Update("used_at", &now)

	c.Status(http.StatusNoContent)
}
