// Package storage holds uploaded files (CVs). Handlers depend on the small
// Store interface, so the backend can be local disk in development and
// Cloudflare R2 (or any S3-compatible bucket) in production without any
// caller changing.
package storage

import (
	"context"
	"errors"
	"io"
)

// ErrNotFound is returned by Get when no object exists for the key.
var ErrNotFound = errors.New("storage: object not found")

type Store interface {
	Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error
	// Get returns the object's bytes; the caller closes the reader.
	Get(ctx context.Context, key string) (io.ReadCloser, error)
	// Delete is idempotent: deleting a missing key is not an error.
	Delete(ctx context.Context, key string) error
}
