// Package httpx holds the HTTP helpers every feature shares: JSON bodies, errors and CORS.
package httpx

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

// ErrorBody is the body of every error response. Field names the form field
// the app shows the message under ("name", "email" or "password").
type ErrorBody struct {
	Error string `json:"error"`
	Field string `json:"field,omitempty"`
}

// WriteJSON sends body as JSON with the given status code.
func WriteJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	err := json.NewEncoder(w).Encode(body)
	if err != nil {
		slog.Error("write response", "err", err)
	}
}

func WriteError(w http.ResponseWriter, status int, message string, field string) {
	WriteJSON(w, status, ErrorBody{Error: message, Field: field})
}

// WriteInternalError logs err and sends a generic 500, so internals never reach the client.
func WriteInternalError(w http.ResponseWriter, err error) {
	slog.Error("internal error", "err", err)
	WriteError(w, http.StatusInternalServerError, "Something went wrong. Try again.", "")
}

const maxBodySize = 1 << 20 // 1 MB

// ReadJSON decodes the request body into destination. When the body is not valid
// JSON it writes the error response itself and returns false.
func ReadJSON(w http.ResponseWriter, r *http.Request, destination any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)

	err := json.NewDecoder(r.Body).Decode(destination)
	if err == nil {
		return true
	}

	var tooLargeError *http.MaxBytesError
	if errors.As(err, &tooLargeError) {
		WriteError(w, http.StatusRequestEntityTooLarge, "Request body is too large.", "")
	} else {
		WriteError(w, http.StatusBadRequest, "Request body must be valid JSON.", "")
	}
	return false
}
