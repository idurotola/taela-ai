package config

import (
	"strings"
	"testing"
)

func TestValidate(t *testing.T) {
	strong := strings.Repeat("x", 40)

	if err := (Config{Production: false, JWTSecret: devJWTSecret, AdminToken: devAdminToken}).Validate(); err != nil {
		t.Fatalf("dev config with default secrets should be allowed: %v", err)
	}
	if err := (Config{Production: true, JWTSecret: devJWTSecret, AdminToken: strong}).Validate(); err == nil {
		t.Fatal("production must reject the default JWT secret")
	}
	if err := (Config{Production: true, JWTSecret: strong, AdminToken: "short"}).Validate(); err == nil {
		t.Fatal("production must reject a short admin token")
	}
	if err := (Config{Production: true, JWTSecret: strong, AdminToken: strong}).Validate(); err != nil {
		t.Fatalf("strong secrets should pass: %v", err)
	}
}
