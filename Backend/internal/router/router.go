package router

import (
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/ai"
	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/config"
	"taela-ai-backend/internal/email"
	"taela-ai-backend/internal/handlers"
	"taela-ai-backend/internal/ratelimit"
	"taela-ai-backend/internal/storage"
)

func New(db *gorm.DB, cfg config.Config, emailSvc *email.Service, store storage.Store, aiProvider, strongAI ai.Provider) *gin.Engine {
	r := gin.Default()

	// The rate limiter keys on the client IP. By default gin trusts every
	// proxy's X-Forwarded-For, which lets a client dodge the limit by
	// spoofing it; set TRUSTED_PROXIES to the platform's proxy ranges.
	if len(cfg.TrustedProxies) > 0 {
		if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
			log.Fatalf("invalid TRUSTED_PROXIES: %v", err)
		}
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	authH := &handlers.AuthHandler{DB: db, JWTSecret: cfg.JWTSecret, Email: emailSvc, FrontendURL: cfg.FrontendURL}
	recruiterH := &handlers.RecruiterHandler{DB: db, Email: emailSvc, JWTSecret: cfg.JWTSecret, Store: store, FrontendURL: cfg.FrontendURL}
	guestH := &handlers.GuestHandler{DB: db, Store: store, Email: emailSvc, JWTSecret: cfg.JWTSecret, FrontendURL: cfg.FrontendURL}
	jobsH := &handlers.JobsHandler{DB: db, Store: store, Email: emailSvc, FrontendURL: cfg.FrontendURL}
	appsH := &handlers.ApplicationsHandler{DB: db}
	cvH := &handlers.CVHandler{DB: db, Store: store, AI: aiProvider}
	matchH := &handlers.MatchHandler{DB: db, Store: store, Fast: aiProvider, Strong: strongAI}
	dashH := &handlers.DashboardHandler{DB: db}
	adminH := &handlers.AdminHandler{DB: db, Email: emailSvc}
	settingsH := &handlers.SettingsHandler{DB: db}

	api := r.Group("/api")
	{
		// Unauthenticated endpoints that cost something (password hashing,
		// outgoing email) or guard credentials get a tight per-IP budget.
		authLimit := ratelimit.New(10, time.Minute).Middleware()
		api.POST("/auth/signup", authLimit, authH.Signup)
		api.POST("/auth/signin", authLimit, authH.Signin)
		api.POST("/auth/forgot-password", authLimit, authH.ForgotPassword)
		api.POST("/auth/reset-password", authLimit, authH.ResetPassword)
		api.POST("/recruiter/auth/signup", authLimit, recruiterH.Signup)
		api.GET("/meta/keywords", handlers.Keywords)

		// Public job pages: no login, so candidates (and search engines) can
		// open a job from its shared URL.
		publicLimit := ratelimit.New(120, time.Minute).Middleware()
		api.GET("/public/jobs", publicLimit, jobsH.PublicIndex)
		api.GET("/public/jobs/:slug", publicLimit, jobsH.PublicGet)

		// Applying without an account: held until the applicant confirms
		// their email. Tight limits — each call stores a file and sends mail.
		guestLimit := ratelimit.New(5, time.Minute).Middleware()
		api.POST("/public/jobs/:slug/apply", guestLimit, guestH.Apply)
		api.POST("/public/applications/confirm", authLimit, guestH.Confirm)
		api.POST("/public/recruiter/verify", authLimit, recruiterH.ConfirmVerification)

		admin := api.Group("/admin")
		admin.Use(auth.RequireAdmin(cfg.AdminToken))
		{
			admin.POST("/jobs/sync", adminH.SyncJobs)
			admin.POST("/email/marketing", adminH.SendMarketingEmail)
			admin.GET("/recruiters/pending", adminH.PendingRecruiters)
			admin.POST("/recruiters/:userId/verify", adminH.VerifyRecruiter)
		}

		protected := api.Group("")
		protected.Use(auth.RequireAuth(cfg.JWTSecret))
		{
			protected.GET("/auth/me", authH.Me)
			protected.PATCH("/auth/me", authH.UpdateAccount)
			protected.PUT("/auth/password", authH.UpdatePassword)

			protected.GET("/settings", settingsH.Get)
			protected.PUT("/settings", settingsH.Update)

			protected.GET("/jobs", jobsH.List)
			protected.POST("/jobs/:id/apply", jobsH.Apply)
			protected.POST("/jobs/:id/match", matchH.Match)
			protected.POST("/jobs/:id/tailor", matchH.Tailor)
			protected.GET("/jobs/:id/tailored", matchH.GetTailored)
			protected.POST("/jobs/:id/save", jobsH.Save)
			protected.DELETE("/jobs/:id/save", jobsH.Unsave)

			protected.GET("/applications", appsH.List)
			protected.POST("/applications", appsH.Create)
			protected.PATCH("/applications/:id", appsH.Update)
			protected.DELETE("/applications/:id", appsH.Delete)

			protected.GET("/cv", cvH.Get)
			protected.PUT("/cv", cvH.Update)
			protected.POST("/cv/analyze", cvH.Analyze)
			protected.PUT("/cv/content", cvH.ReplaceContent)
			protected.POST("/cv/upload", cvH.Upload)
			protected.GET("/cv/file", cvH.DownloadFile)
			protected.DELETE("/cv/file", cvH.DeleteFile)
			protected.POST("/cv/experiences", cvH.AddExperience)
			protected.DELETE("/cv/experiences/:expID", cvH.DeleteExperience)

			protected.GET("/dashboard/summary", dashH.Summary)
			protected.GET("/analytics/summary", dashH.Analytics)
		}

		recruiterProtected := api.Group("/recruiter")
		recruiterProtected.Use(auth.RequireAuth(cfg.JWTSecret), auth.RequireRecruiter())
		{
			recruiterProtected.GET("/profile", recruiterH.GetProfile)
			recruiterProtected.PUT("/profile", recruiterH.UpdateProfile)
			recruiterProtected.GET("/jobs", recruiterH.ListJobs)
			recruiterProtected.POST("/jobs", recruiterH.CreateJob)
			recruiterProtected.PATCH("/jobs/:id", recruiterH.UpdateJob)
			recruiterProtected.GET("/jobs/:id/applicants", recruiterH.ListApplicants)
			recruiterProtected.GET("/applications/:id", recruiterH.GetApplicant)
			recruiterProtected.GET("/applications/:id/cv-file", recruiterH.DownloadApplicantCV)
			recruiterProtected.PATCH("/applications/:id", recruiterH.UpdateApplicantStage)
			recruiterProtected.POST("/verification/request", recruiterH.RequestVerification)
		}
	}

	return r
}
