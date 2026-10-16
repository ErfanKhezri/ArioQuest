import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

// The browser demo (`--mode demo`) is served under the website at <SITE_BASE>app/.
const siteBase = process.env.SITE_BASE ?? "/";

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig(({ mode }) => ({
  base: mode === "demo" ? `${siteBase}app/` : "/",
  // `pnpm dev` runs the app and the demo side by side; each needs its own dependency cache.
  cacheDir: mode === "demo" ? "node_modules/.vite-demo" : "node_modules/.vite",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Keep Rust compiler errors visible in the terminal.
  clearScreen: false,
  server: {
    // Tauri expects a fixed port; fail instead of silently picking another.
    port: mode === "demo" ? 1430 : 1420,
    strictPort: true,
    host: host || false,
    // The demo is also opened through the website's /app proxy; its live reload
    // connects straight to the demo server instead of through that proxy.
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : mode === "demo"
        ? { clientPort: 1430 }
        : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    // Tauri on Windows uses WebView2 (Chromium).
    target: "chrome105",
    minify: !process.env.TAURI_ENV_DEBUG,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    // Assets load from disk inside the desktop app, so bundle size matters little.
    chunkSizeWarningLimit: 1500,
  },
}));
