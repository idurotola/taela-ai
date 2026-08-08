// Package dto defines the API's response/request shapes, kept separate from
// the GORM models so the wire format stays stable even as storage evolves.
package dto

import (
	"fmt"
	"time"

	"taela-ai-backend/internal/models"
)

type UserDTO struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func FromUser(u models.User) UserDTO {
	return UserDTO{ID: u.ID, Name: u.Name, Email: u.Email}
}

type AuthResponse struct {
	Token string  `json:"token"`
	User  UserDTO `json:"user"`
}

type JobDTO struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	Company       string `json:"company"`
	Location      string `json:"location"`
	Type          string `json:"type"`
	Salary        string `json:"salary"`
	Platform      string `json:"platform"`
	Industry      string `json:"industry,omitempty"`
	MatchScore    int    `json:"matchScore"`
	LogoInitials  string `json:"logoInitials"`
	LogoColor     string `json:"logoColor"`
	LogoTextColor string `json:"logoTextColor"`
	Posted        string `json:"posted"`
	SourceURL     string `json:"sourceUrl,omitempty"`
	Applied       bool   `json:"applied"`
}

func FromJob(j models.Job, applied bool) JobDTO {
	return JobDTO{
		ID: j.ID, Title: j.Title, Company: j.Company, Location: j.Location,
		Type: j.Type, Salary: j.Salary, Platform: j.Platform, Industry: j.Industry,
		MatchScore: j.MatchScore, LogoInitials: j.LogoInitials, LogoColor: j.LogoColor,
		LogoTextColor: j.LogoTextColor, Posted: humanizeSince(j.PublishedAt),
		SourceURL: j.SourceURL, Applied: applied,
	}
}

// humanizeSince renders a relative "posted" string (e.g. "2 days ago") from
// a stored timestamp, computed fresh on every response instead of a static
// string that goes stale the moment it's written.
func humanizeSince(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	d := time.Since(t)
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		n := int(d.Minutes())
		return fmt.Sprintf("%d min%s ago", n, plural(n))
	case d < 24*time.Hour:
		n := int(d.Hours())
		return fmt.Sprintf("%d hour%s ago", n, plural(n))
	case d < 7*24*time.Hour:
		n := int(d.Hours() / 24)
		return fmt.Sprintf("%d day%s ago", n, plural(n))
	default:
		n := int(d.Hours() / 24 / 7)
		return fmt.Sprintf("%d week%s ago", n, plural(n))
	}
}

func plural(n int) string {
	if n == 1 {
		return ""
	}
	return "s"
}

type ApplicationDTO struct {
	ID       string `json:"id"`
	JobID    string `json:"jobId,omitempty"`
	Title    string `json:"title"`
	Company  string `json:"company"`
	Location string `json:"location"`
	Platform string `json:"platform"`
	Date     string `json:"date"`
	Stage    string `json:"stage"`
	NextStep string `json:"nextStep,omitempty"`
}

func FromApplication(a models.Application) ApplicationDTO {
	jobID := ""
	if a.JobID != nil {
		jobID = *a.JobID
	}
	return ApplicationDTO{
		ID: a.ID, JobID: jobID, Title: a.Title, Company: a.Company, Location: a.Location,
		Platform: a.Platform, Date: a.CreatedAt.Format("Jan 2"), Stage: a.Stage, NextStep: a.NextStep,
	}
}

type ContactDTO struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Initials          string `json:"initials"`
	Role              string `json:"role"`
	Company           string `json:"company"`
	MutualConnections int    `json:"mutualConnections"`
	ReferralFit       string `json:"referralFit"`
	AvatarColor       string `json:"avatarColor"`
	Connected         bool   `json:"connected"`
}

func FromContact(ct models.Contact, connected bool) ContactDTO {
	return ContactDTO{
		ID: ct.ID, Name: ct.Name, Initials: ct.Initials, Role: ct.Role, Company: ct.Company,
		MutualConnections: ct.MutualConnections, ReferralFit: ct.ReferralFit, AvatarColor: ct.AvatarColor,
		Connected: connected,
	}
}

type ATSCheckDTO struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Status string `json:"status"`
}

type CVExperienceDTO struct {
	ID      string   `json:"id"`
	Role    string   `json:"role"`
	Company string   `json:"company"`
	Dates   string   `json:"dates"`
	Bullets []string `json:"bullets"`
}

type CVDTO struct {
	ID             string            `json:"id"`
	FullName       string            `json:"fullName"`
	JobTitle       string            `json:"jobTitle"`
	Email          string            `json:"email"`
	Location       string            `json:"location"`
	Phone          string            `json:"phone"`
	LinkedIn       string            `json:"linkedin"`
	Summary        string            `json:"summary"`
	TargetRole     string            `json:"targetRole"`
	TargetCompany  string            `json:"targetCompany"`
	AutoTailor     bool              `json:"autoTailor"`
	JobDescription string            `json:"jobDescription"`
	Score          int               `json:"score"`
	Experiences    []CVExperienceDTO `json:"experiences"`
	ATSChecks      []ATSCheckDTO     `json:"atsChecks"`
}

func FromCV(cv models.CV) CVDTO {
	exps := make([]CVExperienceDTO, 0, len(cv.Experiences))
	for _, e := range cv.Experiences {
		exps = append(exps, CVExperienceDTO{ID: e.ID, Role: e.Role, Company: e.Company, Dates: e.Dates, Bullets: []string(e.Bullets)})
	}
	checks := make([]ATSCheckDTO, 0, len(cv.ATSChecks))
	for _, ck := range cv.ATSChecks {
		checks = append(checks, ATSCheckDTO{ID: ck.ID, Label: ck.Label, Status: ck.Status})
	}
	return CVDTO{
		ID: cv.ID, FullName: cv.FullName, JobTitle: cv.JobTitle, Email: cv.Email, Location: cv.Location,
		Phone: cv.Phone, LinkedIn: cv.LinkedIn, Summary: cv.Summary, TargetRole: cv.TargetRole,
		TargetCompany: cv.TargetCompany, AutoTailor: cv.AutoTailor, JobDescription: cv.JobDescription,
		Score: cv.Score, Experiences: exps, ATSChecks: checks,
	}
}

type MarketInsightDTO struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Text   string `json:"text"`
	Accent string `json:"accent"`
}

func FromInsight(i models.MarketInsight) MarketInsightDTO {
	return MarketInsightDTO{ID: i.ID, Title: i.Title, Text: i.Text, Accent: i.Accent}
}

type ActivityDTO struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	Title string `json:"title"`
	Sub   string `json:"sub"`
}

func FromActivity(a models.Activity) ActivityDTO {
	return ActivityDTO{ID: a.ID, Type: a.Type, Title: a.Title, Sub: a.Sub}
}

type StatDTO struct {
	Label   string `json:"label"`
	Value   string `json:"value"`
	Trend   string `json:"trend"`
	TrendUp bool   `json:"trendUp"`
	Accent  string `json:"accent"`
}

type PipelineStageDTO struct {
	Label string `json:"label"`
	Count int    `json:"count"`
}

type DashboardSummaryDTO struct {
	Stats          []StatDTO          `json:"stats"`
	BestMatches    []JobDTO           `json:"bestMatches"`
	RecentActivity []ActivityDTO      `json:"recentActivity"`
	Pipeline       []PipelineStageDTO `json:"pipeline"`
}

type PlatformStatDTO struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
	Pct   int    `json:"pct"`
}

type WeeklyPointDTO struct {
	Day   string `json:"day"`
	Count int    `json:"count"`
}

type FunnelStepDTO struct {
	Label string `json:"label"`
	Value int    `json:"value"`
	Pct   int    `json:"pct"`
}

type AnalyticsSummaryDTO struct {
	Stats          []StatDTO         `json:"stats"`
	PlatformStats  []PlatformStatDTO `json:"platformStats"`
	WeeklyActivity []WeeklyPointDTO  `json:"weeklyActivity"`
	Funnel         []FunnelStepDTO   `json:"funnel"`
}
