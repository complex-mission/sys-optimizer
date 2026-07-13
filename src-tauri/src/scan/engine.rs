//! 扫描与清理核心。安全底线(需求文档第六节):
//! - 只碰白名单目录(由类别定义提供路径)
//! - 不跟随符号链接 / junction
//! - 占用/无权限文件跳过并计数,绝不中断
//! - 模块 A(基础清理)直接删除;其他模块删除走回收站(见 clean.rs 的 to_trash)

use crate::types::{CleanResult, FileEntry, PreviewPage};
use std::fs;
use std::path::{Path, PathBuf};

/// 判断路径是否为符号链接 / reparse point(不跟随)。读不到一律当作"跳过"。
fn is_symlink(path: &Path) -> bool {
    match fs::symlink_metadata(path) {
        Ok(md) => md.file_type().is_symlink(),
        Err(_) => true,
    }
}

/// 递归统计目录大小与文件数。
/// - `pattern`:若为 Some,仅统计根目录下文件名匹配的文件,且不递归。
pub fn scan_dir(dir: &Path, pattern: Option<&dyn Fn(&str) -> bool>) -> (u64, u64) {
    if !dir.exists() {
        return (0, 0);
    }
    let mut bytes = 0u64;
    let mut files = 0u64;

    if let Some(pred) = pattern {
        // 仅根目录、仅匹配文件
        if let Ok(rd) = fs::read_dir(dir) {
            for entry in rd.flatten() {
                let p = entry.path();
                if is_symlink(&p) {
                    continue;
                }
                if let Ok(md) = entry.metadata() {
                    if md.is_file() {
                        if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                            if pred(name) {
                                bytes += md.len();
                                files += 1;
                            }
                        }
                    }
                }
            }
        }
        return (bytes, files);
    }

    // 递归(手写栈,限制深度,跳过符号链接)
    let mut stack = vec![(dir.to_path_buf(), 0u32)];
    while let Some((d, depth)) = stack.pop() {
        if depth > 24 {
            continue;
        }
        let rd = match fs::read_dir(&d) {
            Ok(rd) => rd,
            Err(_) => continue, // 无权限等,跳过
        };
        for entry in rd.flatten() {
            let p = entry.path();
            if is_symlink(&p) {
                continue;
            }
            match entry.metadata() {
                Ok(md) if md.is_dir() => stack.push((p, depth + 1)),
                Ok(md) if md.is_file() => {
                    bytes += md.len();
                    files += 1;
                }
                _ => {}
            }
        }
    }
    (bytes, files)
}

/// 取目录下的文件级预览页(按大小倒序,分页)。
/// 为控制内存,先浅扫收集(path, size, mtime),排序后切片。
pub fn preview_dir(
    id: &str,
    dir: &Path,
    pattern: Option<&dyn Fn(&str) -> bool>,
    offset: u64,
    limit: u64,
) -> PreviewPage {
    let mut all: Vec<FileEntry> = Vec::new();

    let mut stack = vec![(dir.to_path_buf(), 0u32)];
    while let Some((d, depth)) = stack.pop() {
        if depth > 24 {
            continue;
        }
        let rd = match fs::read_dir(&d) {
            Ok(rd) => rd,
            Err(_) => continue,
        };
        for entry in rd.flatten() {
            let p = entry.path();
            if is_symlink(&p) {
                continue;
            }
            let md = match entry.metadata() {
                Ok(md) => md,
                Err(_) => continue,
            };
            if md.is_dir() {
                if pattern.is_none() {
                    stack.push((p, depth + 1));
                }
                continue;
            }
            if !md.is_file() {
                continue;
            }
            let name = match p.file_name().and_then(|n| n.to_str()) {
                Some(n) => n.to_string(),
                None => continue,
            };
            if let Some(pred) = pattern {
                if !pred(&name) {
                    continue;
                }
            }
            let mtime = md
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);
            all.push(FileEntry {
                path: p.to_string_lossy().into_owned(),
                name,
                bytes: md.len(),
                mtime,
            });
            if pattern.is_some() {
                // 有 pattern 时不递归子目录
                continue;
            }
        }
    }

    all.sort_by(|a, b| b.bytes.cmp(&a.bytes));
    let total = all.len() as u64;
    let start = offset.min(total) as usize;
    let end = (offset + limit).min(total) as usize;
    let entries = all[start..end].to_vec();

    PreviewPage {
        id: id.to_string(),
        total,
        offset,
        entries,
    }
}

/// 危险根守卫:这些**目录本身**绝不允许被递归永久清理
/// (盘符根、系统目录根、用户主目录及顶层个人文件夹、AppData 根)。
///
/// 注意:仅拦截根本身;其**子目录**(如 `Windows\Temp`、`AppData\Local\某缓存`)不受影响。
/// 这样既挡住"把整块个人数据/系统目录当缓存清空"的事故,又不影响正常的缓存子目录清理。
pub fn is_protected_path(dir: &Path) -> bool {
    let s = norm_path(dir);

    // 盘符根:如 "c:"(尾部 '\' 已 trim)
    if s.len() == 2 && s.as_bytes()[1] == b':' {
        return true;
    }

    protected_roots().iter().any(|p| p == &s)
}

/// 路径是否位于 Windows 系统目录树内(供校验用户手动指定的覆盖路径,拒绝越界)。
/// 比 is_protected_path 更严格:命中即拦,不区分根与子目录。
pub fn is_within_system_dir(path: &Path) -> bool {
    let s = norm_path(path);
    const BLOCK: [&str; 6] = [
        "\\windows\\",
        "\\program files\\",
        "\\program files (x86)\\",
        "\\programdata\\",
        "\\$recycle.bin\\",
        "\\system volume information\\",
    ];
    for b in BLOCK {
        if s.contains(b) {
            return true;
        }
        // 结尾无分隔符的情况(路径本身就是该系统目录)
        if s.ends_with(b.trim_end_matches('\\')) {
            return true;
        }
    }
    false
}

/// 归一化路径:小写 + 统一反斜杠 + 去尾部分隔符。
fn norm_path(p: &Path) -> String {
    p.to_string_lossy()
        .to_ascii_lowercase()
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_string()
}

/// 需要精确保护的根目录集合(已归一化)。
fn protected_roots() -> Vec<String> {
    let env = |k: &str| std::env::var_os(k).map(PathBuf::from);
    let mut out: Vec<String> = Vec::new();

    // 系统树根
    for k in ["WINDIR", "ProgramFiles", "ProgramFiles(x86)", "ProgramData"] {
        if let Some(p) = env(k) {
            out.push(norm_path(&p));
        }
    }

    // 用户主目录及其顶层个人文件夹
    if let Some(up) = env("USERPROFILE") {
        out.push(norm_path(&up));
        for sub in [
            "desktop", "documents", "downloads", "pictures", "videos", "music",
            "favorites", "contacts", "links", "saved games", "searches", "onedrive",
            "appdata",
        ] {
            out.push(norm_path(&up.join(sub)));
        }
        // AppData 的三个根(其子目录才是合法缓存位置)
        let ad = up.join("appdata");
        for sub in ["local", "roaming", "locallow"] {
            out.push(norm_path(&ad.join(sub)));
        }
    }
    for k in ["LOCALAPPDATA", "APPDATA"] {
        if let Some(p) = env(k) {
            out.push(norm_path(&p));
        }
    }
    out
}

/// 删除模式。
pub enum DeleteMode {
    /// 直接删除(模块 A 基础清理)
    Permanent,
    /// 移入回收站(模块 B/C 等,操作用户自有文件)
    Trash,
}

/// 清理一个目录。`keep_paths` 为用户在预览中反选、需保留的文件绝对路径集合。
pub fn clean_dir(
    dir: &Path,
    pattern: Option<&dyn Fn(&str) -> bool>,
    mode: &DeleteMode,
    keep_paths: &std::collections::HashSet<String>,
) -> CleanResult {
    let mut freed = 0u64;
    let mut deleted = 0u64;
    let mut skipped = 0u64;

    if !dir.exists() {
        return CleanResult {
            id: String::new(),
            freed_bytes: 0,
            deleted_files: 0,
            skipped: 0,
            blocked_by: None,
        };
    }

    // 安全闸(最后一道防线):危险根目录绝不递归清理,
    // 即便规则或用户覆盖误指向盘符根/系统目录根/个人文件夹根/AppData 根。
    if is_protected_path(dir) {
        return CleanResult {
            id: String::new(),
            freed_bytes: 0,
            deleted_files: 0,
            skipped: 0,
            blocked_by: None,
        };
    }

    // 收集待删项(自底向上,便于删空目录)
    let mut to_delete: Vec<(PathBuf, bool, u64)> = Vec::new(); // (path, is_dir, size)
    let mut stack = vec![(dir.to_path_buf(), 0u32)];
    let mut dirs: Vec<PathBuf> = Vec::new();
    while let Some((d, depth)) = stack.pop() {
        if depth > 24 {
            continue;
        }
        let rd = match fs::read_dir(&d) {
            Ok(rd) => rd,
            Err(_) => {
                skipped += 1;
                continue;
            }
        };
        for entry in rd.flatten() {
            let p = entry.path();
            if is_symlink(&p) {
                skipped += 1;
                continue;
            }
            let md = match entry.metadata() {
                Ok(md) => md,
                Err(_) => {
                    skipped += 1;
                    continue;
                }
            };
            if md.is_dir() {
                if pattern.is_none() {
                    dirs.push(p.clone());
                    stack.push((p, depth + 1));
                }
            } else if md.is_file() {
                let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if let Some(pred) = pattern {
                    if !pred(name) {
                        continue;
                    }
                }
                if keep_paths.contains(&p.to_string_lossy().into_owned()) {
                    continue; // 用户反选保留
                }
                to_delete.push((p, false, md.len()));
            }
        }
    }

    // 删文件
    for (p, _is_dir, size) in &to_delete {
        let ok = match mode {
            DeleteMode::Permanent => fs::remove_file(p).is_ok(),
            DeleteMode::Trash => trash::delete(p).is_ok(),
        };
        if ok {
            freed += *size;
            deleted += 1;
        } else {
            skipped += 1; // 占用/无权限
        }
    }

    // 删空目录(仅 Permanent 模式且无 pattern 时;从最深开始)
    if matches!(mode, DeleteMode::Permanent) && pattern.is_none() {
        dirs.sort_by_key(|p| std::cmp::Reverse(p.components().count()));
        for d in dirs {
            let _ = fs::remove_dir(&d); // 非空或占用则失败,忽略
        }
    }

    CleanResult {
        id: String::new(),
        freed_bytes: freed,
        deleted_files: deleted,
        skipped,
        blocked_by: None,
    }
}
