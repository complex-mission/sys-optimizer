import { useEffect, useRef, useState } from "react";
import { open, confirm } from "@tauri-apps/plugin-dialog";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useI18n } from "../i18n";
import { api, onLargeProgress, LargeFile, LargeProgress, formatBytes } from "../lib/api";
import { Icon, IconName } from "../components/Icon";
import "./LargePage.css";

const THRESHOLDS = [50, 100, 500, 1024]; // MB

function iconForExt(ext: string): IconName {
  if (["mp4", "mov", "mkv", "avi", "wmv", "flv"].includes(ext)) return "movie";
  if (["zip", "rar", "7z", "tar", "gz", "iso"].includes(ext)) return "file-zip";
  if (["mp3", "wav", "flac", "aac"].includes(ext)) return "video";
  return "file-zip";
}

export function LargePage() {
  const { t, lang } = useI18n();
  const zh = lang === "zh-CN";

  const [dir, setDir] = useState("");
  const [thresholdMb, setThresholdMb] = useState(100);
  const [files, setFiles] = useState<LargeFile[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [progress, setProgress] = useState<LargeProgress | null>(null);
  const unlisten = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    api.defaultScanDir().then(setDir).catch(() => setDir(""));
    return () => {
      unlisten.current?.();
    };
  }, []);

  const pickDir = async () => {
    try {
      const picked = await open({ directory: true, multiple: false });
      if (typeof picked === "string") setDir(picked);
    } catch {
      /* 取消 */
    }
  };

  const startScan = async () => {
    if (!dir) return;
    setScanning(true);
    setScanned(false);
    setFiles([]);
    setChecked(new Set());
    setProgress(null);

    unlisten.current?.();
    unlisten.current = await onLargeProgress((p) => setProgress(p));

    const result = await api.scanLargeFiles(dir, thresholdMb, 200);
    setFiles(result);
    setScanning(false);
    setScanned(true);
    unlisten.current?.();
    unlisten.current = null;
  };

  // 停止扫描:后端提前返回已找到的部分结果
  const stopScan = () => api.cancelTask("large").catch(() => {});

  const toggle = (path: string, on: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      on ? next.add(path) : next.delete(path);
      return next;
    });
  };

  const selectedBytes = files
    .filter((f) => checked.has(f.path))
    .reduce((s, f) => s + f.bytes, 0);

  const del = async () => {
    const paths = [...checked];
    if (paths.length === 0) return;
    const ok = await confirm(
      zh
        ? `将把选中的 ${paths.length} 个文件移入回收站,可从回收站恢复。`
        : `Move the ${paths.length} selected files to the Recycle Bin. You can restore them from there.`,
      { title: zh ? "移入回收站" : "Move to Recycle Bin", kind: "warning" }
    ).catch(() => true);
    if (!ok) return;

    const [, freed] = await api.deleteLargeFiles(paths);
    // 从列表移除已删的
    setFiles((prev) => prev.filter((f) => !checked.has(f.path)));
    setChecked(new Set());
    void freed;
  };

  return (
    <div className="large-page">
      <div className="large-head">
        <h1>{t("nav.large")}</h1>
        <p className="large-sub">
          {zh
            ? "在指定目录中找出占地方的大文件。删除会移入回收站,可恢复。"
            : "Find space-hogging files in a folder. Deletions go to the Recycle Bin and can be restored."}
        </p>
      </div>

      <div className="large-controls">
        <div className="large-dir">
          <Icon name="folder-open" size={16} style={{ color: "var(--on-surface-variant)", flexShrink: 0 }} />
          <span className="large-dir-path" title={dir}>
            {dir || (zh ? "选择目录" : "Choose a folder")}
          </span>
          <button className="btn-outline" onClick={pickDir} disabled={scanning}>
            {zh ? "更改" : "Change"}
          </button>
        </div>

        <div className="large-threshold">
          <span className="large-threshold-label">
            {zh ? "大于" : "Larger than"}
          </span>
          <div className="threshold-chips">
            {THRESHOLDS.map((mb) => (
              <button
                key={mb}
                className={`chip ${thresholdMb === mb ? "active" : ""}`}
                onClick={() => setThresholdMb(mb)}
                disabled={scanning}
              >
                {mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`}
              </button>
            ))}
          </div>
        </div>

        <button
          className={`${scanning ? "btn-outline" : "btn-filled"} large-scan-btn`}
          onClick={scanning ? stopScan : startScan}
          disabled={!scanning && !dir}
        >
          {scanning ? (zh ? "停止" : "Stop") : zh ? "开始扫描" : "Scan"}
        </button>
      </div>

      {scanning && (
        <div className="large-progress">
          <div className="large-progress-bar">
            <div className="large-progress-fill" />
          </div>
          <div className="large-progress-text">
            {progress ? progress.scanned_items.toLocaleString() : 0} {zh ? "个文件已检查" : "files checked"}
            {progress && progress.found > 0 && (
              <> · {zh ? "已找到" : "found"} {progress.found}</>
            )}
          </div>
        </div>
      )}

      {scanned && !scanning && (
        <>
          <div className="large-summary">
            <span>
              {zh ? "找到" : "Found"} {files.length} {zh ? "个大文件" : "large files"}
            </span>
            {checked.size > 0 && (
              <span className="large-summary-sel">
                {zh ? "已选" : "Selected"} {checked.size} · {formatBytes(selectedBytes)}
              </span>
            )}
          </div>

          {files.length === 0 ? (
            <div className="large-empty">
              {zh ? "该目录下没有超过阈值的文件" : "No files above the threshold here"}
            </div>
          ) : (
            <div className="large-list">
              {files.map((f) => (
                <div key={f.path} className="large-row">
                  <input
                    type="checkbox"
                    checked={checked.has(f.path)}
                    onChange={(e) => toggle(f.path, e.target.checked)}
                    aria-label={f.name}
                  />
                  <Icon
                    name={iconForExt(f.ext)}
                    size={18}
                    style={{ color: "var(--on-surface-variant)", flexShrink: 0 }}
                  />
                  <div className="large-info">
                    <div className="large-name" title={f.path}>
                      {f.name}
                    </div>
                    <div className="large-path" title={f.path}>
                      {f.path}
                    </div>
                  </div>
                  <span className="large-size">{formatBytes(f.bytes)}</span>
                  <button
                    className="btn-text large-open"
                    onClick={() => api.openPath(f.path).catch(() => {})}
                  >
                    <Icon name="folder-open" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {checked.size > 0 && (
            <div className="large-footer">
              <span className="large-footer-note">
                {zh ? "删除的文件会进入回收站,可恢复" : "Deleted files go to the Recycle Bin"}
              </span>
              <button className="btn-filled large-del-btn" onClick={del}>
                {zh ? "移入回收站" : "Move to Recycle Bin"} · {formatBytes(selectedBytes)}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
