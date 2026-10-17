package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORSAllowsKnownOrigin(t *testing.T) {
	recorder := sendPreflight("http://localhost:1420")

	if recorder.Code != http.StatusNoContent {
		t.Errorf("status = %d, want %d", recorder.Code, http.StatusNoContent)
	}
	allowedOrigin := recorder.Header().Get("Access-Control-Allow-Origin")
	if allowedOrigin != "http://localhost:1420" {
		t.Errorf("Access-Control-Allow-Origin = %q", allowedOrigin)
	}
}

func TestCORSRejectsUnknownOrigin(t *testing.T) {
	recorder := sendPreflight("https://evil.example")

	allowedOrigin := recorder.Header().Get("Access-Control-Allow-Origin")
	if allowedOrigin != "" {
		t.Errorf("Access-Control-Allow-Origin = %q, want none", allowedOrigin)
	}
}

// sendPreflight sends the OPTIONS request a browser sends before a cross-origin call.
func sendPreflight(origin string) *httptest.ResponseRecorder {
	handler := CORS([]string{"http://localhost:1420"}, http.NotFoundHandler())

	request := httptest.NewRequest(http.MethodOptions, "/auth/sign-in", nil)
	request.Header.Set("Origin", origin)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	return recorder
}
