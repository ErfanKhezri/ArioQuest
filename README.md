# ArioQuest

An API client for Windows. Send HTTP and gRPC requests, test them with scripts, run
whole collections, and let Ario, the app's mascot, tell you how each response went.

**[Website](https://erfankhezri.github.io/ArioQuest/)** ·
**[Try it in your browser](https://erfankhezri.github.io/ArioQuest/app/)** ·
**[Download for Windows](https://github.com/ErfanKhezri/ArioQuest/releases/latest)**

## Features

- **HTTP**: every method, headers, JSON / form / multipart / GraphQL / binary bodies, bearer,
  basic and API-key auth. Requests go out from Rust, so there are no CORS limits.
- **gRPC**: load `.proto` files or use server reflection; unary and all three streaming kinds.
  No `protoc` needed.
- **Tests**: no-code assertions, or JavaScript scripts with an `aq` API that is also available as
  `pm`, so most existing `pm` scripts run unchanged.
- **Collection runner**: run a collection or folder for several iterations and see the results
  per request.
- **Collections, environments and history** with `{{variables}}`.
- **Import / export**: v2.0 / v2.1 collection files and environments, cURL (paste it into the URL bar),
  `fetch`.
- **Keyboard first**: `Ctrl+K` command palette, `Ctrl+Enter` send, `Ctrl+S` save.
- **English and Persian**: switch in Settings or on the sign-in screen; Persian lays the app out
  right to left.

## Install

Download `ArioQuest_<version>_x64-setup.exe` (or the `.msi`) from the
[latest release](https://github.com/ErfanKhezri/ArioQuest/releases/latest) and run it.

Sign in with **admin / admin**. Sign-in is a local mock until the real backend exists.

## Development

You need Node.js 20+, pnpm, [Rust](https://rustup.rs) (MSVC toolchain), and Visual Studio Build
Tools with the "Desktop development with C++" workload.

```powershell
pnpm install
pnpm dev          # run everything in the browser (addresses below)
pnpm app:dev      # run the desktop app with hot reload
pnpm app:build    # build the Windows installers into src-tauri/target/release/bundle/
```

`pnpm dev` (or `yarn dev`, `npm run dev`) starts all three dev servers:

| Address                    | What                                                       |
| -------------------------- | ---------------------------------------------------------- |
| http://localhost:1440/     | Website                                                    |
| http://localhost:1440/app/ | Web demo through the website (also at localhost:1430/app/) |
| http://localhost:1420/     | The app in a browser, with sign-in (CORS applies, no gRPC) |

| Command           | What it does                                                  |
| ----------------- | ------------------------------------------------------------- |
| `pnpm dev:app`    | Run only the app frontend (what `app:dev` uses)               |
| `pnpm dev:site`   | Run only the website                                          |
| `pnpm dev:demo`   | Run only the web demo                                         |
| `pnpm site:build` | Build the website and the web demo into `website/dist`        |
| `pnpm lint`       | Lint                                                          |
| `pnpm typecheck`  | Type-check                                                    |
| `pnpm test`       | Run the unit tests (Rust tests: `cargo test` in `src-tauri/`) |

## Project layout

```
src/          React frontend (the app)
src-tauri/    Rust backend: HTTP, gRPC and storage commands
website/      Marketing site; reuses the app's theme, mascot and cURL parser
```

Interface text lives in `src/i18n/locales/` (app) and `website/src/i18n/` (site), one file per
language, using [i18next](https://www.i18next.com/). English is the source: TypeScript checks every
`t("…")` key against it and makes the Persian file keep the same keys. Use logical Tailwind classes
(`ms-`, `pe-`, `start-`, `text-start`, …) instead of `ml-`, `pr-`, `left-`, so layouts flip for
right-to-left languages.

A new Rust command is registered by its module path in `src-tauri/src/lib.rs`
(`pub use` re-exports don't work with `generate_handler!`), and its types are added to
`CommandMap` in `src/lib/tauri.ts`.

## Releases and deploys

- **Release**: Actions → **Release** → Run workflow with a version like `0.2.0`, or push a tag
  (`git tag v0.2.0 && git push origin v0.2.0`). The installers are attached to the release.
- **Website**: every push to `master` deploys it to GitHub Pages. One-time setup: Settings →
  Pages → Source: **GitHub Actions**.
