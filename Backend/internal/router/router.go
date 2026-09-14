package router

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/config"
	"taela-ai-backend/internal/handlers"
)

func New(db *gorm.DB, cfg config.Config) *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	authH := &handlers.AuthHandler{DB: db, JWTSecret: cfg.JWTSecret}
	jobsH := &handlers.JobsHandler{DB: db}
	appsH := &handlers.ApplicationsHandler{DB: db}
	contactsH := &handlers.ContactsHandler{DB: db}
	cvH := &handlers.CVHandler{DB: db}
	insightsH := &handlers.InsightsHandler{DB: db}
	dashH := &handlers.DashboardHandler{DB: db}
	adminH := &handlers.AdminHandler{DB: db}
	settingsH := &handlers.SettingsHandler{DB: db}

	api := r.Group("/api")
	{
		api.POST("/auth/signup", authH.Signup)
		api.POST("/auth/signin", authH.Signin)
		api.GET("/meta/keywords", handlers.Keywords)
		api.GET("/insights", insightsH.List)

		admin := api.Group("/admin")
		admin.Use(auth.RequireAdmin(cfg.AdminToken))
		{
			admin.POST("/jobs/sync", adminH.SyncJobs)
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

			protected.GET("/applications", appsH.List)
			protected.POST("/applications", appsH.Create)
			protected.PATCH("/applications/:id", appsH.Update)
			protected.DELETE("/applications/:id", appsH.Delete)

			protected.GET("/contacts", contactsH.List)
			protected.POST("/contacts/:id/connect", contactsH.Connect)

			protected.GET("/cv", cvH.Get)
			protected.PUT("/cv", cvH.Update)
			protected.POST("/cv/analyze", cvH.Analyze)
			protected.POST("/cv/experiences", cvH.AddExperience)
			protected.DELETE("/cv/experiences/:expID", cvH.DeleteExperience)

			protected.GET("/dashboard/summary", dashH.Summary)
			protected.GET("/analytics/summary", dashH.Analytics)
		}
	}

	return r
}
