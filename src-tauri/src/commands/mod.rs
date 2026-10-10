//! Tauri commands exposed to the frontend.
//! Every command registered here must also be typed in `src/lib/tauri.ts`.
//!
//! Commands are referenced through their module (e.g. `commands::http::send_http_request`)
//! because `tauri::generate_handler!` cannot see items re-exported with `pub use`.

pub mod app;
pub mod grpc;
pub mod http;
pub mod storage;
