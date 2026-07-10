//! scan 模块对外接口:聚合类别定义、引擎与回收站特殊处理。

pub mod categories;
pub mod detect;
pub mod dup;
pub mod engine;
pub mod large;
pub mod leftover;
pub mod recycle;
pub mod rules;
pub mod space;
pub mod startup;
pub mod system;

use crate::types::*;
use engine::{clean_dir, preview_dir, scan_dir, DeleteMode};
use std::collections::{HashMap, HashSet};

/// 读取用户手动覆盖路径(来自配置)。
fn overrides() -> HashMap<String, Vec<String>> {
    crate::config::load().path_overrides
}

/// 列出全部类别元信息(供前端渲染)。
pub fn list_categories() -> Vec<CategoryMeta> {
    categories::all_categories()
        .into_iter()
        .map(|c| c.meta)
        .collect()
}

/// 扫描单个类别。
pub fn scan_one(id: &str) -> CategoryScanResult {
    let Some(def) = categories::find(id) else {
        return CategoryScanResult { id: id.into(), bytes: 0, files: 0 };
    };

    if def.special.as_deref() == Some("recycle-bin") {
        let (bytes, files) = recycle::recycle_bin_size();
        return CategoryScanResult { id: id.into(), bytes, files };
    }

    let pred = def.filter_pred();

    let mut bytes = 0u64;
    let mut files = 0u64;
    for dir in def.resolved_paths(&overrides()) {
        let (b, f) = scan_dir(&dir, pred.as_deref());
        bytes += b;
        files += f;
    }
    CategoryScanResult { id: id.into(), bytes, files }
}

/// 取某类别的文件预览页。
pub fn preview_one(id: &str, offset: u64, limit: u64) -> PreviewPage {
    let Some(def) = categories::find(id) else {
        return PreviewPage { id: id.into(), total: 0, offset, entries: vec![] };
    };
    // 特殊项(回收站)不支持预览
    if def.special.is_some() || !def.meta.previewable {
        return PreviewPage { id: id.into(), total: 0, offset, entries: vec![] };
    }

    let pred = def.filter_pred();

    // 骨架:多路径时预览第一个主路径(足以覆盖 temp 等单路径类别);
    // 多路径类别(如浏览器多 Profile)的合并预览留待后续完善。
    let paths = def.resolved_paths(&overrides());
    if let Some(dir) = paths.first() {
        preview_dir(id, dir, pred.as_deref(), offset, limit)
    } else {
        PreviewPage { id: id.into(), total: 0, offset, entries: vec![] }
    }
}

/// 清理单个类别。`keep` 为反选保留的绝对路径集合。
pub fn clean_one(id: &str, keep: &HashSet<String>) -> CleanResult {
    let Some(def) = categories::find(id) else {
        return CleanResult { id: id.into(), freed_bytes: 0, deleted_files: 0, skipped: 0 };
    };

    if def.special.as_deref() == Some("recycle-bin") {
        let (freed_bytes, deleted_files) = recycle::clear_recycle_bin();
        return CleanResult { id: id.into(), freed_bytes, deleted_files, skipped: 0 };
    }

    // report 级永不删除(双保险:前端无按钮,后端也拒绝)
    if def.meta.risk == Risk::Report {
        return CleanResult { id: id.into(), freed_bytes: 0, deleted_files: 0, skipped: 0 };
    }

    // 删除模式按风险等级 + 用户偏好决定:
    //   - cache(蓝色):始终永久删除,立即释放空间(缓存本就该被清掉);
    //   - expensive(琥珀色):默认移入回收站(谨慎模式),用户可在设置里关闭;
    //   - report(灰色):前面已提前返回,永不删除。
    let mode = if def.meta.risk == Risk::Expensive && crate::config::load().expensive_to_trash {
        DeleteMode::Trash
    } else {
        DeleteMode::Permanent
    };

    let pred = def.filter_pred();

    let mut freed = 0u64;
    let mut deleted = 0u64;
    let mut skipped = 0u64;
    for dir in def.resolved_paths(&overrides()) {
        let r = clean_dir(&dir, pred.as_deref(), &mode, keep);
        freed += r.freed_bytes;
        deleted += r.deleted_files;
        skipped += r.skipped;
    }
    CleanResult { id: id.into(), freed_bytes: freed, deleted_files: deleted, skipped }
}
