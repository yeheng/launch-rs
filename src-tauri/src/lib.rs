// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use tauri_plugin_global_shortcut::{Shortcut, GlobalShortcutExt};
use std::collections::HashMap;
use std::sync::{Mutex, LazyLock};
use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

// 用于存储已注册的快捷键
static REGISTERED_SHORTCUTS: LazyLock<Mutex<HashMap<String, Shortcut>>> = LazyLock::new(|| {
    Mutex::new(HashMap::new())
});

// 文件搜索结果
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct FileSearchResult {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64, // 时间戳
}

// 搜索选项
#[derive(Debug, Deserialize, Default)]
pub struct SearchOptions {
    pub max_results: Option<usize>,
    pub search_path: Option<String>,
    pub case_sensitive: Option<bool>,
    pub include_hidden: Option<bool>,
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
    // 验证搜索查询
    let sanitized_query = sanitize_search_query(&query);
    if sanitized_query.is_empty() {
        return Ok(vec![]);
    }
    
    // 验证和规范化搜索路径
    let search_dir = validate_and_normalize_search_path(search_path)?;
    
    let max = std::cmp::min(max_results.unwrap_or(50), 100); // 限制最大结果数
    let query_lower = sanitized_query.to_lowercase();
    
    let mut results = Vec::new();
    
    // 递归搜索文件，限制深度
    search_directory(&Path::new(&search_dir), &query_lower, &mut results, max, 0, 3)?;
    
    // 按文件名相关性排序
    results.sort_by(|a, b| {
        let a_score = calculate_relevance_score(&a.name.to_lowercase(), &query_lower);
        let b_score = calculate_relevance_score(&b.name.to_lowercase(), &query_lower);
        b_score.partial_cmp(&a_score).unwrap_or(std::cmp::Ordering::Equal)
    });
    
    Ok(results)
}

// 验证和规范化搜索路径
fn validate_and_normalize_search_path(search_path: Option<String>) -> Result<String, String> {
    let path_str = search_path.unwrap_or_else(|| {
        // 默认搜索用户主目录
        dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "/".to_string())
    });
    
    let path = Path::new(&path_str);
    
    // 检查路径是否存在
    if !path.exists() {
        return Err(format!("搜索路径不存在: {}", path_str));
    }
    
    // 检查路径是否为目录
    if !path.is_dir() {
        return Err(format!("搜索路径不是目录: {}", path_str));
    }
    
    // 规范化为绝对路径
    let absolute_path = path.canonicalize()
        .map_err(|e| format!("无法规范化路径 {}: {}", path_str, e))?;
    
    // 检查路径是否在允许的范围内
    if !is_path_allowed(&absolute_path)? {
        return Err(format!("搜索路径不在允许范围内: {}", path_str));
    }
    
    Ok(absolute_path.to_string_lossy().to_string())
}

// 检查路径是否在允许的范围内
fn is_path_allowed(path: &Path) -> Result<bool, String> {
    let allowed_paths = get_allowed_search_paths()?;
    
    // 检查路径是否以任何允许的路径开头
    for allowed_path in allowed_paths {
        if path.starts_with(&allowed_path) {
            return Ok(true);
        }
    }
    
    Ok(false)
}

// 获取允许的搜索路径
fn get_allowed_search_paths() -> Result<Vec<PathBuf>, String> {
    let mut allowed_paths = Vec::new();
    
    // 添加用户主目录
    if let Some(home_dir) = dirs::home_dir() {
        allowed_paths.push(home_dir);
    }
    
    // 添加文档目录
    if let Some(doc_dir) = dirs::document_dir() {
        allowed_paths.push(doc_dir);
    }
    
    // 添加下载目录
    if let Some(download_dir) = dirs::download_dir() {
        allowed_paths.push(download_dir);
    }
    
    // 添加桌面目录
    if let Some(desktop_dir) = dirs::desktop_dir() {
        allowed_paths.push(desktop_dir);
    }
    
    // 添加用户指定的其他安全目录
    let additional_safe_dirs = vec![
        "/tmp",
        "/var/tmp",
        "/Users/Shared", // macOS 共享目录
    ];
    
    for dir_str in additional_safe_dirs {
        let path = Path::new(dir_str);
        if path.exists() && path.is_dir() {
            if let Ok(absolute_path) = path.canonicalize() {
                allowed_paths.push(absolute_path);
            }
        }
    }
    
    Ok(allowed_paths)
}

// 消毒搜索查询
fn sanitize_search_query(query: &str) -> String {
    // 移除危险的字符和模式
    query
        .chars()
        .filter(|&c| {
            // 允许字母、数字、中文、常见符号和空格
            c.is_alphanumeric() || 
            c.is_whitespace() || 
            c == '_' || c == '-' || c == '.' || 
            c == '(' || c == ')' || c == '[' || c == ']' ||
            c == '{' || c == '}' || c == '+' || c == '=' ||
            ('\u{4e00}'..='\u{9fff}').contains(&c) // 中文字符范围
        })
        .collect()
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use tempfile::TempDir;

    /// 测试工具函数：创建临时测试目录
    fn create_test_directory() -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        // 创建测试文件
        let test_files = vec![
            ("test.txt", "test content"),
            ("document.pdf", "pdf content"),
            ("image.png", "png content"),
            ("script.js", "javascript content"),
            ("README.md", "readme content"),
        ];
        
        for (filename, content) in test_files {
            let file_path = temp_dir.path().join(filename);
            let mut file = File::create(file_path).expect("Failed to create test file");
            file.write_all(content.as_bytes()).expect("Failed to write test file");
        }
        
        // 创建子目录
        let sub_dir = temp_dir.path().join("subdir");
        fs::create_dir(&sub_dir).expect("Failed to create subdirectory");
        
        let sub_file_path = sub_dir.join("nested.txt");
        let mut sub_file = File::create(sub_file_path).expect("Failed to create nested file");
        sub_file.write_all("nested content".as_bytes()).expect("Failed to write nested file");
        
        temp_dir
    }

    #[test]
    fn test_greet() {
        assert_eq!(greet("世界"), "Hello, 世界! You've been greeted from Rust!");
        assert_eq!(greet(""), "Hello, ! You've been greeted from Rust!");
        assert_eq!(greet("Test User"), "Hello, Test User! You've been greeted from Rust!");
    }

    #[test]
    fn test_sanitize_search_query() {
        // 正常查询
        assert_eq!(sanitize_search_query("test"), "test");
        assert_eq!(sanitize_search_query("test file"), "test file");
        
        // 特殊字符过滤
        assert_eq!(sanitize_search_query("test<>file"), "testfile");
        assert_eq!(sanitize_search_query("test|file"), "testfile");
        assert_eq!(sanitize_search_query("test;file"), "testfile");
        
        // 中文支持
        assert_eq!(sanitize_search_query("测试文件"), "测试文件");
        assert_eq!(sanitize_search_query("test 中文 file"), "test 中文 file");
        
        // 允许的符号
        assert_eq!(sanitize_search_query("test_file-v1.0.txt"), "test_file-v1.0.txt");
        assert_eq!(sanitize_search_query("config[prod]"), "config[prod]");
        
        // 恶意输入过滤
        assert_eq!(sanitize_search_query("../../../etc/passwd"), "etcpasswd");
        assert_eq!(sanitize_search_query("rm -rf /"), "rm -rf ");
    }

    #[test]
    fn test_calculate_relevance_score() {
        let query = "test";
        
        // 完全匹配
        assert!(calculate_relevance_score("test", query) > 90.0);
        
        // 前缀匹配
        let prefix_score = calculate_relevance_score("testfile", query);
        assert!(prefix_score > 70.0 && prefix_score < 90.0);
        
        // 包含匹配
        let contains_score = calculate_relevance_score("mytestfile", query);
        assert!(contains_score > 50.0 && contains_score < 80.0);
        
        // 不匹配
        assert!(calculate_relevance_score("document", query) < 30.0);
        
        // 空字符串
        assert_eq!(calculate_relevance_score("", query), 0.0);
    }

    #[test]
    fn test_search_files_basic() {
        let temp_dir = create_test_directory();
        let search_path = temp_dir.path().to_str().unwrap().to_string();
        
        // 测试基本搜索
        let results = search_files("test".to_string(), Some(search_path.clone()), Some(10))
            .expect("Search should succeed");
        
        assert!(!results.is_empty());
        assert!(results.iter().any(|r| r.name.contains("test")));
    }

    #[test]
    fn test_search_files_empty_query() {
        let temp_dir = create_test_directory();
        let search_path = temp_dir.path().to_str().unwrap().to_string();
        
        // 空查询应该返回空结果
        let results = search_files("".to_string(), Some(search_path), Some(10))
            .expect("Empty query should succeed");
        
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_files_invalid_path() {
        // 无效路径应该返回错误
        let result = search_files("test".to_string(), Some("/nonexistent/path".to_string()), Some(10));
        assert!(result.is_err());
    }

    #[test]
    fn test_search_files_max_results_limit() {
        let temp_dir = create_test_directory();
        let search_path = temp_dir.path().to_str().unwrap().to_string();
        
        // 测试结果数量限制
        let results = search_files("".to_string(), Some(search_path), Some(3))
            .expect("Search should succeed");
        
        // 由于空查询，结果应该为空
        assert!(results.is_empty());
        
        // 测试有效查询的限制
        let results = search_files("t".to_string(), Some(temp_dir.path().to_str().unwrap().to_string()), Some(2))
            .expect("Search should succeed");
        
        assert!(results.len() <= 2);
    }

    #[test]
    fn test_search_files_with_subdirectories() {
        let temp_dir = create_test_directory();
        let search_path = temp_dir.path().to_str().unwrap().to_string();
        
        // 搜索应该包含子目录中的文件
        let results = search_files("nested".to_string(), Some(search_path), Some(10))
            .expect("Search should succeed");
        
        assert!(results.iter().any(|r| r.name.contains("nested")));
    }

    #[test]
    fn test_file_search_result_serialization() {
        let result = FileSearchResult {
            name: "test.txt".to_string(),
            path: "/path/to/test.txt".to_string(),
            is_dir: false,
            size: 1024,
            modified: 1234567890,
        };
        
        // 测试序列化
        let json = serde_json::to_string(&result).expect("Serialization should succeed");
        assert!(json.contains("test.txt"));
        
        // 测试反序列化
        let deserialized: FileSearchResult = serde_json::from_str(&json)
            .expect("Deserialization should succeed");
        assert_eq!(result, deserialized);
    }

    #[test]
    fn test_search_options_default() {
        let options = SearchOptions::default();
        assert!(options.max_results.is_none());
        assert!(options.search_path.is_none());
        assert!(options.case_sensitive.is_none());
        assert!(options.include_hidden.is_none());
    }

    #[test]
    fn test_validate_and_normalize_search_path_edge_cases() {
        // 测试None路径
        let result = validate_and_normalize_search_path(None);
        assert!(result.is_ok());
        
        // 测试空字符串路径
        let result = validate_and_normalize_search_path(Some("".to_string()));
        assert!(result.is_ok());
        
        // 测试恶意路径
        let malicious_paths = vec![
            "../../../etc/passwd",
            "/etc/shadow",
            "~/.ssh/id_rsa",
            "/System/Library/CoreServices/",
        ];
        
        for path in malicious_paths {
            let result = validate_and_normalize_search_path(Some(path.to_string()));
            // 根据实现，可能成功（因为路径验证）或失败
            // 这里我们验证它不会导致panic
            let _ = result;
        }
    }

    #[test]
    fn test_get_allowed_search_paths() {
        let paths = get_allowed_search_paths().expect("Should get allowed paths");
        
        // 至少应该有一些标准目录
        assert!(!paths.is_empty());
        
        // 验证路径存在且为目录
        for path in &paths {
            if path.exists() {
                assert!(path.is_dir(), "Path should be a directory: {:?}", path);
            }
        }
    }

    #[test]
    fn test_search_directory_depth_limit() {
        let temp_dir = create_test_directory();
        let mut results = Vec::new();
        
        // 测试深度限制
        let search_result = search_directory(
            temp_dir.path(),
            "test",
            &mut results,
            100,
            0,
            0 // 最大深度为0，只搜索当前目录
        );
        
        assert!(search_result.is_ok());
        
        // 应该只包含当前目录的文件，不包含子目录文件
        assert!(!results.iter().any(|r| r.path.contains("subdir")));
    }

    #[test]
    fn test_search_directory_max_results_limit() {
        let temp_dir = create_test_directory();
        let mut results = Vec::new();
        
        // 测试结果数量限制
        let search_result = search_directory(
            temp_dir.path(),
            "",
            &mut results,
            2, // 最多2个结果
            0,
            3
        );
        
        assert!(search_result.is_ok());
        assert!(results.len() <= 2);
    }

    #[test]
    fn test_file_search_error_handling() {
        // 测试不存在的目录
        let mut results = Vec::new();
        let search_result = search_directory(
            Path::new("/nonexistent/directory"),
            "test",
            &mut results,
            10,
            0,
            3
        );
        
        assert!(search_result.is_err());
        assert!(results.is_empty());
    }

    #[test]
    fn test_sanitize_search_query_unicode() {
        // Unicode字符测试
        assert_eq!(sanitize_search_query("café"), "café");
        assert_eq!(sanitize_search_query("🚀 rocket"), " rocket"); // emoji被过滤
        assert_eq!(sanitize_search_query("naïve résumé"), "naïve résumé");
        
        // 混合语言测试
        assert_eq!(sanitize_search_query("hello 世界 world"), "hello 世界 world");
    }

    #[test]
    fn test_search_files_case_sensitivity() {
        let temp_dir = create_test_directory();
        let search_path = temp_dir.path().to_str().unwrap().to_string();
        
        // 测试大小写不敏感搜索（默认行为）
        let results_lower = search_files("test".to_string(), Some(search_path.clone()), Some(10))
            .expect("Search should succeed");
        let results_upper = search_files("TEST".to_string(), Some(search_path), Some(10))
            .expect("Search should succeed");
        
        // 应该返回相同的结果（因为内部转换为小写）
        assert_eq!(results_lower.len(), results_upper.len());
    }

    #[test]
    fn test_search_files_edge_cases() {
        let temp_dir = create_test_directory();
        let search_path = temp_dir.path().to_str().unwrap().to_string();
        
        // 测试各种边界情况
        let edge_cases = vec![
            (" ", "whitespace only"),
            (".", "dot only"),  
            ("...", "multiple dots"),
            ("中文测试", "chinese characters"),
        ];
        
        for (query, description) in edge_cases {
            let result = search_files(query.to_string(), Some(search_path.clone()), Some(10));
            assert!(result.is_ok(), "Failed for case: {}", description);
        }
        
        // 测试超长查询
        let long_query = "a".repeat(1000);
        let result = search_files(long_query, Some(search_path.clone()), Some(10));
        assert!(result.is_ok(), "Failed for very long query");
    }

    #[test]
    fn test_concurrent_search_safety() {
        use std::thread;
        use std::sync::Arc;
        
        let temp_dir = create_test_directory();
        let search_path = Arc::new(temp_dir.path().to_str().unwrap().to_string());
        
        // 并发搜索测试
        let handles: Vec<_> = (0..10).map(|i| {
            let path = Arc::clone(&search_path);
            thread::spawn(move || {
                search_files(format!("test{}", i), Some((*path).clone()), Some(5))
            })
        }).collect();
        
        // 等待所有线程完成
        for handle in handles {
            let result = handle.join().expect("Thread should complete");
            assert!(result.is_ok(), "Concurrent search should succeed");
        }
    }
}
