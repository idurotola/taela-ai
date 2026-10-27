package ratelimit

import (
	"testing"
	"time"
)

func TestLimiterBlocksOverLimitAndResetsAfterWindow(t *testing.T) {
	l := &Limiter{limit: 2, window: time.Minute, clients: map[string]*entry{}}
	now := time.Now()

	for i := 0; i < 2; i++ {
		if ok, _ := l.allow("1.1.1.1", now); !ok {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	if ok, retry := l.allow("1.1.1.1", now); ok || retry <= 0 {
		t.Fatalf("third request should be blocked with a retry delay, got ok=%v retry=%v", ok, retry)
	}
	if ok, _ := l.allow("2.2.2.2", now); !ok {
		t.Fatal("a different client must have its own budget")
	}
	if ok, _ := l.allow("1.1.1.1", now.Add(time.Minute+time.Second)); !ok {
		t.Fatal("budget should reset after the window")
	}
}
