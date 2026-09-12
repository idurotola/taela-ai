package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
)

type InsightsHandler struct {
	DB *gorm.DB
}

func (h *InsightsHandler) List(c *gin.Context) {
	var insights []models.MarketInsight
	h.DB.Order("sort asc").Find(&insights)

	result := make([]dto.MarketInsightDTO, 0, len(insights))
	for _, i := range insights {
		result = append(result, dto.FromInsight(i))
	}
	c.JSON(http.StatusOK, result)
}
