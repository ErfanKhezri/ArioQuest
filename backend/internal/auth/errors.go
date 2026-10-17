package auth

import "errors"

var (
	ErrEmailTaken         = errors.New("email already registered")
	ErrInvalidCredentials = errors.New("wrong email or password")
	// ErrUnauthenticated means the token is missing, unknown or expired.
	ErrUnauthenticated = errors.New("not signed in")
	// errNotFound is what the repository returns when a row does not exist.
	errNotFound = errors.New("not found")
)

// FieldError is a validation error that belongs to one input field, so the app
// can show Message right under that field.
type FieldError struct {
	Field   string
	Message string
}

func (e *FieldError) Error() string { return e.Field + ": " + e.Message }
