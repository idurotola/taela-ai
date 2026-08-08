package handlers

import (
	"gorm.io/gorm"

	"taela-ai-backend/internal/models"
)

func logActivity(db *gorm.DB, userID, actType, title, sub string) {
	db.Create(&models.Activity{UserID: userID, Type: actType, Title: title, Sub: sub})
}

func countStage(apps []models.Application, stage string) int {
	n := 0
	for _, a := range apps {
		if a.Stage == stage {
			n++
		}
	}
	return n
}

// progressionOrder is used to build the analytics conversion funnel. Since we
// only store an application's current stage (not its full history), a stage
// is treated as having passed through every earlier stage in this order.
var progressionOrder = map[string]int{
	"applied": 0, "review": 1, "shortlisted": 2, "interviewing": 3, "offered": 4,
}

func countAtLeast(apps []models.Application, minIdx int) int {
	n := 0
	for _, a := range apps {
		if a.Stage == "rejected" {
			continue
		}
		if idx, ok := progressionOrder[a.Stage]; ok && idx >= minIdx {
			n++
		}
	}
	return n
}

func pct(n, total int) int {
	if total == 0 {
		return 0
	}
	return n * 100 / total
}

func appliedJobIDSet(db *gorm.DB, userID string) map[string]bool {
	var apps []models.Application
	db.Where("user_id = ? AND job_id IS NOT NULL", userID).Find(&apps)
	set := map[string]bool{}
	for _, a := range apps {
		if a.JobID != nil {
			set[*a.JobID] = true
		}
	}
	return set
}
