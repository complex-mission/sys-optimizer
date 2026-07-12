//! 全应用通用数据结构,序列化后经 Tauri 传给前端。
use serde::{Deserialize, Serialize};

/// 风险三级体系(需求文档第四节全局约定)。
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Risk {
    /// 删除无感,自动重建 —— 默认勾选
    Cache,
    /// 不丢数据但重建耗时/需重新下载 —— 默认不勾选 + 行内警告
    Expensive,
    /// 用户内容或不宜自动处理 —— 只显示体积 + 打开位置,无删除按钮
    Report,
}

/// 所需权限。普通权限项在无管理员时仍可清理;管理员项在提权后才完整。
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Privilege {
    Normal,
    Admin,
}

/// 扫描挡位(需求文档第二节)。
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Tier {
    Quick,
    Standard,
    Deep,
}

/// 一个可清理类别的静态元信息(发给前端渲染列表)。
#[derive(Debug, Clone, Serialize)]
pub struct CategoryMeta {
    pub id: String,
    /// 双语名:{ "zh": "...", "en": "..." }
    pub name_key: String,
    pub desc_key: String,
    pub risk: Risk,
    pub privilege: Privilege,
    /// 属于哪个挡位起可见(quick 最先)
    pub tier: Tier,
    /// 是否支持文件级预览(回收站等特殊项为 false)
    pub previewable: bool,
    /// 是否支持手动指定路径(路径可被用户自定义的软件,如达芬奇代理)
    pub supports_override: bool,
}

/// 单类别扫描结果。
#[derive(Debug, Clone, Serialize)]
pub struct CategoryScanResult {
    pub id: String,
    pub bytes: u64,
    pub files: u64,
}

/// 文件级预览的单条(按需分页返回,避免一次传数万条)。
#[derive(Debug, Clone, Serialize)]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub bytes: u64,
    /// 修改时间(Unix 秒);读不到为 0
    pub mtime: i64,
}

/// 一页预览。
#[derive(Debug, Clone, Serialize)]
pub struct PreviewPage {
    pub id: String,
    pub total: u64,
    pub offset: u64,
    pub entries: Vec<FileEntry>,
}

/// 清理单类别的结果。
#[derive(Debug, Clone, Serialize)]
pub struct CleanResult {
    pub id: String,
    pub freed_bytes: u64,
    pub deleted_files: u64,
    /// 被占用/无权限而跳过的数量
    pub skipped: u64,
}

/// 扫描进度事件(经 Tauri emit 推送给前端)。
#[derive(Debug, Clone, Serialize)]
pub struct ScanProgress {
    pub done: usize,
    pub total: usize,
    /// 当前正在扫描的类别 id(用于界面显示"正在扫描 X")
    pub current: String,
    /// 该类别的结果(开始事件时为占位空结果)
    pub result: CategoryScanResult,
}

/// 磁盘占用(供空间分析进度条与系统信息使用)。
#[derive(Debug, Clone, Serialize, Default)]
pub struct DiskUsage {
    pub total: u64,
    pub free: u64,
    pub used: u64,
}

/// 清理进度事件。
#[derive(Debug, Clone, Serialize)]
pub struct CleanProgress {
    pub done: usize,
    pub total: usize,
    pub result: CleanResult,
}

/// 空间分析:一个目录/文件节点(发给前端构建 treemap 与下钻列表)。
#[derive(Debug, Clone, Serialize)]
pub struct SpaceNode {
    pub name: String,
    pub path: String,
    pub bytes: u64,
    pub is_dir: bool,
    /// 直接子节点数(仅目录),用于提示"内含 N 项"
    pub children: u32,
}

/// 空间分析里"值得关注但不建议自动清理"的已知位置(模块 G 辅助)。
/// 这些目录被系统服务独占、或删除有风险,不做成可清理类别,
/// 而是让用户在空间分析里一键跳转查看、自行判断。
#[derive(Debug, Clone, Serialize)]
pub struct NotableLocation {
    /// 稳定 id(对应前端名称与说明文案)
    pub id: String,
    /// 已展开的绝对路径
    pub path: String,
}

/// 磁盘信息(用于空间分析页显示磁盘类型)
#[derive(Debug, Clone, Serialize)]
pub struct DriveInfo {
    /// 盘符(如 "C:\")
    pub letter: String,
    /// 磁盘类型: "local" / "network" / "removable" / "unknown"
    pub drive_type: String,
    /// 卷标(可选)
    pub label: String,
}

/// 一层目录的分析结果(下钻时按需返回单层,不预先展开整棵树)。
#[derive(Debug, Clone, Serialize)]
pub struct SpaceLevel {
    /// 当前目录路径
    pub path: String,
    /// 当前目录总大小
    pub total: u64,
    /// 子节点(已按大小降序;超出 top_n 的合并为一个"其他"节点)
    pub nodes: Vec<SpaceNode>,
    /// 是否被"其他"合并过(前端提示)
    pub has_other: bool,
}

/// 空间扫描进度事件。
#[derive(Debug, Clone, Serialize)]
pub struct SpaceProgress {
    /// 已累计扫描的字节
    pub scanned_bytes: u64,
    /// 已扫描的条目数
    pub scanned_items: u64,
    /// 当前正在扫描的路径(用于展示"正在扫描 ...")
    pub current: String,
    /// 是否完成
    pub done: bool,
}

/// 大文件扫描:单个大文件条目。
#[derive(Debug, Clone, Serialize)]
pub struct LargeFile {
    pub path: String,
    pub name: String,
    pub bytes: u64,
    pub mtime: i64,
    /// 扩展名(小写,无点),用于前端分类/图标
    pub ext: String,
}

/// 大文件扫描进度事件。
#[derive(Debug, Clone, Serialize)]
pub struct LargeProgress {
    pub scanned_items: u64,
    pub found: u64,
    pub current: String,
    pub done: bool,
}

/// 重复文件:一组内容相同的文件。
#[derive(Debug, Clone, Serialize)]
pub struct DuplicateGroup {
    /// 组内单文件大小
    pub bytes: u64,
    /// 组内文件路径列表(≥2)
    pub files: Vec<DuplicateFile>,
    /// 该组可回收空间 = bytes * (files.len() - 1)
    pub reclaimable: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DuplicateFile {
    pub path: String,
    pub name: String,
    pub mtime: i64,
}

/// 重复文件扫描进度事件。
#[derive(Debug, Clone, Serialize)]
pub struct DupProgress {
    /// 阶段:"scanning"(遍历) / "sampling"(采样哈希) / "hashing"(全量哈希) / "done"
    pub phase: String,
    /// 该阶段已处理数
    pub processed: u64,
    /// 该阶段总数(遍历阶段可能为 0)
    pub total: u64,
    pub done: bool,
}

/// 启动项来源。
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum StartupSource {
    /// 注册表 Run 键
    Registry,
    /// 启动文件夹(快捷方式)
    Folder,
    /// 计划任务
    Task,
}

/// 启动项作用域。
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum StartupScope {
    /// 当前用户(HKCU / 用户启动文件夹)
    User,
    /// 所有用户(HKLM / 公共启动文件夹,需管理员)
    Machine,
}

/// 一个启动项。
#[derive(Debug, Clone, Serialize)]
pub struct StartupItem {
    /// 稳定标识:source|scope|name,用于启用/禁用时定位
    pub id: String,
    pub name: String,
    /// 启动命令 / 目标路径
    pub command: String,
    pub source: StartupSource,
    pub scope: StartupScope,
    pub enabled: bool,
}

/// 卸载残留:一个疑似残留目录(只报告,不提供删除)。
#[derive(Debug, Clone, Serialize)]
pub struct LeftoverItem {
    pub path: String,
    pub name: String,
    pub bytes: u64,
    /// 所在位置类别(如 "Program Files" / "AppData")
    pub location: String,
    /// 疑似度:high / medium(启发式置信,仅供参考)
    pub confidence: String,
    /// 最近修改时间(Unix 秒),越久未动越可能是残留
    pub mtime: i64,
}

/// 卸载残留扫描进度。
#[allow(dead_code)] // 预留:卸载残留流式扫描进度事件,尚未接线
#[derive(Debug, Clone, Serialize)]
pub struct LeftoverProgress {
    pub scanned: u64,
    pub found: u64,
    pub done: bool,
}

/// 系统级空间项(模块 H)。
#[derive(Debug, Clone, Serialize)]
pub struct SystemSpaceItem {
    /// 稳定 id:hibernation / restore-points / windows-old / winsxs
    pub id: String,
    /// 当前可回收/占用的估计字节(未知为 0)
    pub bytes: u64,
    /// 该项当前是否可执行操作(如休眠已关闭则不可再关)
    pub available: bool,
    /// 状态描述键(前端据此显示,如已启用/已禁用)
    pub status: String,
}

/// 系统级操作结果。
#[derive(Debug, Clone, Serialize)]
pub struct SystemSpaceResult {
    pub id: String,
    pub success: bool,
    /// 面向用户的结果说明(成功/失败原因)
    pub message: String,
}
