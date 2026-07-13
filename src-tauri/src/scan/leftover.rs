//! 卸载残留检测(模块 E)。
//!
//! 需求文档 v1.0:**只报告,不提供删除**。启发式检测误报率高,
//! 删错正在用的绿色软件会造成事故,故本模块只列出疑似残留供用户自行判断。
//!
//! 思路:
//!   1. 读注册表卸载列表(HKLM/HKCU 的 Uninstall 键),建立"已知软件名 + 安装路径"集合;
//!   2. 扫 Program Files / %AppData% / %LocalAppData% 下的一级子目录;
//!   3. 目录名与已知软件名/安装路径都对不上的,标记为疑似残留;
//!   4. 用"是否近期修改""是否含可执行文件"等信号给出参考置信度。
//!
//! 原则:宁可漏报不可误报 —— 明显活跃(近期修改)的目录降级或排除。

use crate::types::{LeftoverItem, LeftoverReport};
use std::collections::HashSet;
use std::path::{Path, PathBuf};

#[cfg(windows)]
fn installed_names_and_paths() -> (HashSet<String>, HashSet<String>) {
    use winreg::enums::*;
    use winreg::RegKey;

    let mut names: HashSet<String> = HashSet::new();
    let mut paths: HashSet<String> = HashSet::new();

    let uninstall_keys = [
        (HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Uninstall"),
        (HKEY_LOCAL_MACHINE, r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Uninstall"),
    ];

    for (hive, path) in uninstall_keys {
        let root = RegKey::predef(hive);
        let Ok(key) = root.open_subkey(path) else {
            continue;
        };
        for sub in key.enum_keys().flatten() {
            let Ok(app) = key.open_subkey(&sub) else {
                continue;
            };
            if let Ok(name) = app.get_value::<String, _>("DisplayName") {
                names.insert(normalize(&name));
            }
            // 安装位置
            for field in ["InstallLocation", "InstallSource", "DisplayIcon"] {
                if let Ok(loc) = app.get_value::<String, _>(field) {
                    let loc = loc.trim_matches('"');
                    // DisplayIcon 可能是 "path\app.exe,0",取目录部分
                    if let Some(dir) = Path::new(loc).parent() {
                        paths.insert(normalize(&dir.to_string_lossy()));
                    }
                    paths.insert(normalize(loc));
                }
            }
        }
    }
    (names, paths)
}

#[cfg(not(windows))]
fn installed_names_and_paths() -> (HashSet<String>, HashSet<String>) {
    (HashSet::new(), HashSet::new())
}

fn normalize(s: &str) -> String {
    s.to_ascii_lowercase()
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_string()
}

/// 目录大小(递归,尽力而为,遇错跳过;不跟随符号链接)。
fn dir_size(path: &Path) -> u64 {
    let mut total = 0u64;
    let mut stack = vec![path.to_path_buf()];
    while let Some(d) = stack.pop() {
        let Ok(rd) = std::fs::read_dir(&d) else {
            continue;
        };
        for e in rd.flatten() {
            let p = e.path();
            if std::fs::symlink_metadata(&p)
                .map(|m| m.file_type().is_symlink())
                .unwrap_or(true)
            {
                continue;
            }
            match e.metadata() {
                Ok(md) if md.is_dir() => stack.push(p),
                Ok(md) if md.is_file() => total += md.len(),
                _ => {}
            }
        }
    }
    total
}

/// 目录是否含可执行文件(顶层即可),含则更像"曾经的软件"。
fn has_executable(dir: &Path) -> bool {
    if let Ok(rd) = std::fs::read_dir(dir) {
        for e in rd.flatten() {
            let p = e.path();
            if let Some(ext) = p.extension().and_then(|x| x.to_str()) {
                let ext = ext.to_ascii_lowercase();
                if ext == "exe" || ext == "dll" {
                    return true;
                }
            }
        }
    }
    false
}

/// 目录最近修改时间(Unix 秒)。
fn mtime_of(path: &Path) -> i64 {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// 一个扫描位置。
struct Location {
    label: &'static str,
    dir: Option<PathBuf>,
    /// 是否要求"顶层含可执行文件"才算候选(Program Files 类应要求,AppData 类不强求)
    require_exe: bool,
}

fn scan_locations() -> Vec<Location> {
    let pf = std::env::var_os("ProgramFiles").map(PathBuf::from);
    let pf86 = std::env::var_os("ProgramFiles(x86)").map(PathBuf::from);
    let appdata = std::env::var_os("APPDATA").map(PathBuf::from);
    let local = std::env::var_os("LOCALAPPDATA").map(PathBuf::from);
    vec![
        Location { label: "Program Files", dir: pf, require_exe: true },
        Location { label: "Program Files (x86)", dir: pf86, require_exe: true },
        Location { label: "AppData", dir: appdata, require_exe: false },
        Location { label: "LocalAppData", dir: local, require_exe: false },
    ]
}

/// 常见的、不应被当作残留的系统/公共目录名(白名单,降低误报)。
fn is_whitelisted(name: &str) -> bool {
    const WHITE: [&str; 18] = [
        "common files", "windows", "windowsapps", "microsoft", "microsoft office",
        "windows defender", "windows nt", "internet explorer", "windows media player",
        "packages", "temp", "microsoft.net", "reference assemblies", "uninstall information",
        "windows photo viewer", "windows portable devices", "windows sidebar", "windows security",
    ];
    let n = name.to_ascii_lowercase();
    WHITE.contains(&n.as_str())
}

/// a 是否为 b 本身或 b 的祖先/后代目录(按路径分隔符边界判断,
/// 避免 "c:\foo" 误匹配 "c:\foobar")。
fn path_related(a: &str, b: &str) -> bool {
    a == b
        || a.strip_prefix(b).is_some_and(|rest| rest.starts_with('\\'))
        || b.strip_prefix(a).is_some_and(|rest| rest.starts_with('\\'))
}

/// 判断目录名是否与"已知软件"匹配(名字包含或被包含,或安装路径命中)。
fn is_known(dir_name: &str, full_path: &str, names: &HashSet<String>, paths: &HashSet<String>) -> bool {
    let dn = normalize(dir_name);
    let fp = normalize(full_path);

    // 安装路径命中:候选目录在某条已记录安装路径之内(或反之)。
    // 只按目录边界前缀匹配 —— 任意子串 contains 会让注册表里的
    // "C:\Program Files" 之类根路径把其下所有目录都误判为已知。
    if paths.iter().any(|p| path_related(p, &fp)) {
        return true;
    }
    // 名字匹配:软件名常含公司/产品名,做双向包含判断。
    // 被包含的一侧至少 4 个字符,防止 "R"、"7z" 之类短名吞掉一切。
    if names.contains(&dn) {
        return true;
    }
    for n in names {
        if n.len() >= 4 && dn.contains(n) {
            return true;
        }
        if dn.len() >= 4 && n.contains(&dn) {
            return true;
        }
    }
    false
}

const NINETY_DAYS: i64 = 90 * 24 * 60 * 60;

/// 检测疑似残留。items 按大小降序,并附带实际检查过的目录数。
pub fn detect() -> LeftoverReport {
    let (names, mut paths) = installed_names_and_paths();
    // 剔除过于宽泛的记录路径:扫描根目录本身(Program Files / AppData 等)
    // 与盘符根 —— 它们会让 path_related 命中所有候选目录,导致什么都检不出。
    let roots: HashSet<String> = scan_locations()
        .iter()
        .filter_map(|l| l.dir.as_ref())
        .map(|d| normalize(&d.to_string_lossy()))
        .collect();
    paths.retain(|p| p.len() > 3 && !roots.contains(p));

    let now = crate::config::now_secs();
    let mut out = Vec::new();
    let mut scanned_dirs = 0u64;

    for loc in scan_locations() {
        let Some(dir) = loc.dir else {
            continue;
        };
        let Ok(rd) = std::fs::read_dir(&dir) else {
            continue;
        };
        for e in rd.flatten() {
            let p = e.path();
            let md = match e.metadata() {
                Ok(md) if md.is_dir() => md,
                _ => continue,
            };
            let _ = md;
            let name = match p.file_name().and_then(|n| n.to_str()) {
                Some(n) => n.to_string(),
                None => continue,
            };
            scanned_dirs += 1;
            if is_whitelisted(&name) {
                continue;
            }
            let full = p.to_string_lossy().into_owned();
            if is_known(&name, &full, &names, &paths) {
                continue; // 有对应已安装记录,不是残留
            }
            // Program Files 类要求顶层含可执行文件,否则跳过(降低误报)
            if loc.require_exe && !has_executable(&p) {
                continue;
            }

            let mtime = mtime_of(&p);
            // 近期(90 天内)修改过的,更可能是活跃软件而非残留 → 降级为 medium
            let recently_active = now.saturating_sub(mtime) < NINETY_DAYS;
            let confidence = if recently_active { "medium" } else { "high" };

            let bytes = dir_size(&p);
            // 空目录或极小(<64KB)通常无回收价值,跳过
            if bytes < 64 * 1024 {
                continue;
            }

            out.push(LeftoverItem {
                path: full,
                name,
                bytes,
                location: loc.label.to_string(),
                confidence: confidence.to_string(),
                mtime,
            });
        }
    }

    out.sort_by(|a, b| b.bytes.cmp(&a.bytes));
    LeftoverReport { scanned_dirs, items: out }
}
