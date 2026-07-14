//! JSON 规则库加载器。
//!
//! 规则以声明式 JSON 描述(路径含 %ENV% 占位符),编译时 include 进二进制。
//! 需要代码逻辑的探测(如读达芬奇配置)通过 `detect` 字段按名引用 Rust 函数。
//!
//! 设计目标:新增一款软件的清理规则 = 往 JSON 加一段,无需改 Rust。

use crate::types::{Privilege, Risk, Tier};
use serde::Deserialize;
use std::path::PathBuf;

/// 单条清理目标(对应界面上的一个可清理类别)。
#[derive(Debug, Clone, Deserialize)]
pub struct RuleTarget {
    /// 类别 id,全局唯一(如 "davinci-proxy")
    pub id: String,
    /// 默认路径,支持 %APPDATA% / %LOCALAPPDATA% / %WINDIR% / %TEMP% / %USERPROFILE%
    /// / %PROGRAMFILES% / %PROGRAMFILES(X86)% / %PROGRAMDATA% 占位
    #[serde(default)]
    pub paths: Vec<String>,
    pub risk: Risk,
    #[serde(default = "default_privilege")]
    pub privilege: Privilege,
    #[serde(default = "default_tier")]
    pub tier: Tier,
    #[serde(default = "default_true")]
    pub previewable: bool,
    /// 探测函数名(留空则无探测)。当前支持:"davinci"
    #[serde(default)]
    pub detect: Option<String>,
    /// 探测到根目录后追加的子目录(配合 detect 使用)
    #[serde(default)]
    pub subdir: Option<String>,
    /// 文件名过滤器名(留空则不过滤)。当前支持:"thumbcache"
    #[serde(default)]
    pub name_filter: Option<String>,
    /// 特殊处理标记(如 "recycle-bin")
    #[serde(default)]
    pub special: Option<String>,
    /// 是否支持手动指定路径(通常自定义路径类软件为 true)
    #[serde(default)]
    pub supports_override: bool,
    /// 列出的任一进程正在运行时,整类跳过清理(如浏览器开着时清其缓存
    /// 会损坏缓存索引,导致已打开页面刷新后显示异常)
    #[serde(default)]
    pub skip_if_running: Vec<String>,
}

/// 一款软件的规则(含多个清理目标)。
#[derive(Debug, Clone, Deserialize)]
pub struct AppRule {
    /// 软件 id(如 "davinci"),用于分组
    pub app: String,
    /// 分组类别(如 "video" / "3d" / "dev"),用于专项页归类
    #[serde(default)]
    pub group: String,
    /// 软件展示名(双语在前端语言包,这里存英文原名兜底)
    pub name: String,
    /// 检测软件是否安装:任一路径存在即视为已安装(留空则总是展示)
    #[serde(default)]
    pub detect_installed: Vec<String>,
    pub targets: Vec<RuleTarget>,
}

/// 规则库根。
#[derive(Debug, Clone, Deserialize)]
pub struct RuleLibrary {
    pub apps: Vec<AppRule>,
}

fn default_privilege() -> Privilege {
    Privilege::Normal
}
fn default_tier() -> Tier {
    Tier::Standard
}
fn default_true() -> bool {
    true
}

/// 展开路径中的环境变量占位符。
pub fn expand_env(raw: &str) -> PathBuf {
    let mut s = raw.to_string();
    let subs: [(&str, PathBuf); 8] = [
        ("%LOCALAPPDATA%", env_dir("LOCALAPPDATA", "AppData/Local")),
        ("%APPDATA%", env_dir("APPDATA", "AppData/Roaming")),
        ("%WINDIR%", std::env::var_os("WINDIR").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("C:\\Windows"))),
        ("%TEMP%", std::env::temp_dir()),
        // 注意:含括号的 %PROGRAMFILES(X86)% 须排在 %PROGRAMFILES% 之前替换,避免前缀误伤
        ("%PROGRAMFILES(X86)%", std::env::var_os("ProgramFiles(x86)").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("C:\\Program Files (x86)"))),
        ("%PROGRAMFILES%", std::env::var_os("ProgramFiles").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("C:\\Program Files"))),
        ("%PROGRAMDATA%", std::env::var_os("ProgramData").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("C:\\ProgramData"))),
        ("%USERPROFILE%", home()),
    ];
    for (token, val) in subs {
        if s.contains(token) {
            s = s.replace(token, &val.to_string_lossy());
        }
    }
    PathBuf::from(s)
}

fn home() -> PathBuf {
    std::env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("C:\\"))
}
fn env_dir(var: &str, fallback: &str) -> PathBuf {
    std::env::var_os(var)
        .map(PathBuf::from)
        .unwrap_or_else(|| home().join(fallback))
}

/// 内置规则库(编译时打入二进制)。
const RULES_JSON: &str = include_str!("../../rules/rules.json");

/// 加载并解析规则库。解析失败返回空库(不 panic),打印错误。
pub fn load_library() -> RuleLibrary {
    match serde_json::from_str::<RuleLibrary>(RULES_JSON) {
        Ok(lib) => lib,
        Err(e) => {
            eprintln!("[rules] 规则库解析失败: {e}");
            RuleLibrary { apps: vec![] }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 解析失败时 load_library 只打日志并返回空库,应用照常启动但所有规则消失;
    /// 编辑 rules.json 手滑不会有任何编译期信号,靠这个测试兜住。
    /// 顺带保证类别 id 全局唯一(i18n 键和大小缓存都按 id 索引)。
    #[test]
    fn builtin_rules_parse_and_ids_unique() {
        let lib = load_library();
        assert!(!lib.apps.is_empty(), "内置规则库解析失败或为空");
        let mut seen = std::collections::HashSet::new();
        for app in &lib.apps {
            for t in &app.targets {
                assert!(seen.insert(t.id.clone()), "类别 id 重复: {}", t.id);
            }
        }
    }
}

use serde::Serialize;

/// 发给专项页的软件视图:含是否安装、分组、目标类别列表。
#[derive(Debug, Clone, Serialize)]
pub struct AppView {
    pub app: String,
    pub group: String,
    pub name: String,
    pub installed: bool,
    pub targets: Vec<TargetView>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TargetView {
    pub id: String,
    pub risk: Risk,
    pub supports_override: bool,
    /// 当前解析到的实际路径(手动 > 探测 > 默认)
    pub resolved: Vec<String>,
    /// 是否存在手动覆盖
    pub has_override: bool,
    /// 首个解析路径在磁盘上是否真实存在(默认路径可能只是猜测,
    /// 软件没装到默认位置或从未产生缓存时目录不存在)
    pub exists: bool,
}

/// 构建专项页视图。overrides 来自配置。
pub fn app_views(overrides: &std::collections::HashMap<String, Vec<String>>) -> Vec<AppView> {
    let lib = load_library();
    let mut views = Vec::new();
    for app in lib.apps {
        // 系统项(windows / 浏览器)不在"软件专项"页展示,它们属于基础清理
        if app.group == "system" || app.group == "browser" {
            continue;
        }
        let installed = app.detect_installed.is_empty()
            || app
                .detect_installed
                .iter()
                .any(|p| expand_env(p).exists());

        let mut targets = Vec::new();
        for t in &app.targets {
            let def = crate::scan::categories::find(&t.id);
            let resolved = def
                .as_ref()
                .map(|d| {
                    d.resolved_paths(overrides)
                        .into_iter()
                        .map(|p| p.to_string_lossy().into_owned())
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            let exists = resolved
                .first()
                .map(|p| std::path::Path::new(p).exists())
                .unwrap_or(false);
            targets.push(TargetView {
                id: t.id.clone(),
                risk: t.risk,
                supports_override: t.supports_override,
                resolved,
                has_override: overrides.contains_key(&t.id),
                exists,
            });
        }

        views.push(AppView {
            app: app.app.clone(),
            group: app.group.clone(),
            name: app.name.clone(),
            installed,
            targets,
        });
    }
    views
}
