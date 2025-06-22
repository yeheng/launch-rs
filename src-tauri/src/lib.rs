// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn toggle_headless(
    app_handle: tauri::AppHandle,
    headless: bool,
) -> Result<(), String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or("Window not found")?;

    if headless {
        window.hide().map_err(|e| e.to_string())?;
        window.set_decorations(false).map_err(|e| e.to_string())?;
    } else {
        window.set_decorations(true).map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
    }

    Ok(())
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, toggle_headless])
        .setup(|app| {
            // 从环境变量获取是否启用无头模式
            let headless_mode = std::env::var("HEADLESS").unwrap_or_default() == "true";

            if headless_mode {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                    let _ = window.set_decorations(false);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
