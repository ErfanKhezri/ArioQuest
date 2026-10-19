import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `pnpm dev` runs this next to the demo's dev server; separate dependency
  // caches stop one server from overwriting the other's pre-bundled modules.
  cacheDir: fileURLToPath(new URL("../node_modules/.vite-website", import.meta.url)),
  resolve: {
    alias: {
      // The site reuses the app's mascot, theme tokens and cURL parser.
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  server: {
    port: 1440,
    // `pnpm dev` also runs the web demo (`vite --mode demo`) on 1430.
    proxy: { "/app": "http://localhost:1430" },
  },
  // `vite preview` would inherit the dev proxy; serve the built demo instead.
  preview: { port: 4173, proxy: {} },
  build: {
    target: "es2022",
  },
});
