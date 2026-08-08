package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
)

type ContactsHandler struct {
	DB *gorm.DB
}

func (h *ContactsHandler) List(c *gin.Context) {
	userID := auth.UserID(c)

	var contacts []models.Contact
	h.DB.Find(&contacts)

	var connections []models.Connection
	h.DB.Where("user_id = ?", userID).Find(&connections)
	connected := map[string]bool{}
	for _, conn := range connections {
		connected[conn.ContactID] = true
	}

	result := make([]dto.ContactDTO, 0, len(contacts))
	for _, ct := range contacts {
		result = append(result, dto.FromContact(ct, connected[ct.ID]))
	}
	c.JSON(http.StatusOK, result)
}

func (h *ContactsHandler) Connect(c *gin.Context) {
	userID := auth.UserID(c)
	contactID := c.Param("id")

	var contact models.Contact
	if err := h.DB.First(&contact, "id = ?", contactID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contact not found"})
		return
	}

	var existing models.Connection
	if err := h.DB.Where("user_id = ? AND contact_id = ?", userID, contactID).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, dto.FromContact(contact, true))
		return
	}

	conn := models.Connection{UserID: userID, ContactID: contactID, Status: "requested"}
	if err := h.DB.Create(&conn).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send request"})
		return
	}

	logActivity(h.DB, userID, "network", "Referral request sent to "+contact.Name, "at "+contact.Company)

	c.JSON(http.StatusCreated, dto.FromContact(contact, true))
}
