package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"gorm.io/gorm"

	"taela-ai-backend/internal/ai"
	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/cvparse"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/email"
	"taela-ai-backend/internal/models"
	"taela-ai-backend/internal/tailor"
)

// AutoApplyHandler serves the user-facing rules and approval queue, and holds
// the worker that finds matches in the background.
type AutoApplyHandler struct {
	DB          *gorm.DB
	Jobs        *JobsHandler
	Fast        ai.Provider
	Email       *email.Service
	FrontendURL string
}

const (
	maxScoresPerRun  = 10 // bounds AI spend per user per pass
	maxCandidateJobs = 50
	lookbackWindow   = 7 * 24 * time.Hour
)

type ruleDTO struct {
	Enabled   bool     `json:"enabled"`
	Mode      string   `json:"mode"`
	Roles     []string `json:"roles"`
	Locations []string `json:"locations"`
	MinScore  int      `json:"minScore"`
	MaxPerDay int      `json:"maxPerDay"`
}

func toRuleDTO(r models.AutoApplyRule) ruleDTO {
	return ruleDTO{
		Enabled: r.Enabled, Mode: r.Mode, Roles: nonNilStrings(r.Roles), Locations: nonNilStrings(r.Locations),
		MinScore: r.MinScore, MaxPerDay: r.MaxPerDay,
	}
}

func nonNilStrings(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

func defaultRule(userID string) models.AutoApplyRule {
	return models.AutoApplyRule{UserID: userID, Mode: models.AutoApplyReview, MinScore: 70, MaxPerDay: 3}
}

func (h *AutoApplyHandler) loadRule(userID string) models.AutoApplyRule {
	var r models.AutoApplyRule
	if err := h.DB.Where("user_id = ?", userID).First(&r).Error; err != nil {
		return defaultRule(userID)
	}
	return r
}

func (h *AutoApplyHandler) GetRule(c *gin.Context) {
	c.JSON(http.StatusOK, toRuleDTO(h.loadRule(auth.UserID(c))))
}

type ruleRequest struct {
	Enabled   bool     `json:"enabled"`
	Mode      string   `json:"mode"`
	Roles     []string `json:"roles"`
	Locations []string `json:"locations"`
	MinScore  int      `json:"minScore"`
	MaxPerDay int      `json:"maxPerDay"`
}

func cleanTerms(in []string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, s := range in {
		s = strings.TrimSpace(s)
		if r := []rune(s); len(r) > 60 {
			s = string(r[:60])
		}
		if k := strings.ToLower(s); s != "" && !seen[k] && len(out) < 10 {
			seen[k] = true
			out = append(out, s)
		}
	}
	return out
}

func (h *AutoApplyHandler) PutRule(c *gin.Context) {
	userID := auth.UserID(c)
	var req ruleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Mode != models.AutoApplyReview && req.Mode != models.AutoApplyAuto {
		c.JSON(http.StatusBadRequest, gin.H{"error": "mode must be 'review' or 'auto'"})
		return
	}
	if req.MinScore < 50 || req.MinScore > 95 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "minimum fit must be between 50 and 95"})
		return
	}
	if req.MaxPerDay < 1 || req.MaxPerDay > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "daily limit must be between 1 and 10"})
		return
	}

	rule := h.loadRule(userID)
	if req.Enabled {
		if !aiEnabled(h.Fast) {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI features aren't enabled yet, so jobs can't be matched"})
			return
		}
		cv, _, err := loadCVContent(h.DB, userID)
		if err != nil || !hasSubstance(cv) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "add your experience or a summary to your CV first — matching needs something to compare", "code": "cv_empty"})
			return
		}
	}
	if req.Enabled && !rule.Enabled {
		now := time.Now()
		rule.EnabledAt = &now
	}
	rule.UserID, rule.Enabled, rule.Mode = userID, req.Enabled, req.Mode
	rule.Roles, rule.Locations = pq.StringArray(cleanTerms(req.Roles)), pq.StringArray(cleanTerms(req.Locations))
	rule.MinScore, rule.MaxPerDay = req.MinScore, req.MaxPerDay
	if err := h.DB.Save(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save"})
		return
	}
	c.JSON(http.StatusOK, toRuleDTO(rule))
}

type queueItemDTO struct {
	ID        string     `json:"id"`
	Job       dto.JobDTO `json:"job"`
	Score     int        `json:"score"`
	Summary   string     `json:"summary"`
	CreatedAt string     `json:"createdAt"`
}

func (h *AutoApplyHandler) Queue(c *gin.Context) {
	userID := auth.UserID(c)
	var items []models.AutoApplyItem
	h.DB.Where("user_id = ? AND status = ?", userID, models.ItemPending).Order("score desc, created_at asc").Find(&items)

	out := make([]queueItemDTO, 0, len(items))
	for _, it := range items {
		var job models.Job
		// Jobs that closed since being queued quietly drop out of the list.
		if err := openJobs(h.DB).First(&job, "id = ?", it.JobID).Error; err != nil {
			continue
		}
		out = append(out, queueItemDTO{ID: it.ID, Job: dto.FromJob(job, false, false), Score: it.Score, Summary: it.Summary, CreatedAt: it.CreatedAt.Format(time.RFC3339)})
	}
	c.JSON(http.StatusOK, out)
}

func (h *AutoApplyHandler) pendingItem(c *gin.Context) (models.AutoApplyItem, bool) {
	var it models.AutoApplyItem
	if err := h.DB.Where("id = ? AND user_id = ? AND status = ?", c.Param("id"), auth.UserID(c), models.ItemPending).First(&it).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "this match is no longer waiting for approval"})
		return it, false
	}
	return it, true
}

// Approve submits the application for a queued match.
func (h *AutoApplyHandler) Approve(c *gin.Context) {
	it, ok := h.pendingItem(c)
	if !ok {
		return
	}
	var job models.Job
	if err := openJobs(h.DB).First(&job, "id = ?", it.JobID).Error; err != nil {
		c.JSON(http.StatusGone, gin.H{"error": "this job is no longer accepting applications"})
		return
	}
	var req applyRequest
	_ = c.ShouldBindJSON(&req)

	app, _, err := h.Jobs.createApplication(c.Request.Context(), auth.UserID(c), job, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to apply"})
		return
	}
	h.DB.Model(&it).Updates(map[string]any{"status": models.ItemApplied, "application_id": app.ID})
	c.JSON(http.StatusOK, dto.FromApplication(app))
}

func (h *AutoApplyHandler) Skip(c *gin.Context) {
	it, ok := h.pendingItem(c)
	if !ok {
		return
	}
	h.DB.Model(&it).Update("status", models.ItemSkipped)
	c.Status(http.StatusNoContent)
}

// RunNow runs one matching pass for the signed-in user, so they don't have to
// wait for the next scheduled one.
func (h *AutoApplyHandler) RunNow(c *gin.Context) {
	userID := auth.UserID(c)
	rule := h.loadRule(userID)
	if !rule.Enabled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "turn auto-apply on first"})
		return
	}
	res := h.runForUser(c.Request.Context(), rule)
	c.JSON(http.StatusOK, res)
}

// RunResult summarises one pass.
type RunResult struct {
	Considered   int  `json:"considered"`   // jobs that passed the role/location filter
	Queued       int  `json:"queued"`       // waiting for approval
	AutoApplied  int  `json:"autoApplied"`  // submitted without asking
	BelowMinimum int  `json:"belowMinimum"` // scored under the threshold
	BudgetSpent  bool `json:"budgetSpent"`  // stopped early: daily AI allowance used
}

func matchesTerms(value string, terms []string) bool {
	if len(terms) == 0 {
		return true
	}
	v := strings.ToLower(value)
	for _, t := range terms {
		if strings.Contains(v, strings.ToLower(t)) {
			return true
		}
	}
	return false
}

// runForUser finds new Taela jobs that fit a user's rule and queues or
// applies to them. Each job is considered once (AutoApplyItem), scoring goes
// through the same cache and daily budget as manual scoring, and automatic
// applications always send the master CV with no AI-written text, so nothing
// unreviewed goes to an employer.
func (h *AutoApplyHandler) runForUser(ctx context.Context, rule models.AutoApplyRule) RunResult {
	var res RunResult
	userID := rule.UserID

	cv, _, err := loadCVContent(h.DB, userID)
	if err != nil || !hasSubstance(cv) {
		return res
	}
	hash := tailor.Hash(cv)

	since := time.Now().Add(-lookbackWindow)
	if rule.EnabledAt != nil && rule.EnabledAt.After(since) {
		since = *rule.EnabledAt
	}
	var jobs []models.Job
	openJobs(h.DB).
		Where("source_type = ? AND created_at > ?", models.SourceTypeDirect, since).
		Where("id NOT IN (SELECT job_id FROM auto_apply_items WHERE user_id = ?)", userID).
		Where("id NOT IN (SELECT job_id FROM applications WHERE user_id = ? AND job_id IS NOT NULL)", userID).
		Order("created_at asc").Limit(maxCandidateJobs).Find(&jobs)

	autoToday := h.autoAppliedToday(userID)
	scored := 0
	for _, job := range jobs {
		if !matchesTerms(job.Title, rule.Roles) || !matchesTerms(job.Location, rule.Locations) {
			continue
		}
		res.Considered++
		if scored >= maxScoresPerRun {
			break
		}

		m, budgetOK := h.scoreJob(ctx, userID, hash, cv, job)
		if !budgetOK {
			res.BudgetSpent = true
			break
		}
		if m == nil { // provider error: leave it for the next pass
			continue
		}
		scored++

		item := models.AutoApplyItem{UserID: userID, JobID: job.ID, Score: m.Score, Summary: m.Summary}
		switch {
		case m.Score < rule.MinScore:
			item.Status = models.ItemBelowThreshold
			res.BelowMinimum++
		case rule.Mode == models.AutoApplyAuto && autoToday < rule.MaxPerDay:
			app, _, err := h.Jobs.createApplication(ctx, userID, job, applyRequest{})
			if err != nil {
				log.Printf("auto-apply: applying %s for %s: %v", job.ID, userID, err)
				continue
			}
			item.Status, item.ApplicationID = models.ItemAutoApplied, &app.ID
			autoToday++
			res.AutoApplied++
		default:
			// Review mode, or auto mode past today's cap: ask the user.
			item.Status = models.ItemPending
			res.Queued++
		}
		if err := h.DB.Create(&item).Error; err != nil {
			log.Printf("auto-apply: recording %s for %s: %v", job.ID, userID, err)
		}
	}

	if res.Queued > 0 {
		h.emailDigest(userID, res.Queued)
	}
	return res
}

// scoreJob returns a cached or fresh score. budgetOK=false means the user's
// daily allowance is used up; a nil match with budgetOK=true means the
// provider failed (the allowance is refunded).
func (h *AutoApplyHandler) scoreJob(ctx context.Context, userID, hash string, cv cvparse.Parsed, job models.Job) (*tailor.Match, bool) {
	var cached models.JobMatch
	if err := h.DB.Where("user_id = ? AND job_id = ? AND cv_hash = ?", userID, job.ID, hash).First(&cached).Error; err == nil {
		if m, ok := decodeMatch(cached.Result); ok {
			return m, true
		}
	}
	if ok, err := consumeAI(h.DB, userID); err != nil || !ok {
		return nil, false
	}
	m, err := tailor.Score(ctx, h.Fast, cv, tailor.Job{Title: job.Title, Company: job.Company, Description: job.Description})
	if err != nil {
		refundAI(h.DB, userID)
		log.Printf("auto-apply: scoring %s for %s: %v", job.ID, userID, err)
		return nil, true
	}
	saveMatch(h.DB, userID, job.ID, hash, m)
	return m, true
}

func (h *AutoApplyHandler) autoAppliedToday(userID string) int {
	var n int64
	h.DB.Model(&models.AutoApplyItem{}).
		Where("user_id = ? AND status = ? AND created_at >= ?", userID, models.ItemAutoApplied, time.Now().UTC().Truncate(24*time.Hour)).
		Count(&n)
	return int(n)
}

func (h *AutoApplyHandler) emailDigest(userID string, n int) {
	var settings models.UserSettings
	if err := h.DB.Where("user_id = ?", userID).First(&settings).Error; err == nil && !settings.JobMatchAlerts {
		return
	}
	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		return
	}
	link := strings.TrimRight(h.FrontendURL, "/") + "/dashboard"
	notify("auto-apply digest", func(ctx context.Context) error {
		return h.Email.SendAutoApplyDigest(ctx, email.Recipient{Email: user.Email, Name: user.Name}, n, link)
	})
}

// autoApplyLockKey identifies the worker's Postgres advisory lock.
const autoApplyLockKey = 7340211

// RunAll is one scheduled pass over every enabled rule. A transaction-scoped
// advisory lock makes it safe to run on several API instances: only one holds
// the lock, the others skip the pass.
func (h *AutoApplyHandler) RunAll(ctx context.Context) {
	if !aiEnabled(h.Fast) {
		return
	}
	tx := h.DB.Begin()
	defer tx.Rollback() // releases the lock
	var got bool
	if err := tx.Raw("SELECT pg_try_advisory_xact_lock(?)", autoApplyLockKey).Scan(&got).Error; err != nil || !got {
		return
	}

	var rules []models.AutoApplyRule
	h.DB.Where("enabled = ?", true).Order("updated_at asc").Limit(500).Find(&rules)
	for _, r := range rules {
		if ctx.Err() != nil {
			return
		}
		h.runForUser(ctx, r)
	}
}

// StartWorker runs RunAll on an interval until the process exits.
func (h *AutoApplyHandler) StartWorker(interval time.Duration) {
	if interval <= 0 {
		return
	}
	go func() {
		t := time.NewTicker(interval)
		defer t.Stop()
		for range t.C {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
			func() {
				defer func() {
					if r := recover(); r != nil {
						log.Printf("auto-apply worker panic: %v", r)
					}
				}()
				h.RunAll(ctx)
			}()
			cancel()
		}
	}()
	log.Printf("auto-apply worker running every %s", interval)
}
