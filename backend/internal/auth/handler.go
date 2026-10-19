package auth

import (
	"errors"
	"net/http"

	"arioquest/backend/internal/platform/httpx"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register adds the auth routes to router.
func (handler *Handler) Register(router *http.ServeMux) {
	router.HandleFunc("POST /auth/sign-up", handler.signUp)
	router.HandleFunc("POST /auth/sign-in", handler.signIn)
	router.HandleFunc("POST /auth/sign-out", handler.signOut)
	router.Handle("GET /me", handler.RequireUser(http.HandlerFunc(handler.me)))
}

// The request and response types below are the JSON the app sends and receives.

type signUpRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type signInRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// sessionResponse matches the app's `Session` type in src/lib/auth.ts.
type sessionResponse struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Token string `json:"token"`
}

type userResponse struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (handler *Handler) signUp(w http.ResponseWriter, r *http.Request) {
	var request signUpRequest
	if !httpx.ReadJSON(w, r, &request) {
		return
	}

	input := SignUpInput{
		Name:     request.Name,
		Email:    request.Email,
		Password: request.Password,
	}
	session, err := handler.service.SignUp(r.Context(), input)
	if err != nil {
		writeError(w, err)
		return
	}

	httpx.WriteJSON(w, http.StatusCreated, newSessionResponse(session))
}

func (handler *Handler) signIn(w http.ResponseWriter, r *http.Request) {
	var request signInRequest
	if !httpx.ReadJSON(w, r, &request) {
		return
	}

	input := SignInInput{
		Email:    request.Email,
		Password: request.Password,
	}
	session, err := handler.service.SignIn(r.Context(), input)
	if err != nil {
		writeError(w, err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, newSessionResponse(session))
}

func (handler *Handler) signOut(w http.ResponseWriter, r *http.Request) {
	err := handler.service.SignOut(r.Context(), readBearerToken(r))
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// me runs behind RequireUser, so the signed-in user is already in the context.
func (handler *Handler) me(w http.ResponseWriter, r *http.Request) {
	user := UserFromContext(r.Context())

	response := userResponse{Name: user.Name, Email: user.Email}
	httpx.WriteJSON(w, http.StatusOK, response)
}

func newSessionResponse(session Session) sessionResponse {
	return sessionResponse{
		Name:  session.User.Name,
		Email: session.User.Email,
		Token: session.Token,
	}
}

// writeError turns an error from the service into the matching HTTP response.
// This is the only place that decides which status code each error gets.
func writeError(w http.ResponseWriter, err error) {
	var fieldError *FieldError
	if errors.As(err, &fieldError) {
		httpx.WriteError(w, http.StatusBadRequest, fieldError.Code, fieldError.Message, fieldError.Field)
		return
	}

	if errors.Is(err, ErrEmailTaken) {
		httpx.WriteError(w, http.StatusConflict, "email_taken",
			"An account with this email already exists.", "email")
		return
	}

	if errors.Is(err, ErrInvalidCredentials) {
		httpx.WriteError(w, http.StatusUnauthorized, "invalid_credentials",
			"Wrong email or password.", "password")
		return
	}

	if errors.Is(err, ErrUnauthenticated) {
		httpx.WriteError(w, http.StatusUnauthorized, "unauthenticated",
			"Sign in to continue.", "")
		return
	}

	httpx.WriteInternalError(w, err)
}
