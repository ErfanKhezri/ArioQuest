package auth

import (
	"net/http"
	"testing"
)

// These tests check the HTTP side the app relies on: status codes, JSON
// shapes and error fields. The rules themselves are tested in service_test.go.

func TestSignUpReturnsSession(t *testing.T) {
	client := newTestClient(t)

	response := client.signUp("Erfan", "erfan@example.com", "secret123")

	response.expectStatus(http.StatusCreated)
	var session sessionResponse
	response.decodeInto(&session)
	if session.Name != "Erfan" || session.Email != "erfan@example.com" {
		t.Errorf("user = %q <%s>", session.Name, session.Email)
	}
	if session.Token == "" {
		t.Error("token is empty")
	}
}

func TestSignUpDuplicateEmail(t *testing.T) {
	client := newTestClient(t)
	client.mustSignUp("A", "a@b.co", "secret123")

	response := client.signUp("A", "A@B.CO", "secret123")

	response.expectError(http.StatusConflict, "email_taken", "email")
}

func TestSignUpInvalidInput(t *testing.T) {
	client := newTestClient(t)

	response := client.signUp("A", "a@b.co", "short")

	response.expectError(http.StatusBadRequest, "password_too_short", "password")
}

func TestSignUpInvalidJSON(t *testing.T) {
	client := newTestClient(t)

	// A JSON string where a JSON object is expected.
	response := client.send(http.MethodPost, "/auth/sign-up", "", "not an object")

	response.expectError(http.StatusBadRequest, "invalid_json", "")
}

func TestSignInWithCorrectPassword(t *testing.T) {
	client := newTestClient(t)
	client.mustSignUp("A", "a@b.co", "secret123")

	response := client.signIn("a@b.co", "secret123")

	response.expectStatus(http.StatusOK)
}

func TestSignInWithWrongPasswordReturns401(t *testing.T) {
	client := newTestClient(t)
	client.mustSignUp("A", "a@b.co", "secret123")

	response := client.signIn("a@b.co", "wrong-password")

	response.expectError(http.StatusUnauthorized, "invalid_credentials", "password")
}

func TestMeReturnsSignedInUser(t *testing.T) {
	client := newTestClient(t)
	session := client.mustSignUp("Erfan", "erfan@example.com", "secret123")

	response := client.me(session.Token)

	response.expectStatus(http.StatusOK)
	var user userResponse
	response.decodeInto(&user)
	if user.Email != "erfan@example.com" {
		t.Errorf("email = %q, want %q", user.Email, "erfan@example.com")
	}
}

func TestMeWithoutTokenReturns401(t *testing.T) {
	client := newTestClient(t)

	response := client.me("")

	response.expectError(http.StatusUnauthorized, "unauthenticated", "")
}

func TestMeWithUnknownTokenReturns401(t *testing.T) {
	client := newTestClient(t)

	response := client.me("made-up-token")

	response.expectError(http.StatusUnauthorized, "unauthenticated", "")
}

func TestSignOutEndsSessionOverHTTP(t *testing.T) {
	client := newTestClient(t)
	session := client.mustSignUp("A", "a@b.co", "secret123")

	client.signOut(session.Token).expectStatus(http.StatusNoContent)

	client.me(session.Token).expectError(http.StatusUnauthorized, "unauthenticated", "")
}
