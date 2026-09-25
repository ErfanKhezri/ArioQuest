# ArioQuest

Windows desktop app built with **Tauri 2**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

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
| `pnpm format`    | Format with Prettier                                |

Installers are written to `src-tauri/target/release/bundle/`.

## Project structure

```
src/                     React frontend
  app/                   Root component and app-level composition
  components/ui/         Reusable presentational components
  hooks/                 React hooks
  lib/                   Utilities and the typed Tauri command bridge
  styles/                Tailwind entry and theme tokens
src-tauri/               Rust backend
  src/commands/          Tauri commands exposed to the frontend
  capabilities/          Permission sets for webview windows
  tauri.conf.json        App, window and bundle configuration
```

## Adding a backend command

1. Create the function in `src-tauri/src/commands/` with `#[tauri::command]` and re-export it from `commands/mod.rs`.
2. Register it in `tauri::generate_handler![...]` in `src-tauri/src/lib.rs`.
3. Add its argument/result types to `CommandMap` in `src/lib/tauri.ts`, then call it with `invokeCommand("name", args)`.
