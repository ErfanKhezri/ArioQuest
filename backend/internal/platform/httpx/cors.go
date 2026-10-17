package httpx

import (
	"net/http"
	"slices"
)

// CORS lets the listed origins (the app, which runs on a different origin than
// the API) call the API from a browser or webview.
func CORS(allowedOrigins []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if slices.Contains(allowedOrigins, origin) {
			headers := w.Header()
			headers.Set("Access-Control-Allow-Origin", origin)
			headers.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			headers.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			headers.Add("Vary", "Origin")
		}

		// The browser sends an OPTIONS "preflight" request first to ask what is
		// allowed. The headers above are the whole answer.
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
