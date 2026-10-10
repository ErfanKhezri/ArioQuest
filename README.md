# ArioQuest

A Postman-style API client for testing HTTP and gRPC APIs. Windows desktop app built with
**Tauri 2**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

## Features

- **HTTP requests** — every method; params synced with the URL; headers; JSON, text, XML, HTML,
  URL-encoded, multipart (with files), binary and GraphQL bodies; bearer / basic / API-key auth;
  timeout, redirect and TLS-verification settings. Requests are sent from Rust, so there are no
  CORS limits, and cookies persist between requests like a browser (clear them from the status bar).
- **gRPC from `.proto` files** — import files or a whole folder; imports and
  `google/protobuf/*` well-known types resolve automatically (no `protoc` needed). Or load
  services through **server reflection**. Pick a method, generate an example message, add
  metadata, and call unary, server-, client- or bidirectional-streaming methods (TLS optional).
- **Testing** — no-code assertions (status, gRPC status, header, JSON path, body, response time),
  JavaScript pre-request and test scripts with an `aq` API that is also exposed as `pm`, so most
  Postman scripts run unchanged, and variable extraction to chain requests.
- **Collection runner** — run a collection or folder in order, for several iterations, with a
  per-request breakdown of test results.
- **Collections, environments, globals and history** — folders, `{{variables}}` with highlighting,
  hover values and autocomplete, dynamic values like `{{$guid}}` and `{{$timestamp}}`.
- **Import / export** — Postman collections (v2.0/v2.1) and environments, cURL (also by pasting
  into the URL bar), ArioQuest JSON; export to Postman v2.1 or ArioQuest; generate cURL or `fetch`.
- **Keyboard first** — `Ctrl+K` command palette, `Ctrl+Enter` send, `Ctrl+S` save, `Ctrl+N` new
  tab, `Ctrl+W` close tab, `Ctrl+E` cycle environments, `Ctrl+O` import.

The workspace is saved to `store/workspace.json` in the app data directory.

### Script API

```js
// Pre-request: edit the outgoing request or set run-scoped variables
aq.request.headers["X-Request-Id"] = crypto.randomUUID();
aq.variables.set("now", new Date().toISOString());

// Tests: aq.test / aq.expect (chai or jest style); pm.* works too
aq.test("created", () => aq.response.to.have.status(201));
aq.test("has an id", () => aq.expect(aq.response.json().id).to.exist);
aq.environment.set("orderId", aq.response.json().id);
console.log(aq.response.headers.get("content-type"));
```

For gRPC, `aq.response.code` is the numeric status code, `aq.response.status` its name, and
`aq.response.json()` the response message (an array for streaming responses).

## Prerequisites

- Node.js 20+ and pnpm
- Rust (stable, MSVC toolchain) via [rustup](https://rustup.rs)
- Visual Studio Build Tools with the "Desktop development with C++" workload
- Microsoft Edge WebView2 (preinstalled on Windows 11)

## Scripts

| Command          | Description                                         |
| ---------------- | --------------------------------------------------- |
| `pnpm install`   | Install dependencies                                |
| `pnpm app:dev`   | Run the desktop app with hot reload                 |
| `pnpm app:build` | Build the Windows installers (`.exe` NSIS + `.msi`) |
| `pnpm dev`       | Run only the web frontend in a browser              |
| `pnpm typecheck` | Type-check the frontend                             |
| `pnpm lint`      | Lint with ESLint                                    |
| `pnpm test`      | Run the frontend unit tests (Vitest)                |
| `pnpm format`    | Format with Prettier                                |

Installers are written to `src-tauri/target/release/bundle/`. Rust unit tests run with
`cargo test` inside `src-tauri/`.

`pnpm dev` runs the UI in a browser for quick iteration: HTTP falls back to `fetch` (so CORS
applies) and gRPC is unavailable — use `pnpm app:dev` for the full app.

## Project structure

```
src/                     React frontend
  app/                   Root shell: nav rail, status bar
  core/                  Framework-free logic: request model, variables, runner, scripts,
                         assertions, cURL and Postman import/export (unit-tested)
  store/                 Zustand workspace store (persisted) and toasts
  features/landing/      Home / welcome screen (hero, quick actions, recents)
  features/workspace/    Tabs, HTTP and gRPC editors, response viewer, sidebar panels, dialogs
  components/editor/     CodeMirror editors with {{variable}} support
  components/ui/         Reusable presentational components
  hooks/                 React hooks (app info, keyboard shortcuts)
  lib/                   Utilities, storage, files and the typed Tauri command bridge
  styles/                Tailwind entry and theme tokens
src-tauri/               Rust backend
  src/commands/          Tauri commands exposed to the frontend (HTTP, gRPC, storage)
  src/grpc/              Dynamic gRPC: proto compilation, reflection, codec, invocation
  capabilities/          Permission sets for webview windows
  tauri.conf.json        App, window and bundle configuration
```

## Adding a backend command

1. Create the function in a module under `src-tauri/src/commands/` with `#[tauri::command]`
   (declare the module as `pub mod` in `commands/mod.rs`).
2. Register it by its module path, e.g. `http::send_http_request`, in
   `tauri::generate_handler![...]` in `src-tauri/src/lib.rs`. Re-exporting a command with
   `pub use` does not work: the macro cannot see the hidden items it generates.
3. Add its argument/result types to `CommandMap` in `src/lib/tauri.ts`, then call it with `invokeCommand("name", args)`.
