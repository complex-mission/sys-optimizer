//! Tauri 命令层:前端通过 invoke 调用这些函数。
//! 扫描/清理为长任务,在阻塞线程池执行并经事件流推送进度。

use crate::config::{self, AppConfig};
use crate::hardware::{self, HardwareReport};
use crate::logbook;
use crate::scan;
use crate::types::*;
use std::collections::HashSet;
use tauri::{Emitter, Window};

/// 列出全部类别元信息。
#[tauri::command]
pub fn list_categories() -> Vec<CategoryMeta> {
    scan::list_categories()
}

/// 按挡位取应勾选/展示的类别 id。
#[tauri::command]
pub fn ids_for_tier(tier: String) -> Vec<String> {
    let t = match tier.as_str() {
        "quick" => Tier::Quick,
        "deep" => Tier::Deep,
        _ => Tier::Standard,
    };
    scan::categories::ids_for_tier(t)
}

/// 扫描一组类别,逐个完成后 emit `scan://progress`,最终返回全部结果。
#[tauri::command]
pub async fn run_scan(window: Window, ids: Vec<String>) -> Vec<CategoryScanResult> {
    tauri::async_runtime::spawn_blocking(move || {
        let total = ids.len();
        let mut results = Vec::with_capacity(total);
        for (i, id) in ids.iter().enumerate() {
            let r = scan::scan_one(id);
            let _ = window.emit(
                "scan://progress",
                ScanProgress { done: i + 1, total, result: r.clone() },
            );
            results.push(r);
        }
        results
    })
    .await
    .unwrap_or_default()
}

/// 取某类别的文件预览页。
#[tauri::command]
pub async fn preview_category(id: String, offset: u64, limit: u64) -> PreviewPage {
    tauri::async_runtime::spawn_blocking(move || scan::preview_one(&id, offset, limit))
        .await
        .unwrap_or(PreviewPage { id: String::new(), total: 0, offset, entries: vec![] })
}

/// 清理一组类别。`keep_paths` 为反选保留的绝对路径。
/// 逐个完成后 emit `clean://progress`,并写日志、累计统计。
#[tauri::command]
pub async fn run_clean(
    window: Window,
    ids: Vec<String>,
    keep_paths: Vec<String>,
) -> Vec<CleanResult> {
    let keep: HashSet<String> = keep_paths.into_iter().collect();
    let results = tauri::async_runtime::spawn_blocking(move || {
        let total = ids.len();
        let mut results = Vec::with_capacity(total);
        for (i, id) in ids.iter().enumerate() {
            let r = scan::clean_one(id, &keep);
            let _ = window.emit(
                "clean://progress",
                CleanProgress { done: i + 1, total, result: r.clone() },
            );
            results.push(r);
        }
        results
    })
    .await
    .unwrap_or_default();

    // 写日志 + 更新累计统计
    logbook::record_clean(&results);
    let mut cfg = config::load();
    cfg.total_freed_bytes += results.iter().map(|r| r.freed_bytes).sum::<u64>();
    cfg.total_clean_count += 1;
    let _ = config::save(&cfg);

    results
}

/// 在资源管理器中打开路径(供"打开位置")。
#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer.exe")
            .raw_arg(format!("\"{path}\""))
            .creation_flags(0x0800_0000)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        Ok(())
    }
}

/* ---------------- 配置 / 条款 / 横幅 ---------------- */

#[tauri::command]
pub fn get_config() -> AppConfig {
    config::load()
}

#[tauri::command]
pub fn accept_terms() -> Result<(), String> {
    let mut cfg = config::load();
    cfg.terms_accepted = true;
    config::save(&cfg)
}

#[tauri::command]
pub fn should_show_banner() -> bool {
    config::should_show_banner(&config::load())
}

#[tauri::command]
pub fn dismiss_banner() -> Result<(), String> {
    let mut cfg = config::load();
    cfg.banner_dismissed_at = config::now_secs();
    config::save(&cfg)
}

#[tauri::command]
pub fn set_language(language: String) -> Result<(), String> {
    let mut cfg = config::load();
    cfg.language = language;
    config::save(&cfg)
}

#[tauri::command]
pub fn set_default_tier(tier: String) -> Result<(), String> {
    let mut cfg = config::load();
    cfg.default_tier = tier;
    config::save(&cfg)
}

/// 谨慎模式开关:高风险(expensive)项删除时是否移入回收站。
#[tauri::command]
pub fn set_expensive_to_trash(enabled: bool) -> Result<(), String> {
    let mut cfg = config::load();
    cfg.expensive_to_trash = enabled;
    config::save(&cfg)
}

#[tauri::command]
pub fn logs_dir() -> String {
    logbook::logs_path_string()
}

/* ---------------- 手动覆盖路径(达芬奇等自定义路径场景) ---------------- */

/// 设置某类别的手动覆盖路径(优先级最高)。传空列表即清除覆盖。
#[tauri::command]
pub fn set_path_override(id: String, paths: Vec<String>) -> Result<(), String> {
    let mut cfg = config::load();
    if paths.is_empty() {
        cfg.path_overrides.remove(&id);
    } else {
        // 安全校验:拒绝危险目录(盘符根 / 系统目录树 / 个人文件夹根 / AppData 根),
        // 以免用户误把整块个人数据或系统目录当缓存路径,进而被递归永久清理。
        for p in &paths {
            let path = std::path::Path::new(p);
            if scan::engine::is_protected_path(path) || scan::engine::is_within_system_dir(path) {
                return Err(format!("路径不安全,已拒绝设置为缓存目录:{p}"));
            }
        }
        cfg.path_overrides.insert(id, paths);
    }
    config::save(&cfg)
}

/// 查询某类别当前实际解析到的路径(手动 > 探测 > 默认),
/// 供软件专项页显示"现在扫描的是哪个目录"。
#[tauri::command]
pub fn resolved_paths(id: String) -> Vec<String> {
    let overrides = config::load().path_overrides;
    match scan::categories::find(&id) {
        Some(def) => def
            .resolved_paths(&overrides)
            .into_iter()
            .map(|p| p.to_string_lossy().into_owned())
            .collect(),
        None => vec![],
    }
}

/// 软件专项页:按软件分组的规则视图(含安装检测与解析路径)。
#[tauri::command]
pub fn app_rules() -> Vec<scan::rules::AppView> {
    let overrides = config::load().path_overrides;
    scan::rules::app_views(&overrides)
}

/* ---------------- 大文件扫描(模块 B) ---------------- */

/// 默认扫描目录(用户主目录),供前端初始展示。
#[tauri::command]
pub fn default_scan_dir() -> String {
    std::env::var_os("USERPROFILE")
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "C:\\".into())
}

/// 扫描大文件。threshold_mb 阈值(MB),max_results 返回上限。
/// 扫描期间后台线程定时 emit `large://progress`。
#[tauri::command]
pub async fn scan_large_files(
    window: Window,
    path: String,
    threshold_mb: u64,
    max_results: usize,
) -> Vec<LargeFile> {
    use scan::large::LargeCounter;
    use std::sync::atomic::Ordering;

    let counter = LargeCounter::new();
    let counter_bg = counter.clone();
    let win = window.clone();
    let target = path.clone();

    let stop = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let stop_bg = stop.clone();
    let reporter = std::thread::spawn(move || {
        while !stop_bg.load(Ordering::Relaxed) {
            std::thread::sleep(std::time::Duration::from_millis(200));
            let _ = win.emit(
                "large://progress",
                LargeProgress {
                    scanned_items: counter_bg.scanned.load(Ordering::Relaxed),
                    found: counter_bg.found.load(Ordering::Relaxed),
                    current: target.clone(),
                    done: false,
                },
            );
        }
    });

    let threshold = threshold_mb.saturating_mul(1024 * 1024);
    let max = if max_results == 0 { 200 } else { max_results };
    let counter_work = counter.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        scan::large::scan_large(std::path::Path::new(&path), threshold, max, Some(&counter_work))
    })
    .await
    .unwrap_or_default();

    stop.store(true, Ordering::Relaxed);
    let _ = reporter.join();
    let _ = window.emit(
        "large://progress",
        LargeProgress {
            scanned_items: counter.scanned.load(Ordering::Relaxed),
            found: counter.found.load(Ordering::Relaxed),
            current: String::new(),
            done: true,
        },
    );

    result
}

/// 删除选中的大文件(移入回收站)。返回 [成功数, 释放字节, 跳过数]。
#[tauri::command]
pub async fn delete_large_files(paths: Vec<String>) -> Vec<u64> {
    let r = tauri::async_runtime::spawn_blocking(move || scan::large::delete_to_trash(&paths))
        .await
        .unwrap_or((0, 0, 0));
    vec![r.0, r.1, r.2]
}

/* ---------------- 重复文件扫描(模块 C) ---------------- */

/// 扫描重复文件。三级比对策略在 dup.rs 内部;扫描期间 emit `dup://progress`。
#[tauri::command]
pub async fn scan_duplicates(window: Window, path: String) -> Vec<DuplicateGroup> {
    use scan::dup::DupCounter;
    use std::sync::atomic::Ordering;

    let counter = DupCounter::new();
    let counter_bg = counter.clone();
    let win = window.clone();

    let stop = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let stop_bg = stop.clone();
    let reporter = std::thread::spawn(move || {
        while !stop_bg.load(Ordering::Relaxed) {
            std::thread::sleep(std::time::Duration::from_millis(250));
            let scanned = counter_bg.scanned.load(Ordering::Relaxed);
            let sampled = counter_bg.sampled.load(Ordering::Relaxed);
            let hashed = counter_bg.hashed.load(Ordering::Relaxed);
            // 按最新活跃的阶段判断当前阶段
            let (phase, processed) = if hashed > 0 {
                ("hashing", hashed)
            } else if sampled > 0 {
                ("sampling", sampled)
            } else {
                ("scanning", scanned)
            };
            let _ = win.emit(
                "dup://progress",
                DupProgress {
                    phase: phase.to_string(),
                    processed,
                    total: 0,
                    done: false,
                },
            );
        }
    });

    let counter_work = counter.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        scan::dup::find_duplicates(std::path::Path::new(&path), &counter_work)
    })
    .await
    .unwrap_or_default();

    stop.store(true, Ordering::Relaxed);
    let _ = reporter.join();
    let _ = window.emit(
        "dup://progress",
        DupProgress {
            phase: "done".to_string(),
            processed: 0,
            total: 0,
            done: true,
        },
    );

    result
}

/// 删除选中的重复文件(移入回收站)。返回 [成功数, 释放字节, 跳过数]。
#[tauri::command]
pub async fn delete_duplicates(paths: Vec<String>) -> Vec<u64> {
    let r = tauri::async_runtime::spawn_blocking(move || scan::dup::delete_to_trash(&paths))
        .await
        .unwrap_or((0, 0, 0));
    vec![r.0, r.1, r.2]
}

/* ---------------- 启动项管理(模块 D) ---------------- */

/// 列出全部启动项。
#[tauri::command]
pub async fn list_startup() -> Vec<StartupItem> {
    tauri::async_runtime::spawn_blocking(scan::startup::list_all)
        .await
        .unwrap_or_default()
}

/// 启用/禁用某启动项(不删除,可恢复)。
#[tauri::command]
pub async fn set_startup_enabled(id: String, enable: bool) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || scan::startup::set_enabled(&id, enable))
        .await
        .unwrap_or_else(|e| Err(format!("任务执行失败: {e}")))
}

/* ---------------- 卸载残留检测(模块 E,只报告) ---------------- */

/// 检测疑似卸载残留目录。仅报告,不提供删除。
#[tauri::command]
pub async fn detect_leftovers() -> Vec<LeftoverItem> {
    tauri::async_runtime::spawn_blocking(scan::leftover::detect)
        .await
        .unwrap_or_default()
}

/* ---------------- 系统级空间回收(模块 H) ---------------- */

/// 列出系统级空间项(休眠/还原点/Windows.old/WinSxS)及状态。
/// 注:WinSxS 分析(DISM)可能耗时数十秒。
#[tauri::command]
pub async fn list_system_space() -> Vec<SystemSpaceItem> {
    tauri::async_runtime::spawn_blocking(scan::system::list)
        .await
        .unwrap_or_default()
}

/// 执行某系统级空间操作(需管理员权限)。
#[tauri::command]
pub async fn execute_system_space(id: String) -> SystemSpaceResult {
    tauri::async_runtime::spawn_blocking(move || scan::system::execute(&id))
        .await
        .unwrap_or_else(|e| SystemSpaceResult {
            id: String::new(),
            success: false,
            message: format!("任务执行失败: {e}"),
        })
}

/* ---------------- 空间分析(模块 G) ---------------- */

/// 列出可分析的磁盘。
#[tauri::command]
pub fn list_drives() -> Vec<String> {
    scan::space::list_drives()
}

/// 列出"值得关注但不建议自动清理"的已知位置(供空间分析页快速跳转查看)。
#[tauri::command]
pub fn list_notable_locations() -> Vec<NotableLocation> {
    scan::space::list_notable()
}

/// 分析单层目录(下钻 = 对子目录再次调用)。
/// 分析期间后台线程定时 emit `space://progress` 上报累计进度;完成后返回该层结果。
#[tauri::command]
pub async fn analyze_space(window: Window, path: String, top_n: usize) -> SpaceLevel {
    use scan::space::SpaceCounter;
    use std::sync::atomic::Ordering;

    let counter = SpaceCounter::new();
    let counter_bg = counter.clone();
    let win = window.clone();
    let target = path.clone();

    // 进度上报线程:每 200ms 推一次,直到收到停止信号
    let stop = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let stop_bg = stop.clone();
    let reporter = std::thread::spawn(move || {
        while !stop_bg.load(Ordering::Relaxed) {
            std::thread::sleep(std::time::Duration::from_millis(200));
            let _ = win.emit(
                "space://progress",
                SpaceProgress {
                    scanned_bytes: counter_bg.bytes.load(Ordering::Relaxed),
                    scanned_items: counter_bg.items.load(Ordering::Relaxed),
                    current: target.clone(),
                    done: false,
                },
            );
        }
    });

    let top = if top_n == 0 { 12 } else { top_n };
    let counter_work = counter.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        scan::space::analyze_level(std::path::Path::new(&path), top, Some(&counter_work))
    })
    .await
    .unwrap_or(SpaceLevel {
        path: String::new(),
        total: 0,
        nodes: vec![],
        has_other: false,
    });

    // 停止进度线程并推送最终完成事件
    stop.store(true, Ordering::Relaxed);
    let _ = reporter.join();
    let _ = window.emit(
        "space://progress",
        SpaceProgress {
            scanned_bytes: counter.bytes.load(Ordering::Relaxed),
            scanned_items: counter.items.load(Ordering::Relaxed),
            current: String::new(),
            done: true,
        },
    );

    result
}

/* ---------------- 硬件 ---------------- */

#[tauri::command]
pub async fn hardware_report() -> HardwareReport {
    tauri::async_runtime::spawn_blocking(hardware::collect)
        .await
        .unwrap_or_default()
}

/* ---------------- 关于 ---------------- */

#[derive(serde::Serialize)]
pub struct AboutInfo {
    pub version: String,
    pub build_date: String,
    pub copyright: String,
}

#[tauri::command]
pub fn about_info() -> AboutInfo {
    AboutInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        // build.rs 注入;缺失时回退占位
        build_date: option_env!("BUILD_DATE").unwrap_or("unknown").to_string(),
        copyright: "© 2026 沈阳信商科技 版权所有 · 技术支持:解构者".to_string(),
    }
}
