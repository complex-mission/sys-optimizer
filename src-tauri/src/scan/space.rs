//! 空间分析引擎(模块 G)。
//!
//! 核心策略:**按层分析**,不预先展开整棵树。
//! - analyze_level(dir):计算 dir 下各直接子项的大小,子目录递归求和;
//!   结果按大小降序,超出 top_n 的合并为"其他"。
//! - 下钻 = 对被点开的子目录再调一次 analyze_level。
//!
//! 递归求和会遍历大量文件,故通过回调向上报进度(节流由调用方控制)。
//! 安全:不跟随符号链接/junction,读不到的目录跳过(不 panic)。

use crate::types::{NotableLocation, SpaceLevel, SpaceNode};
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

/// 进度累计器(跨线程共享)。
pub struct SpaceCounter {
    pub bytes: AtomicU64,
    pub items: AtomicU64,
}

impl SpaceCounter {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            bytes: AtomicU64::new(0),
            items: AtomicU64::new(0),
        })
    }
}

fn is_symlink(path: &Path) -> bool {
    match std::fs::symlink_metadata(path) {
        Ok(md) => md.file_type().is_symlink(),
        Err(_) => true,
    }
}

/// 递归求某目录的总大小与文件数。跳过符号链接与读不到的项。
/// counter 存在时累加进度(供事件流上报)。
fn dir_size(path: &Path, counter: Option<&SpaceCounter>) -> u64 {
    let mut total = 0u64;
    let mut stack = vec![path.to_path_buf()];
    while let Some(d) = stack.pop() {
        let rd = match std::fs::read_dir(&d) {
            Ok(rd) => rd,
            Err(_) => continue,
        };
        for entry in rd.flatten() {
            let p = entry.path();
            if is_symlink(&p) {
                continue;
            }
            match entry.metadata() {
                Ok(md) if md.is_dir() => stack.push(p),
                Ok(md) if md.is_file() => {
                    total += md.len();
                    if let Some(c) = counter {
                        c.bytes.fetch_add(md.len(), Ordering::Relaxed);
                        c.items.fetch_add(1, Ordering::Relaxed);
                    }
                }
                _ => {}
            }
        }
    }
    total
}

/// 分析单层目录。top_n 之外的子项合并为"其他"。
/// counter 用于上报进度(递归求和期间累加)。
pub fn analyze_level(dir: &Path, top_n: usize, counter: Option<&SpaceCounter>) -> SpaceLevel {
    let mut nodes: Vec<SpaceNode> = Vec::new();

    if let Ok(rd) = std::fs::read_dir(dir) {
        for entry in rd.flatten() {
            let p = entry.path();
            if is_symlink(&p) {
                continue;
            }
            let md = match entry.metadata() {
                Ok(md) => md,
                Err(_) => continue,
            };
            let name = p
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            if md.is_dir() {
                let bytes = dir_size(&p, counter);
                let children = count_children(&p);
                nodes.push(SpaceNode {
                    name,
                    path: p.to_string_lossy().into_owned(),
                    bytes,
                    is_dir: true,
                    children,
                });
            } else if md.is_file() {
                if let Some(c) = counter {
                    c.bytes.fetch_add(md.len(), Ordering::Relaxed);
                    c.items.fetch_add(1, Ordering::Relaxed);
                }
                nodes.push(SpaceNode {
                    name,
                    path: p.to_string_lossy().into_owned(),
                    bytes: md.len(),
                    is_dir: false,
                    children: 0,
                });
            }
        }
    }

    nodes.sort_by(|a, b| b.bytes.cmp(&a.bytes));
    let total: u64 = nodes.iter().map(|n| n.bytes).sum();

    let mut has_other = false;
    if nodes.len() > top_n {
        let other: u64 = nodes[top_n..].iter().map(|n| n.bytes).sum();
        nodes.truncate(top_n);
        if other > 0 {
            has_other = true;
            nodes.push(SpaceNode {
                name: "__other__".to_string(),
                path: String::new(),
                bytes: other,
                is_dir: false,
                children: 0,
            });
        }
    }

    SpaceLevel {
        path: dir.to_string_lossy().into_owned(),
        total,
        nodes,
        has_other,
    }
}

/// 数某目录下直接子项数量(尽力而为)。
fn count_children(dir: &Path) -> u32 {
    std::fs::read_dir(dir)
        .map(|rd| rd.flatten().count() as u32)
        .unwrap_or(0)
}

/// 列出"值得关注但不建议自动清理"的已知位置(仅返回实际存在的)。
///
/// 这些目录要么被系统服务独占(字体缓存 / 搜索索引)、要么删除有风险
/// (Windows Installer 影响卸载修复)、要么与用户工程混在一起(Maya)。
/// 不做成可清理类别,而是让用户在空间分析里查看体积、自行决定如何处理。
pub fn list_notable() -> Vec<NotableLocation> {
    let env = |k: &str, fallback: &str| {
        std::env::var_os(k)
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| std::path::PathBuf::from(fallback))
    };
    let windir = env("WINDIR", "C:\\Windows");
    let programdata = env("ProgramData", "C:\\ProgramData");
    let userprofile = env("USERPROFILE", "C:\\");

    let candidates: [(&str, std::path::PathBuf); 6] = [
        ("win-installer", windir.join("Installer")),
        (
            "office-installer",
            programdata.join("Microsoft").join("ClickToRun"),
        ),
        (
            "font-cache",
            windir
                .join("ServiceProfiles")
                .join("LocalService")
                .join("AppData")
                .join("Local")
                .join("FontCache"),
        ),
        (
            "search-index",
            programdata.join("Microsoft").join("Search").join("Data"),
        ),
        (
            "delivery-opt",
            windir.join("SoftwareDistribution").join("DeliveryOptimization"),
        ),
        ("maya-data", userprofile.join("Documents").join("maya")),
    ];

    candidates
        .into_iter()
        .filter(|(_, p)| p.exists())
        .map(|(id, p)| NotableLocation {
            id: id.to_string(),
            path: p.to_string_lossy().into_owned(),
        })
        .collect()
}

/// 列出可用于分析的磁盘盘符(Windows:探测 A-Z 存在的根)。
pub fn list_drives() -> Vec<String> {
    #[cfg(windows)]
    {
        let mut out = Vec::new();
        for c in b'A'..=b'Z' {
            let root = format!("{}:\\", c as char);
            if Path::new(&root).exists() {
                out.push(root);
            }
        }
        out
    }
    #[cfg(not(windows))]
    {
        vec!["/".to_string()]
    }
}
