package jobsync

import (
	"log"
	"time"

	"gorm.io/gorm"
)

// StartTicker runs Sync on a fixed interval for as long as the process is
// alive. It's fire-and-forget: sync failures are logged, not fatal — a
// flaky upstream feed shouldn't take the API down.
func StartTicker(db *gorm.DB, interval time.Duration) {
	if interval <= 0 {
		return
	}
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			result, err := Sync(db)
			if err != nil {
				log.Printf("job sync failed: %v", err)
				continue
			}
			log.Printf("job sync: fetched=%d created=%d updated=%d deactivated=%d pruned=%d",
				result.Fetched, result.Created, result.Updated, result.Deactivated, result.Pruned)
		}
	}()
}
