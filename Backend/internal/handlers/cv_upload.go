package handlers

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"

	"taela-ai-backend/internal/ai"
	"taela-ai-backend/internal/auth"
	"taela-ai-backend/internal/cvparse"
	"taela-ai-backend/internal/dto"
	"taela-ai-backend/internal/models"
	"taela-ai-backend/internal/storage"
)

// maxParsesPerDay bounds AI spend per user.
const maxParsesPerDay = 5

// readUpload reads the "file" form field with a hard size cap and checks the
// bytes really are a PDF or DOCX (never trusting the name or MIME type the
// client sent).
func readUpload(c *gin.Context, field string) (data []byte, name string, kind cvparse.Kind, status int, err error) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, cvparse.MaxFileBytes+(1<<20)) // + form overhead
	fh, err := c.FormFile(field)
	if err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			return nil, "", "", http.StatusRequestEntityTooLarge, errors.New("file is too large (5 MB maximum)")
		}
		return nil, "", "", http.StatusBadRequest, errors.New("attach your CV as a PDF or DOCX file")
	}
	if fh.Size > cvparse.MaxFileBytes {
		return nil, "", "", http.StatusRequestEntityTooLarge, errors.New("file is too large (5 MB maximum)")
	}
	f, err := fh.Open()
	if err != nil {
		return nil, "", "", http.StatusBadRequest, errors.New("could not read the uploaded file")
	}
	defer f.Close()
	data, err = io.ReadAll(io.LimitReader(f, cvparse.MaxFileBytes+1))
	if err != nil || len(data) > cvparse.MaxFileBytes {
		return nil, "", "", http.StatusRequestEntityTooLarge, errors.New("file is too large (5 MB maximum)")
	}
	kind, err = cvparse.Detect(data)
	if err != nil {
		return nil, "", "", http.StatusUnsupportedMediaType, err
	}
	return data, safeFileName(fh.Filename, kind), kind, 0, nil
}

// safeFileName keeps a recognisable display name without any path parts or
// odd characters (it ends up in Content-Disposition and the database).
func safeFileName(raw string, kind cvparse.Kind) string {
	base := filepath.Base(strings.ReplaceAll(raw, "\\", "/"))
	base = strings.TrimSuffix(base, filepath.Ext(base))
	var sb strings.Builder
	for _, r := range base {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_', r == ' ', r == '.':
			sb.WriteRune(r)
		}
	}
	name := strings.TrimSpace(sb.String())
	if name == "" {
		name = "CV"
	}
	if len(name) > 80 {
		name = name[:80]
	}
	return name + "." + string(kind)
}

type uploadResponse struct {
	CV     dto.CVDTO       `json:"cv"`
	Parsed *cvparse.Parsed `json:"parsed"`
	// ParseNote explains why Parsed is null (no AI configured, quota, a
	// scanned file, a model error) so the UI can fall back to manual entry.
	ParseNote string `json:"parseNote,omitempty"`
}

// Upload stores the original file and, when an AI provider is configured,
// extracts structured content from it. The extracted content is only
// *returned* — the user reviews and edits it, then saves it with
// PUT /cv/content — so a bad parse never silently overwrites their CV.
func (h *CVHandler) Upload(c *gin.Context) {
	if h.Store == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "CV upload isn't available right now"})
		return
	}
	userID := auth.UserID(c)
	cv, err := h.getOrCreate(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load cv"})
		return
	}

	data, name, kind, status, err := readUpload(c, "file")
	if err != nil {
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	key := fmt.Sprintf("cv/%s/%s.%s", userID, uuid.NewString(), kind)
	if err := h.Store.Put(c.Request.Context(), key, bytes.NewReader(data), int64(len(data)), cvparse.ContentType(kind)); err != nil {
		log.Printf("cv upload: store put failed: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "could not store your file, please try again"})
		return
	}
	oldKey := cv.SourceFileKey
	cv.SourceFileKey, cv.SourceFileName, cv.SourceFileSize = key, name, int64(len(data))

	resp := uploadResponse{}
	text, textErr := cvparse.ExtractText(data, kind)
	switch {
	case textErr != nil:
		resp.ParseNote = textErr.Error()
	default:
		resp.Parsed, resp.ParseNote = h.parse(c, cv, text)
	}

	if err := h.DB.Omit("Experiences", "ATSChecks", "Education").Save(cv).Error; err != nil {
		_ = h.Store.Delete(c.Request.Context(), key)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save upload"})
		return
	}
	if oldKey != "" {
		_ = h.Store.Delete(c.Request.Context(), oldKey)
	}
	resp.CV = dto.FromCV(*cv)
	c.JSON(http.StatusOK, resp)
}

// parse runs the AI extraction under the per-user daily quota, returning
// either the result or a human-readable reason there isn't one.
func (h *CVHandler) parse(c *gin.Context, cv *models.CV, text string) (*cvparse.Parsed, string) {
	if _, off := h.AI.(ai.Disabled); off || h.AI == nil {
		return nil, "Automatic reading isn't enabled yet — fill in your details below."
	}
	today := time.Now().UTC().Format("2006-01-02")
	if cv.ParsesDate != today {
		cv.ParsesDate, cv.ParsesToday = today, 0
	}
	if cv.ParsesToday >= maxParsesPerDay {
		return nil, "You've reached today's limit for automatic reading. Your file is saved — fill in the details by hand or try again tomorrow."
	}
	cv.ParsesToday++

	parsed, err := cvparse.Parse(c.Request.Context(), h.AI, text)
	if err != nil {
		log.Printf("cv parse failed for %s: %v", cv.UserID, err)
		return nil, "We couldn't read this file automatically. Your file is saved — fill in the details by hand."
	}
	return parsed, ""
}

// ReplaceContent saves the whole structured CV (profile fields, skills,
// experience and education) in one transaction. It backs both manual editing
// and "accept what was read from my upload".
func (h *CVHandler) ReplaceContent(c *gin.Context) {
	var req cvparse.Parsed
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.Sanitize()

	cv, err := h.getOrCreate(auth.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load cv"})
		return
	}

	err = h.DB.Transaction(func(tx *gorm.DB) error {
		cv.FullName, cv.JobTitle, cv.Email = req.FullName, req.JobTitle, req.Email
		cv.Phone, cv.Location, cv.LinkedIn, cv.Summary = req.Phone, req.Location, req.LinkedIn, req.Summary
		cv.Skills = pq.StringArray(req.Skills)
		if err := tx.Omit("Experiences", "ATSChecks", "Education").Save(cv).Error; err != nil {
			return err
		}
		if err := tx.Where("cv_id = ?", cv.ID).Delete(&models.CVExperience{}).Error; err != nil {
			return err
		}
		if err := tx.Where("cv_id = ?", cv.ID).Delete(&models.CVEducation{}).Error; err != nil {
			return err
		}
		for i, e := range req.Experiences {
			if err := tx.Create(&models.CVExperience{CVID: cv.ID, Role: e.Role, Company: e.Company, Dates: e.Dates, Bullets: pq.StringArray(e.Bullets), Sort: i}).Error; err != nil {
				return err
			}
		}
		for i, e := range req.Education {
			if err := tx.Create(&models.CVEducation{CVID: cv.ID, School: e.School, Degree: e.Degree, Dates: e.Dates, Sort: i}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save cv"})
		return
	}

	fresh, err := h.getOrCreate(auth.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load cv"})
		return
	}
	logActivity(h.DB, auth.UserID(c), "cv", "CV updated", "")
	c.JSON(http.StatusOK, dto.FromCV(*fresh))
}

// DownloadFile streams the user's own uploaded original.
func (h *CVHandler) DownloadFile(c *gin.Context) {
	cv, err := h.getOrCreate(auth.UserID(c))
	if err != nil || cv.SourceFileKey == "" || h.Store == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no uploaded file"})
		return
	}
	streamFile(c, h.Store, cv.SourceFileKey, cv.SourceFileName)
}

// DeleteFile removes the uploaded original; the structured CV is kept.
func (h *CVHandler) DeleteFile(c *gin.Context) {
	cv, err := h.getOrCreate(auth.UserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load cv"})
		return
	}
	if cv.SourceFileKey != "" && h.Store != nil {
		if err := h.Store.Delete(c.Request.Context(), cv.SourceFileKey); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "could not delete the file, please try again"})
			return
		}
	}
	cv.SourceFileKey, cv.SourceFileName, cv.SourceFileSize = "", "", 0
	if err := h.DB.Omit("Experiences", "ATSChecks", "Education").Save(cv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update cv"})
		return
	}
	c.Status(http.StatusNoContent)
}

// streamFile writes a stored CV to the response as a download. The type is
// derived from the stored name's extension, which we set ourselves from the
// detected content kind.
func streamFile(c *gin.Context, store storage.Store, key, name string) {
	rc, err := store.Get(c.Request.Context(), key)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
			return
		}
		c.JSON(http.StatusBadGateway, gin.H{"error": "could not read the file"})
		return
	}
	defer rc.Close()

	ct := cvparse.ContentType(cvparse.KindDOCX)
	if strings.HasSuffix(strings.ToLower(name), ".pdf") {
		ct = cvparse.ContentType(cvparse.KindPDF)
	}
	c.Header("Content-Type", ct)
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, name))
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, rc)
}
