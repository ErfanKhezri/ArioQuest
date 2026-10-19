/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEB_DEMO?: string;
  /** Base URL of the backend API; defaults to https://api.arioquest.ir. */
  readonly VITE_API_URL?: string;
}
