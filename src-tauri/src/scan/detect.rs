//! 路径探测:部分软件允许用户自定义缓存/代理落盘位置(常挪到大容量盘),
//! 写死默认路径会导致"漏扫"。这里为这类软件提供探测函数,读其配置解析真实路径。
//!
//! 探测失败一律返回空,由上层回退到默认路径,绝不 panic。

use std::path::PathBuf;

fn appdata() -> PathBuf {
    std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("C:\\"))
}

fn localappdata() -> PathBuf {
    std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("C:\\"))
}

/// JetBrains 系 IDE 缓存目录探测。
///
/// 布局:`%LOCALAPPDATA%\JetBrains\<产品><版本>\{caches,index,log,tmp}`。
/// 只返回上述缓存类子目录,**不返回产品根目录**——避免误删 IDE 配置/插件。
/// 关键安全点:**排除 Toolbox**,该目录内含已安装的 IDE 本体,绝不能删。
pub fn jetbrains_cache_dirs() -> Vec<PathBuf> {
    product_cache_dirs(&localappdata().join("JetBrains"), |name| {
        !name.eq_ignore_ascii_case("Toolbox")
    })
}

/// Android Studio(基于 JetBrains 平台)缓存目录探测。
///
/// 布局:`%LOCALAPPDATA%\Google\AndroidStudio<版本>\{caches,index,log,tmp}`。
/// `Google` 目录下还有 Chrome 等其他产品,故**只认名字以 "AndroidStudio" 开头**的目录。
pub fn android_studio_cache_dirs() -> Vec<PathBuf> {
    product_cache_dirs(&localappdata().join("Google"), |name| {
        name.to_ascii_lowercase().starts_with("androidstudio")
    })
}

/// Steam 缓存目录探测。
///
/// Steam 安装位置可自定义(常在其他盘),从注册表 `HKCU\Software\Valve\Steam`
/// 的 `SteamPath` 读取真实根目录,再取其中的缓存类子目录:
///   - `steamapps\shadercache`:着色器预缓存(可重建)
///   - `steamapps\downloading`:下载中的临时分块(删除会取消进行中的下载)
///   - `appcache\httpcache`:客户端网页缓存
/// **不碰** `steamapps\common`(游戏本体)。读不到注册表一律返回空。
#[cfg(windows)]
pub fn steam_cache_dirs() -> Vec<PathBuf> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let Ok(key) = hkcu.open_subkey(r"Software\Valve\Steam") else {
        return Vec::new();
    };
    let steam_path: String = match key.get_value("SteamPath") {
        Ok(v) => v,
        Err(_) => return Vec::new(),
    };
    let root = PathBuf::from(steam_path.replace('/', "\\"));

    let mut out = Vec::new();
    for sub in [
        "steamapps\\shadercache",
        "steamapps\\downloading",
        "appcache\\httpcache",
    ] {
        let p = root.join(sub);
        if p.is_dir() {
            push_unique(&mut out, p);
        }
    }
    out
}

#[cfg(not(windows))]
pub fn steam_cache_dirs() -> Vec<PathBuf> {
    Vec::new()
}

/// Firefox 缓存目录探测。
///
/// 布局:`%LOCALAPPDATA%\Mozilla\Firefox\Profiles\<配置名>\cache2`(缓存与磁盘缓存分离,
/// 缓存在 LocalAppData 而非 Roaming)。为每个配置返回其 `cache2` 目录。
/// 只碰缓存,**不碰** Roaming 下的书签 / 密码 / 历史 / Cookie。
pub fn firefox_cache_dirs() -> Vec<PathBuf> {
    let profiles = localappdata().join("Mozilla/Firefox/Profiles");
    let mut out = Vec::new();
    let Ok(rd) = std::fs::read_dir(&profiles) else {
        return out;
    };
    for e in rd.flatten() {
        let p = e.path();
        if !p.is_dir() {
            continue;
        }
        // 每个配置目录下的磁盘缓存
        for sub in ["cache2", "startupCache"] {
            let c = p.join(sub);
            if c.is_dir() {
                push_unique(&mut out, c);
            }
        }
    }
    out
}

/// 通用:在 `root` 下枚举满足 `accept(产品目录名)` 的产品目录,
/// 返回其中存在的缓存类子目录(caches/index/log/tmp)。探测失败返回空。
fn product_cache_dirs(root: &PathBuf, accept: impl Fn(&str) -> bool) -> Vec<PathBuf> {
    const SUBS: [&str; 4] = ["caches", "index", "log", "tmp"];
    let mut out = Vec::new();
    let Ok(rd) = std::fs::read_dir(root) else {
        return out;
    };
    for e in rd.flatten() {
        let p = e.path();
        if !p.is_dir() {
            continue;
        }
        let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if name.is_empty() || !accept(name) {
            continue;
        }
        for sub in SUBS {
            let c = p.join(sub);
            if c.is_dir() {
                push_unique(&mut out, c);
            }
        }
    }
    out
}

/// 达芬奇全局缓存根目录探测。
///
/// 达芬奇的缓存/代理位置可在 偏好设置 → Media Storage 中修改,
/// 该设置持久化在配置文件中。不同版本字段名/文件位置略有差异,
/// 这里对常见位置做尽力而为的解析:
///   %APPDATA%\Blackmagic Design\DaVinci Resolve\Support\.../*.plist / config
///
/// 返回探测到的"缓存根目录"列表(可能有多个候选)。
pub fn davinci_cache_roots() -> Vec<PathBuf> {
    let support = appdata().join("Blackmagic Design/DaVinci Resolve/Support");
    if !support.exists() {
        return Vec::new();
    }

    let mut roots: Vec<PathBuf> = Vec::new();

    // 遍历 Support 下可能承载配置的文件,提取形似缓存路径的字段值。
    // 达芬奇配置多为 key/value 或 plist 文本,统一按"找路径样式的行"处理。
    for cfg in candidate_config_files(&support) {
        if let Ok(text) = std::fs::read_to_string(&cfg) {
            for path in extract_paths_for_keys(
                &text,
                &["CacheClip", "ProxyMedia", "GalleryStillsLocation", "MediaStorage"],
            ) {
                let p = PathBuf::from(&path);
                // 只接受存在的目录,避免把无效字符串当路径
                if p.is_dir() {
                    push_unique(&mut roots, p);
                } else if let Some(parent) = p.parent() {
                    if parent.is_dir() {
                        push_unique(&mut roots, parent.to_path_buf());
                    }
                }
            }
        }
    }

    roots
}

fn candidate_config_files(support: &PathBuf) -> Vec<PathBuf> {
    let mut files = Vec::new();
    // 常见:Resolve 的配置目录中的 .plist / config 文本
    let dirs = [
        support.clone(),
        support.join("Resolve Disk Database"),
        support.join("configs"),
    ];
    for d in dirs {
        if let Ok(rd) = std::fs::read_dir(&d) {
            for e in rd.flatten() {
                let p = e.path();
                if p.is_file() {
                    let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    let lower = name.to_ascii_lowercase();
                    if lower.ends_with(".plist")
                        || lower.ends_with(".config")
                        || lower == "config"
                        || lower.contains("settings")
                    {
                        files.push(p);
                    }
                }
            }
        }
    }
    files
}

/// 从配置文本里,抽取与给定 key 相关联的、看起来像绝对路径的值。
/// 兼容 plist(<key>X</key><string>路径</string>)与 key=value 两种粗略形态。
fn extract_paths_for_keys(text: &str, keys: &[&str]) -> Vec<String> {
    let mut out = Vec::new();
    for key in keys {
        // plist 形态:key 后邻近出现 <string>...</string>
        if let Some(kpos) = text.find(key) {
            let tail = &text[kpos..];
            if let Some(s) = between(tail, "<string>", "</string>") {
                if looks_like_windows_path(&s) {
                    out.push(s);
                }
            }
        }
        // key=value / key : "value" 形态
        for line in text.lines() {
            if line.contains(key) {
                if let Some(v) = value_after_separator(line) {
                    if looks_like_windows_path(&v) {
                        out.push(v);
                    }
                }
            }
        }
    }
    out
}

fn between(hay: &str, start: &str, end: &str) -> Option<String> {
    let s = hay.find(start)? + start.len();
    let e = hay[s..].find(end)? + s;
    Some(hay[s..e].trim().to_string())
}

fn value_after_separator(line: &str) -> Option<String> {
    // 取最后一个 '=' 或 ':' 之后的内容,去引号
    let idx = line.rfind('=').or_else(|| line.rfind(':'))?;
    let raw = line[idx + 1..].trim().trim_matches(|c| c == '"' || c == '\'' || c == ',');
    if raw.is_empty() {
        None
    } else {
        Some(raw.to_string())
    }
}

fn looks_like_windows_path(s: &str) -> bool {
    // 形如 C:\... 或 \\server\...
    let b = s.as_bytes();
    (b.len() >= 3 && b[1] == b':' && (b[2] == b'\\' || b[2] == b'/'))
        || s.starts_with("\\\\")
}

fn push_unique(v: &mut Vec<PathBuf>, p: PathBuf) {
    if !v.contains(&p) {
        v.push(p);
    }
}
