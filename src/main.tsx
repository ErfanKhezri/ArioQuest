import "@fontsource-variable/vazirmatn";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/i18n";
import { App } from "@/app/App";
import "@/styles/index.css";

// Dark by default; the choice is a per-device preference toggled from the nav rail.
document.documentElement.dataset.theme = localStorage.getItem("aq-theme") ?? "dark";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
