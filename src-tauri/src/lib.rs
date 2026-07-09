//! Cache Insight 库入口。

mod commands;
mod config;
mod hardware;
mod logbook;
mod scan;
mod types;

/// 安装 panic 钩子:崩溃信息落到日志目录,便于反馈排查。
fn install_panic_hook() {
    let default = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let ts = config::now_secs();
        let dir = std::env::var_os("APPDATA")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(std::env::temp_dir)
            .join("cache-insight/logs");
        let _ = std::fs::create_dir_all(&dir);
        let msg = format!("[{ts}] panic: {info}\n");
        use std::io::Write;
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(dir.join("crash.log"))
        {
            let _ = f.write_all(msg.as_bytes());
        }
        default(info);
    }));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    install_panic_hook();

    let mut builder = tauri::Builder::default();

    // 单实例:第二次启动时聚焦已有窗口而非再开一个。
    // (需 tauri-plugin-single-instance;此处用内置窗口聚焦占位,
    //  正式启用请在 Cargo.toml 加该插件并在此注册。)

    builder = builder.plugin(tauri_plugin_dialog::init());

    builder
        .invoke_handler(tauri::generate_handler![
            commands::list_categories,
            commands::ids_for_tier,
            commands::run_scan,
            commands::preview_category,
            commands::run_clean,
            commands::open_path,
            commands::get_config,
            commands::accept_terms,
            commands::should_show_banner,
            commands::dismiss_banner,
            commands::set_language,
            commands::set_default_tier,
            commands::set_expensive_to_trash,
            commands::logs_dir,
            commands::set_path_override,
            commands::resolved_paths,
            commands::app_rules,
            commands::default_scan_dir,
            commands::scan_large_files,
            commands::delete_large_files,
            commands::scan_duplicates,
            commands::delete_duplicates,
            commands::list_startup,
            commands::set_startup_enabled,
            commands::detect_leftovers,
            commands::list_system_space,
            commands::execute_system_space,
            commands::list_drives,
            commands::list_notable_locations,
            commands::analyze_space,
            commands::hardware_report,
            commands::about_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Cache Insight");
}
