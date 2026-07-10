//! 大文件扫描(模块 B)。
//!
//! 递归遍历用户指定目录,收集 ≥ 阈值的文件,按大小降序返回。
//! - 硬编码排除系统目录(Windows / Program Files 等):扫它们既慢又无意义,
//!   且这些文件不该被当作"大文件"清理,排除也是一层安全保护。
//! - 不跟随符号链接 / junction;读不到的目录跳过。
//! - 删除一律走回收站(这些是用户自有文件,必须可反悔)—— 复用 engine 的 Trash 模式。

use crate::types::LargeFile;
use std::collections::HashSet;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;

/// 取消标记:前端点"停止"时置位,遍历循环检查后提前返回(已找到的照常返回)。
pub static CANCEL: AtomicBool = AtomicBool::new(false);

/// 进度累计器。
pub struct LargeCounter {
    pub scanned: AtomicU64,
    pub found: AtomicU64,
}
impl LargeCounter {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            scanned: AtomicU64::new(0),
            found: AtomicU64::new(0),
        })
    }
}

fn is_symlink(path: &Path) -> bool {
    match std::fs::symlink_metadata(path) {
        Ok(md) => md.file_type().is_symlink(),
        Err(_) => true,
    }
}

/// 判断目录是否应排除(系统目录黑名单)。大小写不敏感,按路径包含判断。
fn is_excluded(path: &Path) -> bool {
    let lower = path.to_string_lossy().to_ascii_lowercase();
    // 归一化分隔符
    let lower = lower.replace('/', "\\");
    const BLOCK: [&str; 6] = [
        "\\windows\\",
        "\\program files\\",
        "\\program files (x86)\\",
        "\\programdata\\",
        "\\$recycle.bin\\",
        "\\system volume information\\",
    ];
    // 结尾无分隔符的根情况也要挡(如 "c:\windows")
    for b in BLOCK {
        if lower.contains(b) {
            return true;
        }
        let trimmed = b.trim_end_matches('\\');
        if lower.ends_with(trimmed) {
            return true;
        }
    }
    false
}

fn ext_of(name: &str) -> String {
    name.rsplit_once('.')
        .map(|(_, e)| e.to_ascii_lowercase())
        .filter(|e| e.len() <= 8 && !e.is_empty())
        .unwrap_or_default()
}

/// 扫描单个目录树,收集 ≥ threshold 字节的文件。
/// max_results 限制返回数量(仍会遍历全部,只是最终截断,保证按全局大小排序)。
pub fn scan_large(
    root: &Path,
    threshold: u64,
    max_results: usize,
    counter: Option<&LargeCounter>,
) -> Vec<LargeFile> {
    let mut found: Vec<LargeFile> = Vec::new();
    if !root.exists() {
        return found;
    }

    let mut stack = vec![root.to_path_buf()];
    let mut visited: HashSet<String> = HashSet::new();

    while let Some(dir) = stack.pop() {
        if CANCEL.load(Ordering::Relaxed) {
            break;
        }
        if is_excluded(&dir) {
            continue;
        }
        // 防环:记录已访问的规范路径
        let key = dir.to_string_lossy().to_ascii_lowercase();
        if !visited.insert(key) {
            continue;
        }

        let rd = match std::fs::read_dir(&dir) {
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
                stack.push(p);
            } else if md.is_file() {
                if let Some(c) = counter {
                    c.scanned.fetch_add(1, Ordering::Relaxed);
                }
                if md.len() >= threshold {
                    let name = p
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string();
                    let mtime = md
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs() as i64)
                        .unwrap_or(0);
                    let ext = ext_of(&name);
                    found.push(LargeFile {
                        path: p.to_string_lossy().into_owned(),
                        name,
                        bytes: md.len(),
                        mtime,
                        ext,
                    });
                    if let Some(c) = counter {
                        c.found.fetch_add(1, Ordering::Relaxed);
                    }
                }
            }
        }
    }

    found.sort_by(|a, b| b.bytes.cmp(&a.bytes));
    found.truncate(max_results);
    found
}

/// 删除选中的大文件(移入回收站)。返回 (成功数, 释放字节, 跳过数)。
pub fn delete_to_trash(paths: &[String]) -> (u64, u64, u64) {
    let mut ok = 0u64;
    let mut freed = 0u64;
    let mut skipped = 0u64;
    for p in paths {
        let path = Path::new(p);
        // 安全:拒绝删除排除目录内的文件(即便前端传了)
        if is_excluded(path) {
            skipped += 1;
            continue;
        }
        let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        match trash::delete(path) {
            Ok(_) => {
                ok += 1;
                freed += size;
            }
            Err(_) => skipped += 1,
        }
    }
    (ok, freed, skipped)
}
