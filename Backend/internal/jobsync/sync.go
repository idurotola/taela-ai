package jobsync

import (
	"hash/fnv"
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"

	"taela-ai-backend/internal/models"
)

// StaleAfter is how long a job may sit deactivated (missing from the feed)
// before it's pruned from the database entirely.
const StaleAfter = 30 * 24 * time.Hour

type Result struct {
	Fetched     int `json:"fetched"`
	Created     int `json:"created"`
	Updated     int `json:"updated"`
	Deactivated int `json:"deactivated"`
	Pruned      int `json:"pruned"`
}

// Sync fetches the feed once, upserts every item into the job catalog keyed
// on its GUID, marks previously-synced jobs that didn't show up in this
// fetch as inactive, and prunes jobs that have been inactive longer than
// StaleAfter.
func Sync(db *gorm.DB) (Result, error) {
	var result Result

	items, err := fetchFeed(FeedURL)
	if err != nil {
		return result, err
	}
	result.Fetched = len(items)

	syncStart := time.Now()

	for _, item := range items {
		guid := strings.TrimSpace(item.GUID)
		if guid == "" {
			guid = strings.TrimSpace(item.Link)
		}
		if guid == "" {
			continue
		}

		company, location := parseCompanyLocation(item.Title)
		publishedAt := parsePubDate(item.PubDate)
		initials, bg, fg := deriveLogo(company)

		var existing models.Job
		err := db.Where("source_guid = ?", guid).First(&existing).Error
		if err != nil {
			if err != gorm.ErrRecordNotFound {
				continue
			}
			job := models.Job{
				Title: strings.TrimSpace(item.Title), Company: company, Location: location,
				Type: "Full-time", Platform: "MyJobMag", Industry: item.Industry,
				Description:   strings.TrimSpace(item.Description),
				MatchScore:    computeMatchScore(publishedAt),
				LogoInitials:  initials, LogoColor: bg, LogoTextColor: fg,
				PublishedAt: publishedAt, Source: SourceName, SourceGUID: guid, SourceURL: item.Link,
				Active: true, LastSeenAt: syncStart,
			}
			if err := db.Create(&job).Error; err == nil {
				result.Created++
			}
			continue
		}

		existing.Title = strings.TrimSpace(item.Title)
		existing.Company = company
		existing.Location = location
		existing.Industry = item.Industry
		existing.Description = strings.TrimSpace(item.Description)
		existing.MatchScore = computeMatchScore(publishedAt)
		existing.PublishedAt = publishedAt
		existing.SourceURL = item.Link
		existing.Active = true
		existing.LastSeenAt = syncStart
		existing.InactiveSince = nil
		if err := db.Save(&existing).Error; err == nil {
			result.Updated++
		}
	}

	// Anything from this source not touched by this run has fallen out of
	// the feed (filled or expired) — deactivate rather than delete outright.
	var toDeactivate []models.Job
	db.Where("source = ? AND active = ? AND last_seen_at < ?", SourceName, true, syncStart).Find(&toDeactivate)
	now := syncStart
	for _, j := range toDeactivate {
		db.Model(&models.Job{}).Where("id = ?", j.ID).Updates(map[string]any{"active": false, "inactive_since": &now})
	}
	result.Deactivated = len(toDeactivate)

	cutoff := time.Now().Add(-StaleAfter)
	pruneRes := db.Where("source = ? AND active = ? AND inactive_since < ?", SourceName, false, cutoff).Delete(&models.Job{})
	result.Pruned = int(pruneRes.RowsAffected)

	return result, nil
}

var (
	companyPattern          = regexp.MustCompile(`(?i)\bat\s+(.+)$`)
	trailingLocationPattern = regexp.MustCompile(`\(([^)]+)\)\s*$`)
)

// parseCompanyLocation extracts a best-effort company (and, if present, a
// parenthesized location) from a feed item's title. The feed has no
// structured company/location fields, only titles like "Job Opportunities
// at Dangote Group" or "... at Acme Corp (Lagos)".
func parseCompanyLocation(title string) (company, location string) {
	title = strings.TrimSpace(title)
	company = title
	if m := companyPattern.FindStringSubmatch(title); len(m) == 2 {
		company = strings.TrimSpace(m[1])
	}
	if m := trailingLocationPattern.FindStringSubmatch(company); len(m) == 2 {
		location = strings.TrimSpace(m[1])
		company = strings.TrimSpace(trailingLocationPattern.ReplaceAllString(company, ""))
	}
	return company, location
}

// computeMatchScore is a freshness-based placeholder until real CV-to-job
// matching exists: newer postings rank higher, decaying from 90 down to a
// floor of 50 over the first two weeks.
func computeMatchScore(publishedAt time.Time) int {
	if publishedAt.IsZero() {
		return 50
	}
	days := int(time.Since(publishedAt).Hours() / 24)
	score := 90 - days*5
	if score < 50 {
		score = 50
	}
	if score > 90 {
		score = 90
	}
	return score
}

var logoPalette = []struct{ bg, fg string }{
	{bg: "#FEF3B0", fg: "#977411"},
	{bg: "#FBC4D5", fg: "#BA1F4F"},
	{bg: "#BAD9F3", fg: "#1A5C8E"},
	{bg: "#B3E8DC", fg: "#1F7D65"},
	{bg: "#E8F2FB", fg: "#1A5C8E"},
}

func deriveLogo(company string) (initials, bg, fg string) {
	words := strings.Fields(company)
	switch {
	case len(words) == 0:
		initials = "?"
	case len(words) == 1:
		r := []rune(words[0])
		if len(r) >= 2 {
			initials = strings.ToUpper(string(r[:2]))
		} else {
			initials = strings.ToUpper(string(r))
		}
	default:
		initials = strings.ToUpper(string([]rune(words[0])[0]) + string([]rune(words[1])[0]))
	}

	h := fnv.New32a()
	_, _ = h.Write([]byte(company))
	p := logoPalette[int(h.Sum32())%len(logoPalette)]
	return initials, p.bg, p.fg
}

var pubDateLayouts = []string{
	time.RFC1123Z,
	time.RFC1123,
	"Mon, 2 Jan 2006 15:04:05 MST",
	"Mon, 2 Jan 2006 15:04:05 -0700",
}

func parsePubDate(s string) time.Time {
	s = strings.TrimSpace(s)
	for _, layout := range pubDateLayouts {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Now()
}
