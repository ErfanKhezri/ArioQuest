// Command server runs the ArioQuest API.
//
// Settings come from environment variables:
//
//	ARIO_ADDR          address to listen on (default ":8080")
//	ARIO_DB            path of the SQLite database file (default "ario.db")
//	ARIO_CORS_ORIGINS  comma-separated origins allowed to call the API
//	                   (default: the app in dev and in the Windows build)
package main

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"arioquest/backend/internal/auth"
	"arioquest/backend/internal/platform/database"
	"arioquest/backend/internal/platform/httpx"
)

type Config struct {
	Address        string
	DatabasePath   string
	AllowedOrigins []string
}

func loadConfig() Config {
	allowedOrigins := readEnv("ARIO_CORS_ORIGINS", "http://localhost:1420,http://tauri.localhost")

	return Config{
		Address:        readEnv("ARIO_ADDR", ":8080"),
		DatabasePath:   readEnv("ARIO_DB", "ario.db"),
		AllowedOrigins: strings.Split(allowedOrigins, ","),
	}
}

func main() {
	config := loadConfig()

	err := run(config)
	if err != nil {
		slog.Error("server stopped", "err", err)
		os.Exit(1)
	}
}

func run(config Config) error {
	sqlDatabase, err := database.Open(config.DatabasePath)
	if err != nil {
		return err
	}
	defer sqlDatabase.Close()

	server := &http.Server{
		Addr:    config.Address,
		Handler: newRouter(sqlDatabase, config),
		// Timeouts stop slow or stuck clients from holding connections forever.
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go shutDownOnSignal(server)

	slog.Info("listening", "address", config.Address, "database", config.DatabasePath)
	err = server.ListenAndServe()
	// ListenAndServe always returns an error. ErrServerClosed just means we
	// stopped it on purpose.
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

// shutDownOnSignal waits for Ctrl+C (or systemd stopping the service), then lets
// requests in progress finish before the server stops.
func shutDownOnSignal(server *http.Server) {
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt, syscall.SIGTERM)
	<-signals

	slog.Info("shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	server.Shutdown(ctx)
}

// newRouter creates every feature and registers its routes. A new feature (say,
// workspace) gets its repository, service and handler created here the same way.
func newRouter(sqlDatabase *sql.DB, config Config) http.Handler {
	router := http.NewServeMux()

	router.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	authRepository := auth.NewSQLiteRepository(sqlDatabase)
	authService := auth.NewService(authRepository)
	authHandler := auth.NewHandler(authService)
	authHandler.Register(router)

	return httpx.CORS(config.AllowedOrigins, router)
}

// readEnv returns the environment variable key, or fallback when it is not set.
func readEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
