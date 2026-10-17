package auth

import (
	"context"
	"errors"
	"testing"
)

// These tests check the rules of the service directly, without HTTP.

func TestSignUpValidation(t *testing.T) {
	service, _ := newTestService(t)

	testCases := []struct {
		description string
		input       SignUpInput
		wantField   string
	}{
		{
			description: "empty name",
			input:       SignUpInput{Name: "  ", Email: "a@b.co", Password: "secret123"},
			wantField:   "name",
		},
		{
			description: "no @ in email",
			input:       SignUpInput{Name: "A", Email: "not-an-email", Password: "secret123"},
			wantField:   "email",
		},
		{
			description: "no dot in email domain",
			input:       SignUpInput{Name: "A", Email: "a@localhost", Password: "secret123"},
			wantField:   "email",
		},
		{
			description: "short password",
			input:       SignUpInput{Name: "A", Email: "a@b.co", Password: "short"},
			wantField:   "password",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			_, err := service.SignUp(context.Background(), testCase.input)

			var fieldError *FieldError
			if !errors.As(err, &fieldError) {
				t.Fatalf("err = %v, want a FieldError", err)
			}
			if fieldError.Field != testCase.wantField {
				t.Fatalf("field = %q, want %q", fieldError.Field, testCase.wantField)
			}
		})
	}
}

func TestSignUpTrimsNameAndNormalizesEmail(t *testing.T) {
	service, _ := newTestService(t)
	input := SignUpInput{Name: " Erfan ", Email: " Erfan@Example.COM ", Password: "secret123"}

	session, err := service.SignUp(context.Background(), input)

	if err != nil {
		t.Fatal(err)
	}
	if session.User.Name != "Erfan" {
		t.Errorf("name = %q, want %q", session.User.Name, "Erfan")
	}
	if session.User.Email != "erfan@example.com" {
		t.Errorf("email = %q, want %q", session.User.Email, "erfan@example.com")
	}
}

func TestSignUpRejectsSameEmailInDifferentCase(t *testing.T) {
	service, _ := newTestService(t)
	signUpForTest(t, service, "a@b.co")

	input := SignUpInput{Name: "A", Email: "A@B.CO", Password: "secret123"}
	_, err := service.SignUp(context.Background(), input)

	if !errors.Is(err, ErrEmailTaken) {
		t.Fatalf("err = %v, want ErrEmailTaken", err)
	}
}

func TestSignInWithWrongPassword(t *testing.T) {
	service, _ := newTestService(t)
	signUpForTest(t, service, "a@b.co")

	input := SignInInput{Email: "a@b.co", Password: "wrong-password"}
	_, err := service.SignIn(context.Background(), input)

	if !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("err = %v, want ErrInvalidCredentials", err)
	}
}

func TestSignInWithUnknownEmail(t *testing.T) {
	service, _ := newTestService(t)

	input := SignInInput{Email: "nobody@b.co", Password: "secret123"}
	_, err := service.SignIn(context.Background(), input)

	if !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("err = %v, want ErrInvalidCredentials", err)
	}
}

func TestSessionExpiresAfterSessionDuration(t *testing.T) {
	service, clock := newTestService(t)
	session := signUpForTest(t, service, "a@b.co")

	clock.advance(sessionDuration - 1)
	_, err := service.Authenticate(context.Background(), session.Token)
	if err != nil {
		t.Fatalf("one moment before expiry: err = %v, want none", err)
	}

	clock.advance(1)
	_, err = service.Authenticate(context.Background(), session.Token)
	if !errors.Is(err, ErrUnauthenticated) {
		t.Fatalf("at expiry: err = %v, want ErrUnauthenticated", err)
	}
}

func TestSignOutEndsSession(t *testing.T) {
	service, _ := newTestService(t)
	session := signUpForTest(t, service, "a@b.co")

	err := service.SignOut(context.Background(), session.Token)
	if err != nil {
		t.Fatal(err)
	}

	_, err = service.Authenticate(context.Background(), session.Token)
	if !errors.Is(err, ErrUnauthenticated) {
		t.Fatalf("err = %v, want ErrUnauthenticated", err)
	}
}

// signUpForTest creates an account with password "secret123" and stops the
// test if that fails.
func signUpForTest(t *testing.T, service *Service, email string) Session {
	t.Helper()

	input := SignUpInput{Name: "A", Email: email, Password: "secret123"}
	session, err := service.SignUp(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	return session
}
