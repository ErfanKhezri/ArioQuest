package auth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"arioquest/backend/internal/platform/database"
	"arioquest/backend/internal/platform/httpx"
)

// testClock is a clock that only moves when a test moves it.
type testClock struct {
	current time.Time
}

func (clock *testClock) now() time.Time { return clock.current }

func (clock *testClock) advance(duration time.Duration) {
	clock.current = clock.current.Add(duration)
}

// newTestService returns a service backed by a fresh database file, and the
// clock it uses.
func newTestService(t *testing.T) (*Service, *testClock) {
	t.Helper()

	sqlDatabase, err := database.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqlDatabase.Close() })

	clock := &testClock{current: time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)}

	service := NewService(NewSQLiteRepository(sqlDatabase))
	service.now = clock.now
	service.passwordHashCost = bcrypt.MinCost // the default cost makes every test slow
	return service, clock
}

// testClient calls the auth routes over HTTP, the way the app does.
type testClient struct {
	t      *testing.T
	router *http.ServeMux
}

func newTestClient(t *testing.T) *testClient {
	service, _ := newTestService(t)

	router := http.NewServeMux()
	NewHandler(service).Register(router)
	return &testClient{t: t, router: router}
}

func (client *testClient) signUp(name string, email string, password string) testResponse {
	body := signUpRequest{Name: name, Email: email, Password: password}
	return client.send(http.MethodPost, "/auth/sign-up", "", body)
}

func (client *testClient) signIn(email string, password string) testResponse {
	body := signInRequest{Email: email, Password: password}
	return client.send(http.MethodPost, "/auth/sign-in", "", body)
}

func (client *testClient) signOut(token string) testResponse {
	return client.send(http.MethodPost, "/auth/sign-out", token, nil)
}

func (client *testClient) me(token string) testResponse {
	return client.send(http.MethodGet, "/me", token, nil)
}

// mustSignUp creates an account and stops the test if that fails.
func (client *testClient) mustSignUp(name string, email string, password string) sessionResponse {
	client.t.Helper()

	response := client.signUp(name, email, password)
	response.expectStatus(http.StatusCreated)

	var session sessionResponse
	response.decodeInto(&session)
	return session
}

// send makes one request. token may be "" for routes that need no sign-in,
// and body may be nil for requests without a body.
func (client *testClient) send(method string, path string, token string, body any) testResponse {
	client.t.Helper()

	var requestBody bytes.Buffer
	if body != nil {
		err := json.NewEncoder(&requestBody).Encode(body)
		if err != nil {
			client.t.Fatal(err)
		}
	}

	request := httptest.NewRequest(method, path, &requestBody)
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}

	recorder := httptest.NewRecorder()
	client.router.ServeHTTP(recorder, request)

	return testResponse{t: client.t, status: recorder.Code, body: recorder.Body.Bytes()}
}

type testResponse struct {
	t      *testing.T
	status int
	body   []byte
}

func (response testResponse) expectStatus(want int) {
	response.t.Helper()
	if response.status != want {
		response.t.Fatalf("status = %d, want %d (body: %s)", response.status, want, response.body)
	}
}

// expectError checks the status, the error code, and which form field the
// error belongs to ("" for an error that belongs to no field).
func (response testResponse) expectError(wantStatus int, wantCode string, wantField string) {
	response.t.Helper()
	response.expectStatus(wantStatus)

	var errorBody httpx.ErrorBody
	response.decodeInto(&errorBody)
	if errorBody.Code != wantCode {
		response.t.Fatalf("error code = %q, want %q (error: %q)", errorBody.Code, wantCode, errorBody.Error)
	}
	if errorBody.Field != wantField {
		response.t.Fatalf("error field = %q, want %q (error: %q)", errorBody.Field, wantField, errorBody.Error)
	}
}

// decodeInto reads the JSON body into destination, which must be a pointer.
func (response testResponse) decodeInto(destination any) {
	response.t.Helper()
	err := json.Unmarshal(response.body, destination)
	if err != nil {
		response.t.Fatalf("decode body: %v (body: %s)", err, response.body)
	}
}
