// 前端与 Rust 后端的桥接层。集中封装 invoke 与事件监听,并定义共享类型。

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type Risk = "cache" | "expensive" | "report";
export type Privilege = "normal" | "admin";
export type Tier = "quick" | "standard" | "deep";

export interface CategoryMeta {
  id: string;
  name_key: string;
  desc_key: string;
  risk: Risk;
  privilege: Privilege;
  tier: Tier;
  previewable: boolean;
  supports_override: boolean;
}

export interface CategoryScanResult {
  id: string;
  bytes: number;
  files: number;
}

export interface FileEntry {
  path: string;
  name: string;
  bytes: number;
  mtime: number;
}

export interface PreviewPage {
  id: string;
  total: number;
  offset: number;
  entries: FileEntry[];
}

export interface CleanResult {
  id: string;
  freed_bytes: number;
  deleted_files: number;
  skipped: number;
  /** 因该进程正在运行而整类跳过(如浏览器开着时的浏览器缓存);null 表示正常执行 */
  blocked_by: string | null;
}

export interface ScanProgress {
  done: number;
  total: number;
  current: string;
  result: CategoryScanResult;
}

export interface DiskUsage {
  total: number;
  free: number;
  used: number;
}

export interface CleanProgress {
  done: number;
  total: number;
  result: CleanResult;
}

export interface AppConfig {
  terms_accepted: boolean;
  language: string;
  default_tier: string;
  banner_dismissed_at: number;
  total_freed_bytes: number;
  total_clean_count: number;
  path_overrides: Record<string, string[]>;
  expensive_to_trash: boolean;
}

const STATS_CHANGED_EVENT = "cache-insight:stats-changed";
const APP_SIZE_CACHE_CHANGED_EVENT = "cache-insight:app-size-cache-changed";
const DEFAULT_TIER_CHANGED_EVENT = "cache-insight:default-tier-changed";

function notifyStatsChanged() {
  window.dispatchEvent(new Event(STATS_CHANGED_EVENT));
}

function notifyAppSizeCacheChanged() {
  window.dispatchEvent(new Event(APP_SIZE_CACHE_CHANGED_EVENT));
}

export interface AboutInfo {
  version: string;
  build_date: string;
  copyright: string;
  homepage: string;
}

export interface TargetView {
  id: string;
  risk: Risk;
  supports_override: boolean;
  resolved: string[];
  has_override: boolean;
  exists: boolean;
}

export interface TargetSizeCache {
  bytes: number;
  files: number;
  scanned_at: number;
}

export interface AppView {
  app: string;
  group: string;
  name: string;
  installed: boolean;
  targets: TargetView[];
}

export interface NotableLocation {
  id: string;
  path: string;
}

export interface SpaceNode {
  name: string;
  path: string;
  bytes: number;
  is_dir: boolean;
  children: number;
}

export interface SpaceLevel {
  path: string;
  total: number;
  nodes: SpaceNode[];
  has_other: boolean;
}

export interface SpaceProgress {
  scanned_bytes: number;
  scanned_items: number;
  current: string;
  done: boolean;
}

export interface DriveInfo {
  letter: string;
  drive_type: string;
  label: string;
}

export interface LargeFile {
  path: string;
  name: string;
  bytes: number;
  mtime: number;
  ext: string;
}

export interface LargeProgress {
  scanned_items: number;
  found: number;
  current: string;
  done: boolean;
}

export interface DuplicateFile {
  path: string;
  name: string;
  mtime: number;
}

export interface DuplicateGroup {
  bytes: number;
  files: DuplicateFile[];
  reclaimable: number;
}

export interface DupProgress {
  phase: string;
  processed: number;
  total: number;
  done: boolean;
}

export type StartupSource = "registry" | "folder" | "task";
export type StartupScope = "user" | "machine";

export interface StartupItem {
  id: string;
  name: string;
  command: string;
  source: StartupSource;
  scope: StartupScope;
  enabled: boolean;
}

export interface LeftoverItem {
  path: string;
  name: string;
  bytes: number;
  location: string;
  confidence: string;
  mtime: number;
}

export interface LeftoverReport {
  scanned_dirs: number;
  items: LeftoverItem[];
}

export interface SystemSpaceItem {
  id: string;
  bytes: number;
  available: boolean;
  status: string;
}

export interface SystemSpaceResult {
  id: string;
  success: boolean;
  message: string;
}

export interface MemorySlot {
  locator: string;
  occupied: boolean;
  capacity_bytes: number;
  speed_mhz: number;
  configured_speed_mhz: number;
  kind: string;
  manufacturer: string;
  part_number: string;
}

export interface StorageDisk {
  model: string;
  bytes: number;
  media_type: string;
  bus_type: string;
}

export interface Volume {
  letter: string;
  label: string;
  fs: string;
  total_bytes: number;
  free_bytes: number;
  disk_index: number;
}

export interface DisplayInfo {
  name: string;
  width: number;
  height: number;
  refresh_hz: number;
}

export interface BatteryInfo {
  present: boolean;
  design_capacity: number;
  full_charge_capacity: number;
  health_percent: number;
}

export interface NetworkAdapter {
  name: string;
  mac_address: string;
  ip_addresses: string[];
  speed_mbps: number;
  is_up: boolean;
  adapter_type: string;
  network_name: string;
}

export interface HardwareReport {
  cpu_model: string;
  cpu_cores: number;
  cpu_threads: number;
  cpu_mhz: number;
  board_vendor: string;
  board_model: string;
  bios_version: string;
  gpu_model: string;
  gpu_vram_bytes: number;
  gpu_driver_version: string;
  gpu_driver_date: string;
  memory_slots_total: number;
  memory_slots_used: number;
  memory_total_bytes: number;
  memory_slots: MemorySlot[];
  disks: StorageDisk[];
  volumes: Volume[];
  displays: DisplayInfo[];
  network_adapters: NetworkAdapter[];
  battery: BatteryInfo;
  os_name: string;
  os_version: string;
  os_boot_time: number;
  generated_at: number;
  available: boolean;
}

/* ---------------- 命令封装 ---------------- */

export const api = {
  listCategories: () => invoke<CategoryMeta[]>("list_categories"),
  idsForTier: (tier: Tier) => invoke<string[]>("ids_for_tier", { tier }),
  runScan: async (ids: string[]) => {
    const results = await invoke<CategoryScanResult[]>("run_scan", { ids });
    // 后端会把扫描结果写进软件专项的大小缓存,通知已挂载的软件专项页刷新
    notifyAppSizeCacheChanged();
    return results;
  },
  cancelScan: () => invoke<void>("cancel_scan"),
  cancelTask: (kind: "space" | "large" | "dup") =>
    invoke<void>("cancel_task", { kind }),
  diskUsage: (path: string) => invoke<DiskUsage>("disk_usage", { path }),
  previewCategory: (id: string, offset: number, limit: number) =>
    invoke<PreviewPage>("preview_category", { id, offset, limit }),
  // 类别id -> 正在运行、会导致该类别清理被跳过的进程名(如浏览器缓存)
  checkRunningBlockers: (ids: string[]) =>
    invoke<Record<string, string>>("check_running_blockers", { ids }),
  runClean: async (ids: string[], keepPaths: string[]) => {
    const results = await invoke<CleanResult[]>("run_clean", { ids, keepPaths });
    notifyStatsChanged();
    return results;
  },
  openPath: (path: string) => invoke<void>("open_path", { path }),

  getConfig: () => invoke<AppConfig>("get_config"),
  acceptTerms: () => invoke<void>("accept_terms"),
  shouldShowBanner: () => invoke<boolean>("should_show_banner"),
  dismissBanner: () => invoke<void>("dismiss_banner"),
  setLanguage: (language: string) => invoke<void>("set_language", { language }),
  setDefaultTier: async (tier: string) => {
    await invoke<void>("set_default_tier", { tier });
    // 智能扫描页若停留在挡位选择,同步选中新默认挡位
    window.dispatchEvent(new CustomEvent(DEFAULT_TIER_CHANGED_EVENT, { detail: tier }));
  },
  setExpensiveToTrash: (enabled: boolean) =>
    invoke<void>("set_expensive_to_trash", { enabled }),
  logsDir: () => invoke<string>("logs_dir"),

  // 手动覆盖路径(达芬奇等自定义路径场景)
  setPathOverride: (id: string, paths: string[]) =>
    invoke<void>("set_path_override", { id, paths }),
  resolvedPaths: (id: string) => invoke<string[]>("resolved_paths", { id }),
  appRules: () => invoke<AppView[]>("app_rules"),
  scanAppSize: (id: string) => invoke<TargetSizeCache>("scan_app_size", { id }),
  getAppSizeCache: () => invoke<Record<string, TargetSizeCache>>("get_app_size_cache"),
  listDrives: () => invoke<string[]>("list_drives"),
  listDrivesWithType: () => invoke<DriveInfo[]>("list_drives_with_type"),
  listNotableLocations: () => invoke<NotableLocation[]>("list_notable_locations"),
  analyzeSpace: (path: string, topN: number) =>
    invoke<SpaceLevel>("analyze_space", { path, topN }),
  defaultScanDir: () => invoke<string>("default_scan_dir"),
  scanLargeFiles: (path: string, thresholdMb: number, maxResults: number) =>
    invoke<LargeFile[]>("scan_large_files", { path, thresholdMb, maxResults }),
  deleteLargeFiles: async (paths: string[]) => {
    const result = await invoke<number[]>("delete_large_files", { paths });
    if ((result[0] ?? 0) > 0) notifyStatsChanged();
    return result;
  },
  scanDuplicates: (path: string) =>
    invoke<DuplicateGroup[]>("scan_duplicates", { path }),
  deleteDuplicates: async (paths: string[]) => {
    const result = await invoke<number[]>("delete_duplicates", { paths });
    if ((result[0] ?? 0) > 0) notifyStatsChanged();
    return result;
  },
  listStartup: () => invoke<StartupItem[]>("list_startup"),
  setStartupEnabled: (id: string, enable: boolean) =>
    invoke<void>("set_startup_enabled", { id, enable }),
  detectLeftovers: () => invoke<LeftoverReport>("detect_leftovers"),
  listSystemSpace: () => invoke<SystemSpaceItem[]>("list_system_space"),
  executeSystemSpace: (id: string) =>
    invoke<SystemSpaceResult>("execute_system_space", { id }),
  hardwareReport: () => invoke<HardwareReport>("hardware_report"),

  aboutInfo: () => invoke<AboutInfo>("about_info"),
  openUrl: (url: string) => invoke<void>("open_url", { url }),
  clearLogs: () => invoke<number>("clear_logs"),
  resetStats: async () => {
    await invoke<void>("reset_stats");
    notifyStatsChanged();
  },
};

/* ---------------- 事件 ---------------- */

export function onScanProgress(cb: (p: ScanProgress) => void): Promise<UnlistenFn> {
  return listen<ScanProgress>("scan://progress", (e) => cb(e.payload));
}

export function onCleanProgress(cb: (p: CleanProgress) => void): Promise<UnlistenFn> {
  return listen<CleanProgress>("clean://progress", (e) => cb(e.payload));
}

export function onStatsChanged(cb: () => void): UnlistenFn {
  window.addEventListener(STATS_CHANGED_EVENT, cb);
  return () => window.removeEventListener(STATS_CHANGED_EVENT, cb);
}

export function onAppSizeCacheChanged(cb: () => void): UnlistenFn {
  window.addEventListener(APP_SIZE_CACHE_CHANGED_EVENT, cb);
  return () => window.removeEventListener(APP_SIZE_CACHE_CHANGED_EVENT, cb);
}

export function onDefaultTierChanged(cb: (tier: string) => void): UnlistenFn {
  const handler = (e: Event) => cb(String((e as CustomEvent).detail));
  window.addEventListener(DEFAULT_TIER_CHANGED_EVENT, handler);
  return () => window.removeEventListener(DEFAULT_TIER_CHANGED_EVENT, handler);
}

export function onSpaceProgress(cb: (p: SpaceProgress) => void): Promise<UnlistenFn> {
  return listen<SpaceProgress>("space://progress", (e) => cb(e.payload));
}

export function onLargeProgress(cb: (p: LargeProgress) => void): Promise<UnlistenFn> {
  return listen<LargeProgress>("large://progress", (e) => cb(e.payload));
}

/** 大文件扫描:每命中一个文件即推送(供扫描过程中实时列出)。 */
export function onLargeFound(cb: (f: LargeFile) => void): Promise<UnlistenFn> {
  return listen<LargeFile>("large://found", (e) => cb(e.payload));
}

export function onDupProgress(cb: (p: DupProgress) => void): Promise<UnlistenFn> {
  return listen<DupProgress>("dup://progress", (e) => cb(e.payload));
}

export interface AppSizeProgress {
  done: number;
  total: number;
  current: string;
  done_flag?: boolean;
}

export function onAppSizeProgress(cb: (p: AppSizeProgress) => void): Promise<UnlistenFn> {
  return listen<AppSizeProgress>("appsize://progress", (e) => cb(e.payload));
}

/* ---------------- 工具 ---------------- */

export function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const digits = v >= 100 || i === 0 ? 0 : 1;
  return `${v.toFixed(digits)} ${units[i]}`;
}
