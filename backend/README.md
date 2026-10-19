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

## Deploy

Merging to `master` deploys automatically:

1. The `Backend` workflow tests and builds, then uploads the binary to the `backend-latest`
   pre-release on GitHub.
2. On the server, `ario-api-update.timer` runs `update.sh` every minute. When `version.txt` in
   that release changes, it downloads the binary, checks its SHA-256, swaps it in and restarts
   `ario-api`. If the new version does not answer on `/health`, it goes back to the previous one.

The server pulls instead of GitHub pushing because the server's data center blocks SSH from
outside Iran.

The files in [`deploy/`](deploy/) are the server setup:

| File                      | On the server                                  |
| ------------------------- | ---------------------------------------------- |
| `ario-api.service`        | `/etc/systemd/system/` (runs the API)          |
| `ario-api-update.service` | `/etc/systemd/system/` (runs `update.sh` once) |
| `ario-api-update.timer`   | `/etc/systemd/system/` (every minute)          |
| `update.sh`               | `/opt/ario-api/update.sh`                      |

Useful commands on the server:

```sh
systemctl status ario-api                 # is the API running?
journalctl -u ario-api -f                 # API logs
journalctl -u ario-api-update -n 20       # what the updater did
cat /opt/ario-api/version.txt             # installed commit
```

## Endpoints

Request and response bodies are JSON. Errors look like
`{"code": "invalid_credentials", "error": "Wrong email or password.", "field": "password"}`.
`code` is a fixed name the app translates into the user's language; `error` is the English
message; `field` is present when the error belongs to one form field (`name`, `email` or
`password`).

| Code                                      | Status   | When                              |
| ----------------------------------------- | -------- | --------------------------------- |
| `name_required`, `name_too_long`          | 400      | sign-up                           |
| `email_invalid`                           | 400      | sign-up                           |
| `password_too_short`, `password_too_long` | 400      | sign-up                           |
| `email_taken`                             | 409      | sign-up                           |
| `invalid_credentials`                     | 401      | sign-in                           |
| `unauthenticated`                         | 401      | missing, unknown or expired token |
| `invalid_json`, `body_too_large`          | 400, 413 | any request                       |
| `internal`                                | 500      | anything unexpected (logged)      |

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
