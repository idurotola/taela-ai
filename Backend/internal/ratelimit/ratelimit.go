// Package ratelimit is a small in-memory, per-client-IP fixed-window rate
// limiter for the unauthenticated endpoints (signin, signup, password
// reset) that are otherwise open to brute force and email spam.
//
// State lives in process memory, so with several API instances each enforces
// its own limit; move to a shared store (e.g. Redis) if the API is scaled out.
package ratelimit

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type entry struct {
	count   int
	resetAt time.Time
}

type Limiter struct {
	limit  int
	window time.Duration

	mu      sync.Mutex
	clients map[string]*entry
}

// New allows at most limit requests per client per window.
func New(limit int, window time.Duration) *Limiter {
	l := &Limiter{limit: limit, window: window, clients: map[string]*entry{}}
	go l.sweep()
	return l
}

func (l *Limiter) allow(key string, now time.Time) (ok bool, retryAfter time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	e, found := l.clients[key]
	if !found || !now.Before(e.resetAt) {
		l.clients[key] = &entry{count: 1, resetAt: now.Add(l.window)}
		return true, 0
	}
	if e.count >= l.limit {
		return false, e.resetAt.Sub(now)
	}
	e.count++
	return true, 0
}

// sweep drops expired entries so the map doesn't grow without bound.
func (l *Limiter) sweep() {
	t := time.NewTicker(l.window)
	defer t.Stop()
	for now := range t.C {
		l.mu.Lock()
		for k, e := range l.clients {
			if !now.Before(e.resetAt) {
				delete(l.clients, k)
			}
		}
		l.mu.Unlock()
	}
}

// Middleware rejects requests over the limit with 429 and a Retry-After header.
func (l *Limiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ok, retry := l.allow(c.ClientIP(), time.Now())
		if !ok {
			secs := int(retry.Seconds()) + 1
			c.Header("Retry-After", strconv.Itoa(secs))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests, please try again later"})
			return
		}
		c.Next()
	}
}
