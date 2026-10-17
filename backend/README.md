# ArioQuest API

The backend for ArioQuest, written in Go with a SQLite database. It currently handles accounts:
sign-up, sign-in and sign-out.

## Run

```sh
cd backend
go run ./cmd/server
```

The API listens on `http://localhost:8080` and creates `ario.db` in the current folder.

| Variable            | Default                                        | Meaning                         |
| ------------------- | ---------------------------------------------- | ------------------------------- |
| `ARIO_ADDR`         | `:8080`                                        | Address to listen on            |
| `ARIO_DB`           | `ario.db`                                      | SQLite database file            |
| `ARIO_CORS_ORIGINS` | `http://localhost:1420,http://tauri.localhost` | Origins allowed to call the API |

From Iran, `proxy.golang.org` returns 403. Download modules through a mirror:

```sh
go env -w GOPROXY=https://goproxy.io,direct
```

## Test

```sh
go test ./...
```

## Build for the Linux server

```powershell
$env:GOOS="linux"; $env:GOARCH="amd64"; go build -o bin/ario-api ./cmd/server
```

## Endpoints

Request and response bodies are JSON. Errors look like
`{"error": "Wrong email or password.", "field": "password"}`; `field` is present when the error
belongs to one form field (`name`, `email` or `password`).

| Method | Path             | Body                      | Success                    |
| ------ | ---------------- | ------------------------- | -------------------------- |
| POST   | `/auth/sign-up`  | `{name, email, password}` | `201 {name, email, token}` |
| POST   | `/auth/sign-in`  | `{email, password}`       | `200 {name, email, token}` |
| POST   | `/auth/sign-out` | none                      | `204`                      |
| GET    | `/me`            | none                      | `200 {name, email}`        |
| GET    | `/health`        | none                      | `200 {status: "ok"}`       |

`/auth/sign-out` and `/me` need the header `Authorization: Bearer <token>`.

Sign-up errors: `400` for invalid input, `409` when the email already has an account.
Sign-in returns `401` for a wrong email or password. A token is valid for 30 days or until
sign-out.

## Layout

Code is grouped by feature. Each feature has three layers, and each layer only calls the one
below it:

```
cmd/server/main.go           settings, wiring the features together, HTTP server
internal/
  auth/                      accounts and sessions
    handler.go               HTTP: decode request → call service → write response
    middleware.go            RequireUser: lets only signed-in requests through
    service.go               rules: validation, password hashing, sessions (no HTTP)
    repository.go            SQL queries (no rules)
    model.go, errors.go, validation.go
  platform/                  shared by every feature
    database/                opening SQLite, migrations
    httpx/                   JSON helpers, error responses, CORS
```

To add a feature (for example `workspace`): create `internal/workspace/` with the same files,
add its tables as a new entry at the end of `platform/database/migrations.go`, and register its
handler in `routes` in `cmd/server/main.go`. Wrap routes that need a signed-in user with
`authHandler.RequireUser` and read the user with `auth.UserFromContext`.

## Debug in VS Code

Install the Go extension, open the Run and Debug panel and pick **Backend: run server**
(or **Backend: test current package** with a test file open). Breakpoints work in both.
