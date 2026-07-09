//! 类别定义,由 JSON 规则库(rules.rs)构建。
//!
//! CategoryDef 持有 owned 数据(来自 JSON),路径为含 %ENV% 占位符的原始串,
//! 在 resolved_paths 中展开。探测函数与文件名过滤器按名字查注册表。

use crate::scan::detect;
use crate::scan::rules::{self, expand_env};
use crate::types::{CategoryMeta, Tier};
use std::collections::HashMap;
use std::path::PathBuf;

/// 类别的运行时定义。路径三级解析:手动覆盖 > 自动探测 > 默认。
#[derive(Clone)]
pub struct CategoryDef {
    pub meta: CategoryMeta,
    /// 默认路径(含 %ENV% 占位符的原始串)
    pub default_paths: Vec<String>,
    /// 探测函数名(如 "davinci" / "chromium"),留空则无探测
    pub detect: Option<String>,
    /// 探测到根目录后追加的子目录
    pub subdir: Option<String>,
    /// 文件名过滤器名(如 "thumbcache")
    pub name_filter: Option<String>,
    /// 特殊处理标记(如 "recycle-bin")
    pub special: Option<String>,
}

impl CategoryDef {
    /// 三级优先解析最终路径。overrides 为用户手动指定(按类别 id)。
    pub fn resolved_paths(&self, overrides: &HashMap<String, Vec<String>>) -> Vec<PathBuf> {
        // 1. 手动覆盖优先
        if let Some(list) = overrides.get(&self.meta.id) {
            let paths: Vec<PathBuf> =
                list.iter().map(PathBuf::from).filter(|p| p.exists()).collect();
            if !paths.is_empty() {
                return paths;
            }
        }
        // 2. 自动探测
        if let Some(name) = &self.detect {
            // chromium 特殊:对默认路径里的 User Data 展开各 Profile
            if name == "chromium" {
                let mut out = Vec::new();
                for raw in &self.default_paths {
                    out.extend(chromium_caches(&expand_env(raw)));
                }
                if !out.is_empty() {
                    return out;
                }
            } else {
                let roots = run_detect(name);
                if !roots.is_empty() {
                    let mut out = Vec::new();
                    for root in roots {
                        let p = match &self.subdir {
                            Some(sub) => root.join(sub),
                            None => root,
                        };
                        if p.exists() && !out.contains(&p) {
                            out.push(p);
                        }
                    }
                    if !out.is_empty() {
                        return out;
                    }
                }
            }
        }
        // 3. 默认路径兜底(展开占位符)
        self.default_paths.iter().map(|s| expand_env(s)).collect()
    }

    /// 该类别的文件名过滤谓词(按名字查)。
    pub fn filter_pred(&self) -> Option<Box<dyn Fn(&str) -> bool>> {
        match self.name_filter.as_deref() {
            Some("thumbcache") => Some(Box::new(|n: &str| {
                let l = n.to_ascii_lowercase();
                (l.starts_with("thumbcache_") || l.starts_with("iconcache_")) && l.ends_with(".db")
            })),
            Some("blender-temp") => Some(Box::new(|n: &str| {
                let l = n.to_ascii_lowercase();
                l.starts_with("blender_") || l.ends_with(".blend1") || l.ends_with(".blend2")
            })),
            _ => None,
        }
    }
}

/// 探测函数注册表:按名字分发到 detect.rs 的具体实现。
fn run_detect(name: &str) -> Vec<PathBuf> {
    match name {
        "davinci" => detect::davinci_cache_roots(),
        "jetbrains" => detect::jetbrains_cache_dirs(),
        "androidstudio" => detect::android_studio_cache_dirs(),
        "firefox" => detect::firefox_cache_dirs(),
        "steam" => detect::steam_cache_dirs(),
        _ => Vec::new(),
    }
}

/// Chromium 系浏览器:把 User Data 展开为各 Profile 的 Cache 子目录。
pub fn chromium_caches(user_data: &PathBuf) -> Vec<PathBuf> {
    let mut out = Vec::new();
    if let Ok(rd) = std::fs::read_dir(user_data) {
        for e in rd.flatten() {
            let p = e.path();
            if !p.is_dir() {
                continue;
            }
            let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if name == "Default" || name.starts_with("Profile ") {
                for sub in ["Cache", "Code Cache", "GPUCache"] {
                    let c = p.join(sub);
                    if c.exists() {
                        out.push(c);
                    }
                }
            }
        }
    }
    out
}

fn meta_from(t: &rules::RuleTarget) -> CategoryMeta {
    CategoryMeta {
        id: t.id.clone(),
        name_key: format!("cat.{}.name", t.id),
        desc_key: format!("cat.{}.desc", t.id),
        risk: t.risk,
        privilege: t.privilege,
        tier: t.tier,
        previewable: t.previewable,
        supports_override: t.supports_override,
    }
}

/// 从 JSON 规则库构建全部类别定义。
pub fn all_categories() -> Vec<CategoryDef> {
    let lib = rules::load_library();
    let mut out = Vec::new();
    for app in lib.apps {
        for t in app.targets {
            out.push(CategoryDef {
                meta: meta_from(&t),
                default_paths: t.paths.clone(),
                detect: t.detect.clone(),
                subdir: t.subdir.clone(),
                name_filter: t.name_filter.clone(),
                special: t.special.clone(),
            });
        }
    }
    out
}

/// 取指定挡位应包含的类别 id(累进)。
pub fn ids_for_tier(tier: Tier) -> Vec<String> {
    all_categories()
        .into_iter()
        .filter(|c| match tier {
            Tier::Quick => c.meta.tier == Tier::Quick,
            Tier::Standard => matches!(c.meta.tier, Tier::Quick | Tier::Standard),
            Tier::Deep => true,
        })
        .map(|c| c.meta.id)
        .collect()
}

pub fn find(id: &str) -> Option<CategoryDef> {
    all_categories().into_iter().find(|c| c.meta.id == id)
}
