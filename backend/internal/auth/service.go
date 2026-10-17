package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const sessionDuration = 30 * 24 * time.Hour

// dummyPasswordHash is checked when the email does not exist, so a wrong email
// takes as long as a wrong password and does not reveal which emails have accounts.
var dummyPasswordHash, _ = bcrypt.GenerateFromPassword([]byte("not-a-real-password"), bcrypt.DefaultCost)

type Service struct {
	repository Repository
	// now returns the current time. Tests replace it to move time forward.
	now func() time.Time
	// passwordHashCost is how slow bcrypt is. Slower is safer; tests lower it.
	passwordHashCost int
}

func NewService(repository Repository) *Service {
	return &Service{
		repository:       repository,
		now:              time.Now,
		passwordHashCost: bcrypt.DefaultCost,
	}
}

// SignUp creates an account and signs it in. It returns a *FieldError for
// invalid input and ErrEmailTaken when the email already has an account.
func (service *Service) SignUp(ctx context.Context, input SignUpInput) (Session, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Email = normalizeEmail(input.Email)

	err := validateSignUp(input)
	if err != nil {
		return Session{}, err
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), service.passwordHashCost)
	if err != nil {
		return Session{}, err
	}

	newUser := User{
		Name:         input.Name,
		Email:        input.Email,
		PasswordHash: string(passwordHash),
		CreatedAt:    service.now(),
	}
	user, err := service.repository.CreateUser(ctx, newUser)
	if err != nil {
		return Session{}, err
	}

	return service.startSession(ctx, user)
}

// SignIn returns ErrInvalidCredentials for an unknown email or a wrong password.
func (service *Service) SignIn(ctx context.Context, input SignInInput) (Session, error) {
	email := normalizeEmail(input.Email)

	user, err := service.repository.FindUserByEmail(ctx, email)
	if errors.Is(err, errNotFound) {
		// Spend the same time as a real check, then fail.
		bcrypt.CompareHashAndPassword(dummyPasswordHash, []byte(input.Password))
		return Session{}, ErrInvalidCredentials
	}
	if err != nil {
		return Session{}, err
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password))
	if err != nil {
		return Session{}, ErrInvalidCredentials
	}

	return service.startSession(ctx, user)
}

// SignOut ends the session of token. An unknown token is not an error.
func (service *Service) SignOut(ctx context.Context, token string) error {
	return service.repository.DeleteSession(ctx, hashToken(token))
}

// Authenticate returns the user a token belongs to, or ErrUnauthenticated.
func (service *Service) Authenticate(ctx context.Context, token string) (User, error) {
	if token == "" {
		return User{}, ErrUnauthenticated
	}

	user, err := service.repository.FindUserBySession(ctx, hashToken(token), service.now())
	if errors.Is(err, errNotFound) {
		return User{}, ErrUnauthenticated
	}
	if err != nil {
		return User{}, err
	}
	return user, nil
}

// startSession creates a random token and stores only its hash, so whoever reads
// the database still cannot use it to sign in.
func (service *Service) startSession(ctx context.Context, user User) (Session, error) {
	token := rand.Text()
	expiresAt := service.now().Add(sessionDuration)

	err := service.repository.CreateSession(ctx, hashToken(token), user.ID, expiresAt)
	if err != nil {
		return Session{}, err
	}
	return Session{User: user, Token: token}, nil
}

// hashToken returns the SHA-256 of token as hex text.
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
