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
	Role  string `json:"role"`
}

func FromUser(u models.User) UserDTO {
	return UserDTO{ID: u.ID, Name: u.Name, Email: u.Email, Role: u.Role}
}

type AuthResponse struct {
	Token string  `json:"token"`
	User  UserDTO `json:"user"`
}

type UserSettingsDTO struct {
	JobMatchAlerts     bool `json:"jobMatchAlerts"`
	ApplicationUpdates bool `json:"applicationUpdates"`
	WeeklyDigest       bool `json:"weeklyDigest"`
	NetworkSuggestions bool `json:"networkSuggestions"`
}

func FromUserSettings(s models.UserSettings) UserSettingsDTO {
	return UserSettingsDTO{
		JobMatchAlerts:     s.JobMatchAlerts,
		ApplicationUpdates: s.ApplicationUpdates,
		WeeklyDigest:       s.WeeklyDigest,
		NetworkSuggestions: s.NetworkSuggestions,
	}
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
	SourceType    string `json:"sourceType"`
	Slug          string `json:"slug"`
	Applied       bool   `json:"applied"`
	Saved         bool   `json:"saved"`
}

func FromJob(j models.Job, applied, saved bool) JobDTO {
	return JobDTO{
		ID: j.ID, Title: j.Title, Company: j.Company, Location: j.Location,
		Type: j.Type, Salary: j.Salary, Platform: j.Platform, Industry: j.Industry,
		MatchScore: j.MatchScore, LogoInitials: j.LogoInitials, LogoColor: j.LogoColor,
		LogoTextColor: j.LogoTextColor, Posted: humanizeSince(j.PublishedAt),
		SourceURL: j.SourceURL, SourceType: j.SourceType, Slug: j.Slug, Applied: applied, Saved: saved,
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
	ID        string `json:"id"`
	JobID     string `json:"jobId,omitempty"`
	Title     string `json:"title"`
	Company   string `json:"company"`
	Location  string `json:"location"`
	Platform  string `json:"platform"`
	SourceURL string `json:"sourceUrl,omitempty"`
	Date      string `json:"date"`
	Stage     string `json:"stage"`
	NextStep  string `json:"nextStep,omitempty"`
}

func FromApplication(a models.Application) ApplicationDTO {
	jobID := ""
	if a.JobID != nil {
		jobID = *a.JobID
	}
	return ApplicationDTO{
		ID: a.ID, JobID: jobID, Title: a.Title, Company: a.Company, Location: a.Location,
		Platform: a.Platform, SourceURL: a.SourceURL, Date: a.CreatedAt.Format("Jan 2"), Stage: a.Stage, NextStep: a.NextStep,
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

type RecruiterProfileDTO struct {
	ID             string `json:"id"`
	Type           string `json:"type"`
	Specialty      string `json:"specialty,omitempty"`
	Bio            string `json:"bio,omitempty"`
	CompanyName    string `json:"companyName,omitempty"`
	CompanyWebsite string `json:"companyWebsite,omitempty"`
	Industry       string `json:"industry,omitempty"`
}

func FromRecruiterProfile(p models.RecruiterProfile) RecruiterProfileDTO {
	return RecruiterProfileDTO{
		ID: p.ID, Type: p.Type, Specialty: p.Specialty, Bio: p.Bio,
		CompanyName: p.CompanyName, CompanyWebsite: p.CompanyWebsite, Industry: p.Industry,
	}
}

// RecruiterJobDTO is a recruiter's own view of a posting, with expiry/status.
type RecruiterJobDTO struct {
	ID             string `json:"id"`
	Slug           string `json:"slug"`
	Title          string `json:"title"`
	Company        string `json:"company"`
	Location       string `json:"location"`
	Type           string `json:"type"`
	Salary         string `json:"salary"`
	Description    string `json:"description"`
	Status         string `json:"status"` // open, expired
	ExpiresAt      string `json:"expiresAt"`
	CreatedAt      string `json:"createdAt"`
	ApplicantCount int    `json:"applicantCount"`
}

func FromRecruiterJob(j models.Job, applicantCount int) RecruiterJobDTO {
	status := "open"
	if !j.IsOpenForApplications() {
		status = "expired"
	}
	expiresAt := ""
	if j.ExpiresAt != nil {
		expiresAt = j.ExpiresAt.Format(time.RFC3339)
	}
	return RecruiterJobDTO{
		ID: j.ID, Slug: j.Slug, Title: j.Title, Company: j.Company, Location: j.Location,
		Type: j.Type, Salary: j.Salary, Description: j.Description,
		Status: status, ExpiresAt: expiresAt, CreatedAt: j.CreatedAt.Format(time.RFC3339),
		ApplicantCount: applicantCount,
	}
}

// RecruiterApplicantDTO is a candidate from the applicant's own account,
// as seen by the recruiter who owns the job they applied to.
type RecruiterApplicantDTO struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Stage     string `json:"stage"`
	AppliedAt string `json:"appliedAt"`
}

func FromRecruiterApplicant(a models.Application, name, email string) RecruiterApplicantDTO {
	return RecruiterApplicantDTO{
		ID: a.ID, Name: name, Email: email, Stage: a.Stage,
		AppliedAt: a.CreatedAt.Format(time.RFC3339),
	}
}

// PublicJobDTO is what the unauthenticated job page needs: the full
// description plus whether the posting is still open. Closed postings are
// still returned so the page can say so instead of a bare 404.
type PublicJobDTO struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Company     string `json:"company"`
	Location    string `json:"location"`
	Type        string `json:"type"`
	Salary      string `json:"salary"`
	Industry    string `json:"industry,omitempty"`
	Description string `json:"description"`
	Platform    string `json:"platform"`
	SourceType  string `json:"sourceType"`
	SourceURL   string `json:"sourceUrl,omitempty"`
	PostedAt    string `json:"postedAt"`
	ExpiresAt   string `json:"expiresAt,omitempty"`
	Open        bool   `json:"open"`
}

func FromPublicJob(j models.Job) PublicJobDTO {
	expires := ""
	if j.ExpiresAt != nil {
		expires = j.ExpiresAt.Format(time.RFC3339)
	}
	return PublicJobDTO{
		ID: j.ID, Slug: j.Slug, Title: j.Title, Company: j.Company, Location: j.Location,
		Type: j.Type, Salary: j.Salary, Industry: j.Industry, Description: j.Description,
		Platform: j.Platform, SourceType: j.SourceType, SourceURL: j.SourceURL,
		PostedAt: j.PublishedAt.Format(time.RFC3339), ExpiresAt: expires,
		Open: j.IsOpenForApplications(),
	}
}

// PublicJobRefDTO is the minimal row the sitemap needs.
type PublicJobRefDTO struct {
	Slug      string `json:"slug"`
	UpdatedAt string `json:"updatedAt"`
}
