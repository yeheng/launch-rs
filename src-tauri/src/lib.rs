// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use tauri_plugin_global_shortcut::{Shortcut, GlobalShortcutExt};
use std::collections::HashMap;
use std::sync::{Mutex, LazyLock};

// 用于存储已注册的快捷键
static REGISTERED_SHORTCUTS: LazyLock<Mutex<HashMap<String, Shortcut>>> = LazyLock::new(|| {
    Mutex::new(HashMap::new())
});

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

#[tauri::command]
fn register_global_shortcut(
    app_handle: tauri::AppHandle,
    shortcut_id: String,
    accelerator: String,
) -> Result<(), String> {
    let shortcut = accelerator.parse::<Shortcut>()
        .map_err(|e| format!("解析快捷键失败: {}", e))?;
    
    // 注册快捷键
    app_handle.global_shortcut().register(shortcut.clone())
        .map_err(|e| format!("注册快捷键失败: {}", e))?;
    
    // 设置快捷键监听器
    let app_handle_clone = app_handle.clone();
    app_handle.global_shortcut().on_shortcut(shortcut.clone(), move |_app, _shortcut, _event| {
        let window = app_handle_clone.get_webview_window("main");
        if let Some(window) = window {
            // 检查窗口是否可见
            if let Ok(is_visible) = window.is_visible() {
                if is_visible {
                    // 窗口可见，则隐藏
                    let _ = window.hide();
                    let _ = window.set_decorations(false);
                } else {
                    // 窗口隐藏，则显示
                    let _ = window.set_decorations(true);
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
    }).map_err(|e| format!("设置快捷键监听器失败: {}", e))?;
    
    // 存储已注册的快捷键
    let mut shortcuts = REGISTERED_SHORTCUTS.lock().unwrap();
    shortcuts.insert(shortcut_id, shortcut);
    
    Ok(())
}

#[tauri::command]
fn unregister_global_shortcut(
    app_handle: tauri::AppHandle,
    shortcut_id: String,
) -> Result<(), String> {
    let mut shortcuts = REGISTERED_SHORTCUTS.lock().unwrap();
    
    if let Some(shortcut) = shortcuts.remove(&shortcut_id) {
        app_handle.global_shortcut().unregister(shortcut)
            .map_err(|e| format!("注销快捷键失败: {}", e))?;
    }
    
    Ok(())
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet, 
            toggle_headless,
            register_global_shortcut,
            unregister_global_shortcut
        ])
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
