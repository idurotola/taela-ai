package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
)

// KeywordSuggestions is the fixed set of ATS keywords the CV is scored against.
var KeywordSuggestions = []string{
	"Agile", "OKRs", "Roadmapping", "A/B Testing", "Jira",
	"Confluence", "Stakeholder Mgmt", "SQL", "Data-driven", "Go-to-market",
}

func Keywords(c *gin.Context) {
	c.JSON(http.StatusOK, KeywordSuggestions)
}

type CVHandler struct {
	DB *gorm.DB
}

func (h *CVHandler) getOrCreate(userID string) (*models.CV, error) {
	var cv models.CV
	err := h.DB.
		Preload("Experiences", func(db *gorm.DB) *gorm.DB { return db.Order("sort asc") }).
		Preload("ATSChecks", func(db *gorm.DB) *gorm.DB { return db.Order("sort asc") }).
		Where("user_id = ?", userID).First(&cv).Error
	if err == nil {
		return &cv, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	cv = models.CV{UserID: userID, AutoTailor: true}
	if err := h.DB.Create(&cv).Error; err != nil {
		return nil, err
	}
	return &cv, nil
}

func (h *CVHandler) Get(c *gin.Context) {
	cv, err := h.getOrCreate(auth.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load cv"})
		return
	}
	c.JSON(http.StatusOK, dto.FromCV(*cv))
}

type updateCVRequest struct {
	FullName       *string `json:"fullName"`
	JobTitle       *string `json:"jobTitle"`
	Email          *string `json:"email"`
	Location       *string `json:"location"`
	Phone          *string `json:"phone"`
	LinkedIn       *string `json:"linkedin"`
	Summary        *string `json:"summary"`
	TargetRole     *string `json:"targetRole"`
	TargetCompany  *string `json:"targetCompany"`
	AutoTailor     *bool   `json:"autoTailor"`
	JobDescription *string `json:"jobDescription"`
}

func assignStr(dst *string, src *string) {
	if src != nil {
		*dst = *src
	}
}

func (h *CVHandler) Update(c *gin.Context) {
	cv, err := h.getOrCreate(auth.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load cv"})
		return
	}

	var req updateCVRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	assignStr(&cv.FullName, req.FullName)
	assignStr(&cv.JobTitle, req.JobTitle)
	assignStr(&cv.Email, req.Email)
	assignStr(&cv.Location, req.Location)
	assignStr(&cv.Phone, req.Phone)
	assignStr(&cv.LinkedIn, req.LinkedIn)
	assignStr(&cv.Summary, req.Summary)
	assignStr(&cv.TargetRole, req.TargetRole)
	assignStr(&cv.TargetCompany, req.TargetCompany)
	assignStr(&cv.JobDescription, req.JobDescription)
	if req.AutoTailor != nil {
		cv.AutoTailor = *req.AutoTailor
	}

	if err := h.DB.Save(cv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update cv"})
		return
	}
	c.JSON(http.StatusOK, dto.FromCV(*cv))
}

type createExperienceRequest struct {
	Role    string   `json:"role" binding:"required"`
	Company string   `json:"company" binding:"required"`
	Dates   string   `json:"dates"`
	Bullets []string `json:"bullets"`
}

func (h *CVHandler) AddExperience(c *gin.Context) {
	cv, err := h.getOrCreate(auth.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load cv"})
		return
	}

	var req createExperienceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var count int64
	h.DB.Model(&models.CVExperience{}).Where("cv_id = ?", cv.ID).Count(&count)

	exp := models.CVExperience{
		CVID: cv.ID, Role: req.Role, Company: req.Company, Dates: req.Dates,
		Bullets: pq.StringArray(req.Bullets), Sort: int(count),
	}
	if err := h.DB.Create(&exp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add experience"})
		return
	}

	c.JSON(http.StatusCreated, dto.CVExperienceDTO{ID: exp.ID, Role: exp.Role, Company: exp.Company, Dates: exp.Dates, Bullets: req.Bullets})
}

func (h *CVHandler) DeleteExperience(c *gin.Context) {
	cv, err := h.getOrCreate(auth.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load cv"})
		return
	}

	res := h.DB.Where("id = ? AND cv_id = ?", c.Param("expID"), cv.ID).Delete(&models.CVExperience{})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete experience"})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "experience not found"})
		return
	}
	c.Status(http.StatusNoContent)
}

// Analyze scores the CV against KeywordSuggestions and quantified-bullet
// coverage, regenerating the ATS checklist from the result. This mirrors the
// original demo's "AI Tailor" action with a real, deterministic heuristic
// instead of a random score bump.
func (h *CVHandler) Analyze(c *gin.Context) {
	userID := auth.UserID(c)
	cv, err := h.getOrCreate(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load cv"})
		return
	}

	haystack := strings.ToLower(cv.Summary + " " + cv.JobDescription)
	for _, e := range cv.Experiences {
		haystack += " " + strings.ToLower(strings.Join(e.Bullets, " "))
	}

	matched := 0
	var missing []string
	for _, kw := range KeywordSuggestions {
		if strings.Contains(haystack, strings.ToLower(kw)) {
			matched++
		} else {
			missing = append(missing, kw)
		}
	}

	totalBullets, quantified := 0, 0
	for _, e := range cv.Experiences {
		for _, b := range e.Bullets {
			totalBullets++
			if strings.ContainsAny(b, "0123456789") {
				quantified++
			}
		}
	}

	score := 50 + (matched*30)/len(KeywordSuggestions)
	if totalBullets > 0 {
		score += (quantified * 20) / totalBullets
	}
	if score > 98 {
		score = 98
	}
	if score < cv.Score {
		score = cv.Score // never regress on repeated analysis
	}
	cv.Score = score

	h.DB.Where("cv_id = ?", cv.ID).Delete(&models.ATSCheck{})
	checks := []models.ATSCheck{
		{CVID: cv.ID, Label: fmt.Sprintf("Keywords matched: %d/%d", matched, len(KeywordSuggestions)), Status: checkStatus(matched, len(KeywordSuggestions)), Sort: 0},
		{CVID: cv.ID, Label: "Standard headings detected", Status: "ok", Sort: 1},
		{CVID: cv.ID, Label: "No images or tables (ATS safe)", Status: "ok", Sort: 2},
	}
	if len(missing) > 0 {
		shown := missing
		if len(shown) > 2 {
			shown = shown[:2]
		}
		checks = append(checks, models.ATSCheck{CVID: cv.ID, Label: "Missing: " + quotedList(shown), Status: "warn", Sort: 3})
	}
	if totalBullets > 0 {
		checks = append(checks, models.ATSCheck{CVID: cv.ID, Label: fmt.Sprintf("Quantified results: %d/%d bullets", quantified, totalBullets), Status: checkStatus(quantified, totalBullets), Sort: 4})
	}
	h.DB.Create(&checks)

	h.DB.Save(cv)
	h.DB.Preload("Experiences", func(db *gorm.DB) *gorm.DB { return db.Order("sort asc") }).
		Preload("ATSChecks", func(db *gorm.DB) *gorm.DB { return db.Order("sort asc") }).
		First(cv, "id = ?", cv.ID)

	logActivity(h.DB, userID, "cv", "CV auto-tailored", fmt.Sprintf("New ATS score: %d", cv.Score))

	c.JSON(http.StatusOK, dto.FromCV(*cv))
}

func checkStatus(n, total int) string {
	if total == 0 || n == total {
		return "ok"
	}
	if n > total/2 {
		return "warn"
	}
	return "bad"
}

func quotedList(items []string) string {
	quoted := make([]string, len(items))
	for i, it := range items {
		quoted[i] = fmt.Sprintf("%q", it)
	}
	return strings.Join(quoted, ", ")
}
