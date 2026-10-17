// Package auth handles accounts: sign-up, sign-in, sign-out and finding the
// user behind a request.
//
// The package has three layers, each only talking to the one below it:
//
//	handler.go    HTTP: decodes requests, calls the service, writes responses
//	service.go    rules: validation, password hashing, sessions (knows nothing about HTTP)
//	repository.go storage: SQL queries (knows nothing about the rules)
package auth

import "time"

type User struct {
	ID           int64
	Name         string
	Email        string
	PasswordHash string
	CreatedAt    time.Time
}

type SignUpInput struct {
	Name     string
	Email    string
	Password string
}

type SignInInput struct {
	Email    string
	Password string
}

// Session is what a successful sign-up or sign-in returns: the user and the
// token the client sends back in the Authorization header.
type Session struct {
	User  User
	Token string
}
