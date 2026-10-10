//! Durable key/value storage for the workspace (collections, history, …),
//! stored as JSON files in the app data directory.

use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

fn store_path(app: &AppHandle, key: &str) -> Result<PathBuf, String> {
    let valid = !key.is_empty()
        && key.len() <= 64
        && key
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if !valid {
        return Err(format!("Invalid storage key: {key}"));
    }
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No app data directory: {e}"))?
        .join("store");
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
    Ok(dir.join(format!("{key}.json")))
}

#[tauri::command]
pub fn store_read(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let path = store_path(&app, &key)?;
    match fs::read_to_string(&path) {
        Ok(contents) => Ok(Some(contents)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("Could not read {}: {e}", path.display())),
    }
}

#[tauri::command]
pub fn store_write(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let path = store_path(&app, &key)?;
    // Write then rename so a crash mid-write never truncates the workspace.
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, value).map_err(|e| format!("Could not write {}: {e}", tmp.display()))?;
    fs::rename(&tmp, &path).map_err(|e| format!("Could not save {}: {e}", path.display()))
}

/// Writes an export chosen through the save dialog.
#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| format!("Could not write {path}: {e}"))
}
