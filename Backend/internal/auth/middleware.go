package auth

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const contextUserIDKey = "userID"

// RequireAuth validates the Bearer token on the request and stores the
// authenticated user's ID in the Gin context for handlers to read via UserID.
func RequireAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or invalid authorization header"})
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims, err := ParseToken(tokenStr, secret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set(contextUserIDKey, claims.UserID)
		c.Next()
	}
}

// UserID reads the authenticated user's ID set by RequireAuth.
func UserID(c *gin.Context) string {
	v, _ := c.Get(contextUserIDKey)
	id, _ := v.(string)
	return id
}

// RequireAdmin gates operational endpoints (e.g. triggering a job sync)
// behind a shared secret header, separate from ordinary user auth — there's
// no admin/user role model, just a token operators hold.
func RequireAdmin(token string) gin.HandlerFunc {
	return func(c *gin.Context) {
		got := c.GetHeader("X-Admin-Token")
		if got == "" || subtle.ConstantTimeCompare([]byte(got), []byte(token)) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid admin token"})
			return
		}
		c.Next()
	}
}
