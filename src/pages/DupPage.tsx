import { useEffect, useRef, useState } from "react";
import { open, confirm } from "@tauri-apps/plugin-dialog";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useI18n } from "../i18n";
import {
  api,
  onDupProgress,
  DuplicateGroup,
  DupProgress,
  formatBytes,
} from "../lib/api";
import { Icon } from "../components/Icon";
import "./DupPage.css";

export function DupPage() {
  const { t, lang } = useI18n();
  const zh = lang === "zh-CN";

  const [dir, setDir] = useState("");
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  // 要删除的路径集合(默认:每组除首个外全部删除 → 每组保留第一个)
  const [toDelete, setToDelete] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [progress, setProgress] = useState<DupProgress | null>(null);
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
    setGroups([]);
    setToDelete(new Set());
    setProgress(null);

    unlisten.current?.();
    unlisten.current = await onDupProgress((p) => setProgress(p));

    const result = await api.scanDuplicates(dir);
    setGroups(result);
    // 默认:每组保留第一个,其余标记删除
    const del = new Set<string>();
    for (const g of result) {
      g.files.slice(1).forEach((f) => del.add(f.path));
    }
    setToDelete(del);
    setScanning(false);
    setScanned(true);
    unlisten.current?.();
    unlisten.current = null;
  };

  // 切换某文件的删除状态。约束:每组至少保留一个(不能把一组全标删除)。
  const toggleDelete = (group: DuplicateGroup, path: string, wantDelete: boolean) => {
    setToDelete((prev) => {
      const next = new Set(prev);
      if (wantDelete) {
        // 检查:标记后该组是否仍保留 ≥1
        const groupPaths = group.files.map((f) => f.path);
        const remainingKept = groupPaths.filter((p) => p !== path && !next.has(p));
        if (remainingKept.length === 0) {
          // 该组只剩这一个未删,不允许再删它
          return prev;
        }
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  };

  const selectedBytes = groups.reduce((sum, g) => {
    const delCount = g.files.filter((f) => toDelete.has(f.path)).length;
    return sum + g.bytes * delCount;
  }, 0);

  const del = async () => {
    const paths = [...toDelete];
    if (paths.length === 0) return;
    const ok = await confirm(
      zh
        ? `将把 ${paths.length} 个重复文件移入回收站(每组至少保留一个),可恢复。`
        : `Move ${paths.length} duplicate files to the Recycle Bin (at least one kept per group). Restorable.`,
      { title: zh ? "移入回收站" : "Move to Recycle Bin", kind: "warning" }
    ).catch(() => true);
    if (!ok) return;

    await api.deleteDuplicates(paths);
    // 从组里移除已删文件,清掉只剩单文件的组
    setGroups((prev) =>
      prev
        .map((g) => ({
          ...g,
          files: g.files.filter((f) => !toDelete.has(f.path)),
        }))
        .filter((g) => g.files.length >= 2)
        .map((g) => ({ ...g, reclaimable: g.bytes * (g.files.length - 1) }))
    );
    setToDelete(new Set());
  };

  const totalReclaimable = groups.reduce((s, g) => s + g.reclaimable, 0);

  const phaseLabel = (phase: string): string => {
    const zhMap: Record<string, string> = {
      scanning: "正在遍历文件",
      sampling: "正在采样比对",
      hashing: "正在精确校验",
      done: "完成",
    };
    const enMap: Record<string, string> = {
      scanning: "Scanning files",
      sampling: "Sampling",
      hashing: "Verifying",
      done: "Done",
    };
    return (zh ? zhMap : enMap)[phase] ?? phase;
  };

  return (
    <div className="dup-page">
      <div className="dup-head">
        <h1>{t("nav.dup")}</h1>
        <p className="dup-sub">
          {zh
            ? "找出内容完全相同的文件。每组默认保留一个,其余可移入回收站。"
            : "Find identical files. One per group is kept by default; the rest can go to the Recycle Bin."}
        </p>
      </div>

      <div className="dup-controls">
        <div className="dup-dir">
          <Icon name="folder-open" size={16} style={{ color: "var(--on-surface-variant)", flexShrink: 0 }} />
          <span className="dup-dir-path" title={dir}>
            {dir || (zh ? "选择目录" : "Choose a folder")}
          </span>
          <button className="btn-outline" onClick={pickDir} disabled={scanning}>
            {zh ? "更改" : "Change"}
          </button>
        </div>
        <button className="btn-filled" onClick={startScan} disabled={scanning || !dir}>
          {scanning ? (zh ? "扫描中" : "Scanning") : zh ? "开始扫描" : "Scan"}
        </button>
      </div>

      {scanning && (
        <div className="dup-progress">
          <div className="dup-progress-bar">
            <div className="dup-progress-fill" />
          </div>
          <div className="dup-progress-text">
            {progress ? phaseLabel(progress.phase) : phaseLabel("scanning")}
            {progress && progress.processed > 0 && (
              <> · {progress.processed.toLocaleString()}</>
            )}
          </div>
        </div>
      )}

      {scanned && !scanning && (
        <>
          <div className="dup-summary">
            <span>
              {zh ? "找到" : "Found"} {groups.length} {zh ? "组重复" : "duplicate groups"}
            </span>
            <span className="dup-summary-reclaim">
              {zh ? "可回收" : "Reclaimable"} {formatBytes(totalReclaimable)}
            </span>
          </div>

          {groups.length === 0 ? (
            <div className="dup-empty">
              {zh ? "没有发现重复文件" : "No duplicates found"}
            </div>
          ) : (
            <div className="dup-groups">
              {groups.map((g, gi) => (
                <div key={gi} className="dup-group">
                  <div className="dup-group-head">
                    <span className="dup-group-size">{formatBytes(g.bytes)}</span>
                    <span className="dup-group-count">
                      {g.files.length} {zh ? "个副本" : "copies"}
                    </span>
                    <span className="dup-group-reclaim">
                      {zh ? "省" : "save"} {formatBytes(g.reclaimable)}
                    </span>
                  </div>
                  <div className="dup-files">
                    {g.files.map((f) => {
                      const willDelete = toDelete.has(f.path);
                      return (
                        <div key={f.path} className={`dup-file ${willDelete ? "will-delete" : "keep"}`}>
                          <label className="dup-file-check">
                            <input
                              type="checkbox"
                              checked={!willDelete}
                              onChange={(e) => toggleDelete(g, f.path, !e.target.checked)}
                              aria-label={f.path}
                            />
                            <span className="dup-file-tag">
                              {willDelete ? (zh ? "删除" : "delete") : zh ? "保留" : "keep"}
                            </span>
                          </label>
                          <div className="dup-file-info">
                            <div className="dup-file-name">{f.name}</div>
                            <div className="dup-file-path" title={f.path}>
                              {f.path}
                            </div>
                          </div>
                          <button
                            className="btn-text dup-file-open"
                            onClick={() => api.openPath(f.path).catch(() => {})}
                          >
                            <Icon name="folder-open" size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {toDelete.size > 0 && (
            <div className="dup-footer">
              <span className="dup-footer-note">
                {zh ? "每组至少保留一个 · 删除进回收站可恢复" : "At least one kept per group · deletions restorable"}
              </span>
              <button className="btn-filled dup-del-btn" onClick={del}>
                {zh ? "移入回收站" : "Move to Recycle Bin"} · {formatBytes(selectedBytes)}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
