use serde::Serialize;
use tauri::AppHandle;

#[derive(Debug, Serialize)]
pub struct AppInfo {
    name: String,
    version: String,
    platform: &'static str,
}

#[tauri::command]
pub fn get_app_info(app: AppHandle) -> AppInfo {
    let package = app.package_info();

    AppInfo {
        name: package.name.clone(),
        version: package.version.to_string(),
        platform: std::env::consts::OS,
    }
}
