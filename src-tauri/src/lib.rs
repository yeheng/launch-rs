// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use tauri_plugin_global_shortcut::{Shortcut, GlobalShortcutExt};
use std::collections::HashMap;
use std::sync::{Mutex, LazyLock};
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

// 用于存储已注册的快捷键
static REGISTERED_SHORTCUTS: LazyLock<Mutex<HashMap<String, Shortcut>>> = LazyLock::new(|| {
    Mutex::new(HashMap::new())
});

// 文件搜索结果
#[derive(Debug, Serialize, Deserialize)]
pub struct FileSearchResult {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64, // 时间戳
}

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

#[tauri::command]
fn search_files(
    query: String,
    search_path: Option<String>,
    max_results: Option<usize>,
) -> Result<Vec<FileSearchResult>, String> {
    let search_dir = search_path.unwrap_or_else(|| {
        // 默认搜索用户主目录
        dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "/".to_string())
    });
    
    let max = max_results.unwrap_or(50);
    let query_lower = query.to_lowercase();
    
    if query_lower.is_empty() {
        return Ok(vec![]);
    }
    
    let mut results = Vec::new();
    
    // 递归搜索文件
    search_directory(&Path::new(&search_dir), &query_lower, &mut results, max, 0, 3)?;
    
    // 按文件名相关性排序
    results.sort_by(|a, b| {
        let a_score = calculate_relevance_score(&a.name.to_lowercase(), &query_lower);
        let b_score = calculate_relevance_score(&b.name.to_lowercase(), &query_lower);
        b_score.partial_cmp(&a_score).unwrap_or(std::cmp::Ordering::Equal)
    });
    
    Ok(results)
}

// 递归搜索目录
fn search_directory(
    dir: &Path,
    query: &str,
    results: &mut Vec<FileSearchResult>,
    max_results: usize,
    current_depth: usize,
    max_depth: usize,
) -> Result<(), String> {
    if results.len() >= max_results || current_depth > max_depth {
        return Ok(());
    }
    
    let entries = fs::read_dir(dir)
        .map_err(|e| format!("读取目录失败: {}", e))?;
    
    for entry in entries {
        if results.len() >= max_results {
            break;
        }
        
        let entry = entry.map_err(|e| format!("读取文件项失败: {}", e))?;
        let path = entry.path();
        let file_name = path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("");
        
        // 跳过隐藏文件和系统文件
        if file_name.starts_with('.') || file_name.starts_with('~') {
            continue;
        }
        
        let file_name_lower = file_name.to_lowercase();
        
        // 检查文件名是否匹配查询
        if file_name_lower.contains(query) {
            let metadata = entry.metadata()
                .map_err(|e| format!("读取文件元数据失败: {}", e))?;
            
            let modified = metadata.modified()
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                .duration_since(std::time::SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            
            results.push(FileSearchResult {
                name: file_name.to_string(),
                path: path.to_string_lossy().to_string(),
                is_dir: metadata.is_dir(),
                size: metadata.len(),
                modified,
            });
        }
        
        // 递归搜索子目录
        if path.is_dir() && current_depth < max_depth {
            let _ = search_directory(&path, query, results, max_results, current_depth + 1, max_depth);
        }
    }
    
    Ok(())
}

// 计算相关性分数
fn calculate_relevance_score(filename: &str, query: &str) -> f32 {
    let mut score = 0.0;
    
    // 完全匹配得分最高
    if filename == query {
        score += 100.0;
    }
    // 前缀匹配
    else if filename.starts_with(query) {
        score += 80.0;
    }
    // 包含匹配
    else if filename.contains(query) {
        score += 60.0;
    }
    
    // 文件名越短得分越高
    if !filename.is_empty() {
        score += 20.0 / filename.len() as f32;
    }
    
    score
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
            unregister_global_shortcut,
            search_files
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
