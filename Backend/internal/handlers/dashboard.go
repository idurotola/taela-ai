package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
)

type DashboardHandler struct {
	DB *gorm.DB
}

func (h *DashboardHandler) Summary(c *gin.Context) {
	userID := auth.UserID(c)

	var apps []models.Application
	h.DB.Where("user_id = ?", userID).Find(&apps)

	var cv models.CV
	h.DB.Where("user_id = ?", userID).First(&cv)

	var contactCount int64
	h.DB.Model(&models.Contact{}).Count(&contactCount)

	total := len(apps)
	interviews := countStage(apps, "interviewing") + countStage(apps, "offered")

	stats := []dto.StatDTO{
		{Label: "Applications Sent", Value: strconv.Itoa(total), Trend: "Live from your tracker", TrendUp: true, Accent: "yellow"},
		{Label: "Interview Invites", Value: strconv.Itoa(interviews), Trend: fmt.Sprintf("%d%% of applications", pct(interviews, total)), TrendUp: true, Accent: "pink"},
		{Label: "CV Score (ATS)", Value: strconv.Itoa(cv.Score) + "/100", Trend: "Run AI Tailor to improve", TrendUp: true, Accent: "teal"},
		{Label: "Network Reach", Value: strconv.Itoa(int(contactCount)), Trend: "Suggested connections available", TrendUp: true, Accent: "blue"},
	}

	var jobs []models.Job
	h.DB.Where("active = ?", true).Order("match_score desc").Limit(3).Find(&jobs)
	applied := appliedJobIDSet(h.DB, userID)
	bestMatches := make([]dto.JobDTO, 0, len(jobs))
	for _, j := range jobs {
		bestMatches = append(bestMatches, dto.FromJob(j, applied[j.ID]))
	}

	var activities []models.Activity
	h.DB.Where("user_id = ?", userID).Order("created_at desc").Limit(4).Find(&activities)
	recent := make([]dto.ActivityDTO, 0, len(activities))
	for _, a := range activities {
		recent = append(recent, dto.FromActivity(a))
	}

	pipeline := []dto.PipelineStageDTO{
		{Label: "Applied", Count: countStage(apps, "applied")},
		{Label: "Review", Count: countStage(apps, "review")},
		{Label: "Shortlisted", Count: countStage(apps, "shortlisted")},
		{Label: "Interviewing", Count: countStage(apps, "interviewing")},
		{Label: "Offered", Count: countStage(apps, "offered")},
	}

	c.JSON(http.StatusOK, dto.DashboardSummaryDTO{
		Stats: stats, BestMatches: bestMatches, RecentActivity: recent, Pipeline: pipeline,
	})
}

func (h *DashboardHandler) Analytics(c *gin.Context) {
	userID := auth.UserID(c)

	var apps []models.Application
	h.DB.Where("user_id = ?", userID).Find(&apps)

	total := len(apps)
	responded, interviewing := 0, 0
	var replyDurations []time.Duration
	platformCounts := map[string]int{}
	weekdayCounts := map[string]int{}

	for _, a := range apps {
		if a.Platform != "" {
			platformCounts[a.Platform]++
		}
		weekdayCounts[a.CreatedAt.Weekday().String()[:3]]++
		if a.Stage != "applied" {
			responded++
			replyDurations = append(replyDurations, a.UpdatedAt.Sub(a.CreatedAt))
		}
		if a.Stage == "interviewing" || a.Stage == "offered" {
			interviewing++
		}
	}

	days := []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
	bestDay, bestDayCount := "—", 0
	for _, d := range days {
		if weekdayCounts[d] > bestDayCount {
			bestDay, bestDayCount = d, weekdayCounts[d]
		}
	}

	stats := []dto.StatDTO{
		{Label: "Response Rate", Value: strconv.Itoa(pct(responded, total)) + "%", Trend: "Based on your applications", TrendUp: true, Accent: "yellow"},
		{Label: "Interview Rate", Value: strconv.Itoa(pct(interviewing, total)) + "%", Trend: "Based on your applications", TrendUp: true, Accent: "teal"},
		{Label: "Avg Time to Reply", Value: avgDuration(replyDurations), Trend: "Across responded applications", TrendUp: true, Accent: "pink"},
		{Label: "Best Apply Day", Value: bestDay, Trend: "Your most active day", TrendUp: true, Accent: "blue"},
	}

	platformStats := make([]dto.PlatformStatDTO, 0, len(platformCounts))
	for name, count := range platformCounts {
		platformStats = append(platformStats, dto.PlatformStatDTO{Name: name, Count: count, Pct: pct(count, total)})
	}
	sort.Slice(platformStats, func(i, j int) bool { return platformStats[i].Count > platformStats[j].Count })

	weekly := make([]dto.WeeklyPointDTO, 0, 7)
	for _, d := range days {
		weekly = append(weekly, dto.WeeklyPointDTO{Day: d, Count: weekdayCounts[d]})
	}

	funnel := []dto.FunnelStepDTO{
		{Label: "Applied", Value: total, Pct: 100},
		{Label: "Reviewed", Value: countAtLeast(apps, 1), Pct: pct(countAtLeast(apps, 1), total)},
		{Label: "Shortlisted", Value: countAtLeast(apps, 2), Pct: pct(countAtLeast(apps, 2), total)},
		{Label: "Interviewing", Value: countAtLeast(apps, 3), Pct: pct(countAtLeast(apps, 3), total)},
		{Label: "Offered", Value: countAtLeast(apps, 4), Pct: pct(countAtLeast(apps, 4), total)},
	}

	c.JSON(http.StatusOK, dto.AnalyticsSummaryDTO{
		Stats: stats, PlatformStats: platformStats, WeeklyActivity: weekly, Funnel: funnel,
	})
}

func avgDuration(durs []time.Duration) string {
	if len(durs) == 0 {
		return "—"
	}
	var sum time.Duration
	for _, d := range durs {
		sum += d
	}
	avgDays := sum.Hours() / 24 / float64(len(durs))
	return fmt.Sprintf("%.1fd", avgDays)
}
