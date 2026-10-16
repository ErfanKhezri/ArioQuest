/**
 * True in the web demo hosted with the website (`vite --mode demo`): no
 * sign-in, a banner about browser limits, and a friendly note instead of gRPC.
 */
export const isWebDemo = import.meta.env.VITE_WEB_DEMO === "true";

export const RELEASES_URL = "https://github.com/ErfanKhezri/ArioQuest/releases/latest";
