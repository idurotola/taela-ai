package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"taela-ai-backend/internal/ai"
	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/cvparse"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
	"taela-ai-backend/internal/storage"
	"taela-ai-backend/internal/tailor"
)

// dailyAILimit caps billable AI calls (scoring a job or tailoring a CV) per
// user per UTC day. Cached results don't count.
const dailyAILimit = 10

type MatchHandler struct {
	DB     *gorm.DB
	Store  storage.Store
	Fast   ai.Provider // scoring
	Strong ai.Provider // rewriting
}

func aiEnabled(p ai.Provider) bool {
	if p == nil {
		return false
	}
	_, off := p.(ai.Disabled)
	return !off
}

// consumeAI atomically takes one unit of the user's daily budget, returning
// false when it's spent. The conditional upsert makes concurrent requests
// unable to overshoot the limit.
func consumeAI(db *gorm.DB, userID string) (bool, error) {
	res := db.Exec(`
		INSERT INTO ai_usages (id, user_id, day, count) VALUES (?, ?, ?, 1)
		ON CONFLICT (user_id, day) DO UPDATE SET count = ai_usages.count + 1
		WHERE ai_usages.count < ?`,
		uuid.NewString(), userID, time.Now().UTC().Format("2006-01-02"), dailyAILimit)
	return res.RowsAffected > 0, res.Error
}

// refundAI returns a unit when the provider call failed, so an outage doesn't
// burn the user's allowance.
func refundAI(db *gorm.DB, userID string) {
	db.Exec(`UPDATE ai_usages SET count = count - 1 WHERE user_id = ? AND day = ? AND count > 0`,
		userID, time.Now().UTC().Format("2006-01-02"))
}

// loadCVContent reads the user's master CV in the shape the AI features use.
func loadCVContent(db *gorm.DB, userID string) (cvparse.Parsed, models.CV, error) {
	var cv models.CV
	err := db.
		Preload("Experiences", func(d *gorm.DB) *gorm.DB { return d.Order("sort asc") }).
		Preload("Education", func(d *gorm.DB) *gorm.DB { return d.Order("sort asc") }).
		Where("user_id = ?", userID).First(&cv).Error
	if err != nil {
		return cvparse.Parsed{}, cv, err
	}
	p := cvparse.Parsed{
		FullName: cv.FullName, JobTitle: cv.JobTitle, Email: cv.Email, Phone: cv.Phone,
		Location: cv.Location, LinkedIn: cv.LinkedIn, Summary: cv.Summary,
		Skills: append([]string{}, cv.Skills...), Experiences: []cvparse.Experience{}, Education: []cvparse.Education{},
	}
	for _, e := range cv.Experiences {
		p.Experiences = append(p.Experiences, cvparse.Experience{Role: e.Role, Company: e.Company, Dates: e.Dates, Bullets: append([]string{}, e.Bullets...)})
	}
	for _, e := range cv.Education {
		p.Education = append(p.Education, cvparse.Education{School: e.School, Degree: e.Degree, Dates: e.Dates})
	}
	return p, cv, nil
}

func hasSubstance(p cvparse.Parsed) bool {
	return len(p.Experiences) > 0 || len(strings.Fields(p.Summary)) >= 10
}

// prepare loads the job and CV, and answers the request itself on any
// precondition failure. ok=false means a response was already written.
func (h *MatchHandler) prepare(c *gin.Context, provider ai.Provider) (job models.Job, cv cvparse.Parsed, master models.CV, ok bool) {
	if !aiEnabled(provider) {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI features aren't enabled yet"})
		return
	}
	if err := openJobs(h.DB).First(&job, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found or no longer active"})
		return
	}
	var err error
	cv, master, err = loadCVContent(h.DB, auth.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load your CV"})
		return
	}
	if !hasSubstance(cv) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "add your experience or a summary to your CV first — there's nothing to compare yet", "code": "cv_empty"})
		return
	}
	ok = true
	return
}

type matchResponse struct {
	tailor.Match
	Cached       bool          `json:"cached"`
	FormatChecks []formatCheck `json:"formatChecks"`
}

type formatCheck struct {
	Label  string `json:"label"`
	Status string `json:"status"` // ok, warn
}

// Match scores the candidate's CV against one job.
func (h *MatchHandler) Match(c *gin.Context) {
	job, cv, master, ok := h.prepare(c, h.Fast)
	if !ok {
		return
	}
	userID := auth.UserID(c)
	hash := tailor.Hash(cv)
	checks := h.formatChecks(c, master)

	var cached models.JobMatch
	if err := h.DB.Where("user_id = ? AND job_id = ? AND cv_hash = ?", userID, job.ID, hash).First(&cached).Error; err == nil {
		var m tailor.Match
		if json.Unmarshal([]byte(cached.Result), &m) == nil {
			c.JSON(http.StatusOK, matchResponse{Match: m, Cached: true, FormatChecks: checks})
			return
		}
	}

	if !h.takeBudget(c, userID) {
		return
	}
	m, err := tailor.Score(c.Request.Context(), h.Fast, cv, tailor.Job{Title: job.Title, Company: job.Company, Description: job.Description})
	if err != nil {
		refundAI(h.DB, userID)
		log.Printf("match failed for %s/%s: %v", userID, job.ID, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "we couldn't score this job right now, please try again"})
		return
	}
	saveMatch(h.DB, userID, job.ID, hash, m)
	c.JSON(http.StatusOK, matchResponse{Match: *m, FormatChecks: checks})
}

func (h *MatchHandler) takeBudget(c *gin.Context, userID string) bool {
	okBudget, err := consumeAI(h.DB, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "something went wrong"})
		return false
	}
	if !okBudget {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "You've used today's AI allowance. Results you've already generated are still available; try again tomorrow.", "code": "ai_limit"})
		return false
	}
	return true
}

type tailoredResponse struct {
	Content     cvparse.Parsed `json:"content"`
	CoverLetter string         `json:"coverLetter"`
	Changes     []string       `json:"changes"`
	Cached      bool           `json:"cached"`
	// Stale means the master CV changed after this was generated.
	Stale bool `json:"stale"`
}

func toTailoredResponse(t models.TailoredCV, currentHash string, cached bool) (tailoredResponse, bool) {
	var content cvparse.Parsed
	if json.Unmarshal([]byte(t.Content), &content) != nil {
		return tailoredResponse{}, false
	}
	var changes []string
	_ = json.Unmarshal([]byte(t.Changes), &changes)
	if changes == nil {
		changes = []string{}
	}
	return tailoredResponse{Content: content, CoverLetter: t.CoverLetter, Changes: changes, Cached: cached, Stale: t.CVHash != currentHash}, true
}

// Tailor rewrites the CV for one job and drafts a cover letter.
func (h *MatchHandler) Tailor(c *gin.Context) {
	job, cv, _, ok := h.prepare(c, h.Strong)
	if !ok {
		return
	}
	userID := auth.UserID(c)
	hash := tailor.Hash(cv)

	var existing models.TailoredCV
	if err := h.DB.Where("user_id = ? AND job_id = ?", userID, job.ID).First(&existing).Error; err == nil && existing.CVHash == hash {
		if resp, ok := toTailoredResponse(existing, hash, true); ok {
			c.JSON(http.StatusOK, resp)
			return
		}
	}

	if !h.takeBudget(c, userID) {
		return
	}
	t, err := tailor.Tailor(c.Request.Context(), h.Strong, cv, tailor.Job{Title: job.Title, Company: job.Company, Description: job.Description})
	if err != nil {
		refundAI(h.DB, userID)
		log.Printf("tailor failed for %s/%s: %v", userID, job.ID, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "we couldn't tailor your CV right now, please try again"})
		return
	}
	content, _ := json.Marshal(t.Content)
	changes, _ := json.Marshal(t.Changes)
	row := models.TailoredCV{UserID: userID, JobID: job.ID, CVHash: hash, Content: string(content), CoverLetter: t.CoverLetter, Changes: string(changes)}
	if existing.ID != "" {
		row.ID = existing.ID
	}
	if err := h.DB.Save(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save the tailored CV"})
		return
	}
	resp, _ := toTailoredResponse(row, hash, false)
	c.JSON(http.StatusOK, resp)
}

// GetTailored returns a previously generated tailored CV, if any.
func (h *MatchHandler) GetTailored(c *gin.Context) {
	userID := auth.UserID(c)
	var row models.TailoredCV
	if err := h.DB.Where("user_id = ? AND job_id = ?", userID, c.Param("id")).First(&row).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no tailored CV for this job yet"})
		return
	}
	cv, _, err := loadCVContent(h.DB, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load your CV"})
		return
	}
	resp, ok := toTailoredResponse(row, tailor.Hash(cv), true)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "stored CV is unreadable"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// formatChecks inspects the candidate's uploaded file (if any) for things
// that trip up applicant-tracking systems. A CV built in Taela is exported
// as a single-column text document, so it passes by construction.
func (h *MatchHandler) formatChecks(c *gin.Context, cv models.CV) []formatCheck {
	if cv.SourceFileKey == "" || h.Store == nil {
		return []formatCheck{{Label: "Exports as a clean, single-column document", Status: "ok"}}
	}
	rc, err := h.Store.Get(c.Request.Context(), cv.SourceFileKey)
	if err != nil {
		return []formatCheck{}
	}
	defer rc.Close()
	data, err := io.ReadAll(io.LimitReader(rc, cvparse.MaxFileBytes+1))
	if err != nil || len(data) > cvparse.MaxFileBytes {
		return []formatCheck{}
	}
	kind, err := cvparse.Detect(data)
	if err != nil {
		return []formatCheck{}
	}
	var out []formatCheck
	for _, r := range cvparse.Inspect(data, kind) {
		st := "ok"
		if !r.OK {
			st = "warn"
		}
		out = append(out, formatCheck{Label: r.Label, Status: st})
	}
	return out
}

// freezeTailored records a tailored CV as the application's snapshot. There's
// no file to attach — the structured content is what the recruiter sees.
func freezeTailored(app *models.Application, t models.TailoredCV, phone string) bool {
	var c cvparse.Parsed
	if json.Unmarshal([]byte(t.Content), &c) != nil {
		return false
	}
	d := dto.CVDTO{
		FullName: c.FullName, JobTitle: c.JobTitle, Email: c.Email, Location: c.Location,
		Phone: c.Phone, LinkedIn: c.LinkedIn, Summary: c.Summary,
		Skills: c.Skills, Experiences: []dto.CVExperienceDTO{}, Education: []dto.CVEducationDTO{}, ATSChecks: []dto.ATSCheckDTO{},
	}
	for i, e := range c.Experiences {
		d.Experiences = append(d.Experiences, dto.CVExperienceDTO{ID: "t" + string(rune('a'+i%26)), Role: e.Role, Company: e.Company, Dates: e.Dates, Bullets: e.Bullets})
	}
	for _, e := range c.Education {
		d.Education = append(d.Education, dto.CVEducationDTO{School: e.School, Degree: e.Degree, Dates: e.Dates})
	}
	b, err := json.Marshal(d)
	if err != nil {
		return false
	}
	app.CVSnapshot = string(b)
	app.Phone = phone
	return true
}

func decodeMatch(raw string) (*tailor.Match, bool) {
	var m tailor.Match
	if json.Unmarshal([]byte(raw), &m) != nil {
		return nil, false
	}
	return &m, true
}

// saveMatch stores (replacing any earlier) score for a user and job.
func saveMatch(db *gorm.DB, userID, jobID, hash string, m *tailor.Match) {
	b, _ := json.Marshal(m)
	db.Where("user_id = ? AND job_id = ?", userID, jobID).Delete(&models.JobMatch{})
	db.Create(&models.JobMatch{UserID: userID, JobID: jobID, CVHash: hash, Result: string(b)})
}
