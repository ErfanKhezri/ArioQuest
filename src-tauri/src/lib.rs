mod commands;
mod grpc;
mod state;
mod types;

use commands::{app, grpc as grpc_cmd, http, storage};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // reqwest and tonic both use rustls; pick one process-wide crypto provider.
    let _ = rustls::crypto::ring::default_provider().install_default();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(state::AppState::default())
        .invoke_handler(tauri::generate_handler![
            app::get_app_info,
            http::send_http_request,
            http::cancel_request,
            http::clear_cookies,
            grpc_cmd::grpc_describe,
            grpc_cmd::grpc_invoke,
            storage::store_read,
            storage::store_write,
            storage::write_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ArioQuest");
}
