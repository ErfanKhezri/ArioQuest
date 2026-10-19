package auth

import (
	"net/mail"
	"strings"
	"unicode/utf8"
)

const (
	maxNameLength     = 100
	minPasswordLength = 8
	// bcrypt only looks at the first 72 bytes of a password.
	maxPasswordBytes = 72
)

// normalizeEmail trims and lowercases an email so "A@B.co " and "a@b.co" are one account.
func normalizeEmail(email string) string {
	email = strings.TrimSpace(email)
	return strings.ToLower(email)
}

// validateSignUp checks the input of a sign-up. Name and email must already be
// trimmed and normalized. It returns a *FieldError for the first problem it finds.
func validateSignUp(input SignUpInput) error {
	if input.Name == "" {
		return &FieldError{Field: "name", Code: "name_required", Message: "Enter your name."}
	}
	if utf8.RuneCountInString(input.Name) > maxNameLength {
		return &FieldError{Field: "name", Code: "name_too_long", Message: "Name is too long."}
	}
	if !isValidEmail(input.Email) {
		return &FieldError{Field: "email", Code: "email_invalid", Message: "Enter a valid email address."}
	}
	if utf8.RuneCountInString(input.Password) < minPasswordLength {
		return &FieldError{Field: "password", Code: "password_too_short", Message: "Password must be at least 8 characters."}
	}
	if len(input.Password) > maxPasswordBytes {
		return &FieldError{Field: "password", Code: "password_too_long", Message: "Password is too long."}
	}
	return nil
}

// isValidEmail accepts a plain address like "a@b.co": no display name, and a
// dot in the domain.
func isValidEmail(email string) bool {
	address, err := mail.ParseAddress(email)
	if err != nil {
		return false
	}
	// ParseAddress also accepts `Erfan <a@b.co>`; we only want the address itself.
	if address.Address != email {
		return false
	}

	_, domain, _ := strings.Cut(email, "@")
	return strings.Contains(domain, ".")
}
