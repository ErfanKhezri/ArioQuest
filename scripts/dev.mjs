// `pnpm dev` / `yarn dev` / `npm run dev`: runs every part of the project's frontend at once.
// The desktop window itself needs Rust and runs with `pnpm app:dev`.
import { createServer } from "vite";

const servers = [
  // The app in a browser, with sign-in (vite.config.ts, port 1420).
  { name: "App", options: {} },
  // The web demo: no sign-in, sample collection (vite.config.ts --mode demo, port 1430).
  { name: "Web demo", options: { mode: "demo" } },
  // The marketing site; proxies /app to the demo (website/vite.config.ts, port 1440).
  { name: "Website", options: { root: "website" } },
];

for (const { name, options } of servers) {
  const server = await createServer({ ...options, clearScreen: false, logLevel: "warn" });
  await server.listen();
  console.log(`  ${name.padEnd(9)} ${server.resolvedUrls.local[0]}`);
}

console.log(`
  Open the website at http://localhost:1440/ (the demo is linked at /app/).
  App sign-in: admin / admin. Press Ctrl+C to stop.
`);
