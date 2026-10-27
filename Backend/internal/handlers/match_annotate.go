package handlers

import (
	"gorm.io/gorm"

	"taela-ai-backend/internal/cvparse"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
	"taela-ai-backend/internal/tailor"
)

// matchAnnotator attaches an ATS match to job listings for one candidate.
// It loads the CV and the cached AI scores once, then scores each job: the
// considered AI score if the candidate has asked for one against their
// current CV, otherwise a free keyword estimate.
type matchAnnotator struct {
	cv    cvparse.Parsed
	ready bool
	ai    map[string]int // job id -> cached AI score for the current CV
}

func newMatchAnnotator(db *gorm.DB, userID string) *matchAnnotator {
	a := &matchAnnotator{ai: map[string]int{}}
	cv, _, err := loadCVContent(db, userID)
	if err != nil || !hasSubstance(cv) {
		return a
	}
	a.cv, a.ready = cv, true

	var rows []models.JobMatch
	db.Where("user_id = ? AND cv_hash = ?", userID, tailor.Hash(cv)).Find(&rows)
	for _, r := range rows {
		if m, ok := decodeMatch(r.Result); ok {
			a.ai[r.JobID] = m.Score
		}
	}
	return a
}

func (a *matchAnnotator) annotate(d *dto.JobDTO, j models.Job) {
	if !a.ready {
		return
	}
	if s, ok := a.ai[j.ID]; ok {
		d.AtsMatch, d.AtsMatchSource = &s, "ai"
		return
	}
	if s := tailor.QuickMatch(a.cv, tailor.Job{Title: j.Title, Company: j.Company, Description: j.Description}); s >= 0 {
		d.AtsMatch, d.AtsMatchSource = &s, "estimate"
	}
}
