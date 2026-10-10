//! Tauri commands exposed to the frontend.
//! Every command registered here must also be typed in `src/lib/tauri.ts`.

mod app;

pub use app::get_app_info;
