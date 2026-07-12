//! Cache Insight 库入口。

mod commands;
mod config;
mod hardware;
mod logbook;
mod scan;
mod tray;
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

    // 单实例:第二次启动时聚焦已有窗口而非再开一个(须最先注册)。
    builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        tray::show_main_window(app);
    }));

    builder = builder.plugin(tauri_plugin_dialog::init());

    builder
        .setup(|app| {
            tray::setup(app.handle())?;
            Ok(())
        })
        // 最小化时隐藏到系统托盘,而非留在任务栏
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Resized(_) = event {
                if window.is_minimized().unwrap_or(false) {
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_categories,
            commands::ids_for_tier,
            commands::run_scan,
            commands::cancel_scan,
            commands::cancel_task,
            commands::disk_usage,
            commands::preview_category,
            commands::run_clean,
            commands::open_path,
            commands::open_url,
            commands::get_config,
            commands::accept_terms,
            commands::should_show_banner,
            commands::dismiss_banner,
            commands::set_language,
            commands::set_default_tier,
            commands::set_expensive_to_trash,
            commands::logs_dir,
            commands::clear_logs,
            commands::reset_stats,
            commands::set_path_override,
            commands::resolved_paths,
            commands::app_rules,
            commands::scan_app_size,
            commands::scan_app_sizes,
            commands::get_app_size_cache,
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
            commands::list_drives_with_type,
            commands::list_notable_locations,
            commands::analyze_space,
            commands::hardware_report,
            commands::about_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Cache Insight");
}
