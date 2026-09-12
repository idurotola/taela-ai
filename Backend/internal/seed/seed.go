// Package seed populates the global catalog tables (contacts, market
// insights) on first run so the app isn't empty out of the box. It is
// idempotent — it does nothing if the table already has rows.
//
// The job catalog is not seeded here — it's populated by internal/jobsync
// from a live external feed instead (see cmd/api/main.go).
package seed

import (
	"gorm.io/gorm"

	"taela-ai-backend/internal/models"
)

func Run(db *gorm.DB) error {
	if err := seedContacts(db); err != nil {
		return err
	}
	return seedInsights(db)
}

func seedContacts(db *gorm.DB) error {
	var count int64
	db.Model(&models.Contact{}).Count(&count)
	if count > 0 {
		return nil
	}
	contacts := []models.Contact{
		{Name: "Wura Adeyemi", Initials: "WA", Role: "Head of Product", Company: "Opay", MutualConnections: 3, ReferralFit: "high", AvatarColor: "#2EAA8A"},
		{Name: "Kofi Owusu", Initials: "KO", Role: "VP Engineering", Company: "Flutterwave", MutualConnections: 5, ReferralFit: "high", AvatarColor: "#E83567"},
		{Name: "Tosin Musa", Initials: "TM", Role: "Talent Partner", Company: "Andela", MutualConnections: 2, ReferralFit: "medium", AvatarColor: "#2878B5"},
		{Name: "Aisha Balogun", Initials: "AB", Role: "Product Director", Company: "Paystack", MutualConnections: 7, ReferralFit: "high", AvatarColor: "#F5C535"},
		{Name: "Emeka Chukwu", Initials: "EC", Role: "Senior PM", Company: "Kuda Bank", MutualConnections: 1, ReferralFit: "medium", AvatarColor: "#888888"},
		{Name: "Fatima Ibrahim", Initials: "FI", Role: "Hiring Manager", Company: "Carbon", MutualConnections: 4, ReferralFit: "high", AvatarColor: "#2EAA8A"},
	}
	return db.Create(&contacts).Error
}

func seedInsights(db *gorm.DB) error {
	var count int64
	db.Model(&models.MarketInsight{}).Count(&count)
	if count > 0 {
		return nil
	}
	insights := []models.MarketInsight{
		{Title: "Peak Hiring Season", Text: "Product roles up 34% this month. Apply now before competition increases.", Accent: "yellow", Sort: 0},
		{Title: "Skill Gap Detected", Text: "SQL mentioned in 78% of PM job descriptions. Consider a short course.", Accent: "teal", Sort: 1},
		{Title: "Salary Benchmark", Text: "Senior PM in Lagos: ₦4.5M–₦7.2M/yr. You're in the right bracket.", Accent: "blue", Sort: 2},
		{Title: "Best Performing CV", Text: "Your Paystack-tailored CV has 2.3x more opens than your generic version.", Accent: "pink", Sort: 3},
	}
	return db.Create(&insights).Error
}
