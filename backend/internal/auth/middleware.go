package auth

import (
	"context"
	"net/http"
	"strings"
)

// userContextKey is the key RequireUser stores the user under in the request
// context. It is a private type, so no other package can overwrite the value.
type userContextKey struct{}

// RequireUser lets a request through only with a valid "Authorization: Bearer
// <token>" header, and puts the signed-in user in its context. Other features
// wrap their routes with it and read the user with UserFromContext.
func (handler *Handler) RequireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := handler.service.Authenticate(r.Context(), readBearerToken(r))
		if err != nil {
			writeError(w, err)
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey{}, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// UserFromContext returns the user RequireUser stored. Only call it inside a
// handler wrapped by RequireUser.
func UserFromContext(ctx context.Context) User {
	user, _ := ctx.Value(userContextKey{}).(User)
	return user
}

// readBearerToken returns the token from an "Authorization: Bearer <token>"
// header, or "" when there is none.
func readBearerToken(r *http.Request) string {
	header := r.Header.Get("Authorization")
	token, found := strings.CutPrefix(header, "Bearer ")
	if !found {
		return ""
	}
	return strings.TrimSpace(token)
}
