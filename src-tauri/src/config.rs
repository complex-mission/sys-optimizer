//! 本地配置读写(条款同意、横幅 30 天再现、语言、累计统计)。
//! 存于系统配置目录下 cache-insight/config.json。

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    /// 是否已同意使用条款
    pub terms_accepted: bool,
    /// 语言:"zh-CN" / "en-US" / "system"
    pub language: String,
    /// 默认扫描挡位:"quick" / "standard" / "deep"
    pub default_tier: String,
    /// 横幅上次收起的 Unix 秒(0 = 从未收起,应显示)
    pub banner_dismissed_at: i64,
    /// 累计释放字节
    pub total_freed_bytes: u64,
    /// 累计清理次数
    pub total_clean_count: u64,
    /// 手动覆盖的路径:类别 id -> 用户指定的路径列表(优先级最高)
    pub path_overrides: std::collections::HashMap<String, Vec<String>>,
    /// 谨慎模式:高风险(琥珀色 / expensive)项删除时移入回收站而非永久删除。
    /// 默认开启——这些项重建代价高,值得保留反悔余地(缓存类始终永久删除以立即释放空间)。
    pub expensive_to_trash: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            terms_accepted: false,
            language: "system".into(),
            default_tier: "standard".into(),
            banner_dismissed_at: 0,
            total_freed_bytes: 0,
            total_clean_count: 0,
            path_overrides: std::collections::HashMap::new(),
            expensive_to_trash: true,
        }
    }
}

fn config_dir() -> PathBuf {
    // %APPDATA%\cache-insight
    std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::temp_dir())
        .join("cache-insight")
}

fn config_path() -> PathBuf {
    config_dir().join("config.json")
}

pub fn load() -> AppConfig {
    let path = config_path();
    match std::fs::read_to_string(&path) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => AppConfig::default(),
    }
}

pub fn save(cfg: &AppConfig) -> Result<(), String> {
    let dir = config_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let s = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    std::fs::write(config_path(), s).map_err(|e| e.to_string())
}

/// 横幅是否应显示:从未收起,或距上次收起已超过 30 天。
pub fn should_show_banner(cfg: &AppConfig) -> bool {
    if cfg.banner_dismissed_at == 0 {
        return true;
    }
    let now = now_secs();
    now.saturating_sub(cfg.banner_dismissed_at) > 30 * 24 * 60 * 60
}

pub fn now_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}
