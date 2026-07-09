import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import {
  api,
  onSpaceProgress,
  NotableLocation,
  SpaceLevel,
  SpaceNode,
  SpaceProgress,
  formatBytes,
} from "../lib/api";
import { Icon } from "../components/Icon";
import { Treemap } from "../components/Treemap";
import type { UnlistenFn } from "@tauri-apps/api/event";
import "./SpacePage.css";

type View = "treemap" | "list";

export function SpacePage() {
  const { t, lang } = useI18n();
  const zh = lang === "zh-CN";

  const [drives, setDrives] = useState<string[]>([]);
  const [notable, setNotable] = useState<NotableLocation[]>([]);
  const [level, setLevel] = useState<SpaceLevel | null>(null);
  const [crumbs, setCrumbs] = useState<string[]>([]); // 路径栈
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<SpaceProgress | null>(null);
  const [view, setView] = useState<View>("treemap");

  const unlisten = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    api.listDrives().then(setDrives).catch(() => setDrives([]));
    api.listNotableLocations().then(setNotable).catch(() => setNotable([]));
    return () => {
      unlisten.current?.();
    };
  }, []);

  // 纯分析:只负责扫描与渲染,不碰面包屑(由调用方管理)
  const analyze = async (path: string) => {
    setScanning(true);
    setProgress(null);
    unlisten.current?.();
    unlisten.current = await onSpaceProgress((p) => setProgress(p));

    const result = await api.analyzeSpace(path, 14);
    setLevel(result);
    setScanning(false);
    unlisten.current?.();
    unlisten.current = null;
  };

  // 从盘符或初始目录进入:重置面包屑
  const enter = (path: string) => {
    setCrumbs([path]);
    analyze(path);
  };

  const drill = (node: SpaceNode) => {
    if (!node.is_dir || !node.path) return;
    setCrumbs((prev) => [...prev, node.path]);
    analyze(node.path);
  };

  const goCrumb = (idx: number) => {
    const target = crumbs[idx];
    setCrumbs(crumbs.slice(0, idx + 1));
    analyze(target);
  };

  const openInExplorer = (path: string) => api.openPath(path).catch(() => {});

  // 初始态:选盘
  if (!level && !scanning) {
    return (
      <div className="space-page">
        <div className="space-head">
          <h1>{t("nav.space")}</h1>
          <p className="space-sub">
            {zh
              ? "选择磁盘,逐层查看空间被哪些目录占用。"
              : "Pick a disk and drill down to see what's taking up space."}
          </p>
        </div>
        <div className="drive-grid">
          {drives.map((d) => (
            <button key={d} className="drive-card" onClick={() => enter(d)}>
              <Icon name="file-zip" size={22} style={{ color: "var(--primary)" }} />
              <span className="drive-name">{d}</span>
            </button>
          ))}
        </div>

        {notable.length > 0 && (
          <div className="notable-section">
            <div className="notable-title">
              {zh
                ? "值得关注的位置(不建议自动清理)"
                : "Notable locations (not auto-cleaned)"}
            </div>
            <p className="notable-sub">
              {zh
                ? "这些目录可能占用不少空间,但删除有风险或被系统占用,不做自动清理。点“分析”查看体积,自行判断如何处理。"
                : "These can be large but are risky or system-locked, so they're not auto-cleaned. Click Analyze to see their size and decide yourself."}
            </p>
            {notable.map((n) => (
              <div key={n.id} className="notable-row">
                <div className="notable-info">
                  <div className="notable-name">{t(`notable.${n.id}.name`)}</div>
                  <div className="notable-note">{t(`notable.${n.id}.note`)}</div>
                  <div className="notable-path" title={n.path}>
                    {n.path}
                  </div>
                </div>
                <button className="btn-outline notable-btn" onClick={() => enter(n.path)}>
                  {zh ? "分析" : "Analyze"}
                </button>
                <button
                  className="btn-text notable-open"
                  onClick={() => openInExplorer(n.path)}
                  title={zh ? "打开位置" : "Open location"}
                >
                  <Icon name="folder-open" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-page">
      <div className="space-toolbar">
        <div className="crumbs">
          {crumbs.map((c, i) => (
            <span key={i} className="crumb-item">
              {i > 0 && <Icon name="chevron-down" size={12} style={{ transform: "rotate(-90deg)", opacity: 0.5 }} />}
              <button className="crumb-btn" onClick={() => goCrumb(i)}>
                {crumbDisplay(c, i)}
              </button>
            </span>
          ))}
        </div>
        <div className="space-view-toggle">
          <button
            className={`view-btn ${view === "treemap" ? "active" : ""}`}
            onClick={() => setView("treemap")}
          >
            <Icon name="chart-donut" size={16} />
          </button>
          <button
            className={`view-btn ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
          >
            <Icon name="tune" size={16} />
          </button>
        </div>
      </div>

      {scanning && (
        <div className="space-progress">
          <div className="space-progress-bar">
            <div className="space-progress-fill" />
          </div>
          <div className="space-progress-text">
            {zh ? "正在扫描" : "Scanning"} ·{" "}
            {progress ? formatBytes(progress.scanned_bytes) : "0 B"} ·{" "}
            {progress ? progress.scanned_items.toLocaleString() : 0} {zh ? "项" : "items"}
          </div>
        </div>
      )}

      {!scanning && level && (
        <>
          <div className="space-total">
            {zh ? "当前目录总计" : "Total"} <strong>{formatBytes(level.total)}</strong>
          </div>

          {view === "treemap" ? (
            <div className="treemap-wrap">
              <Treemap
                nodes={level.nodes}
                width={800}
                height={420}
                onDrill={drill}
                otherLabel={zh ? "其他" : "Other"}
              />
            </div>
          ) : (
            <div className="space-list">
              {level.nodes.map((n, i) => {
                const isOther = n.name === "__other__";
                const pct = level.total > 0 ? Math.round((n.bytes / level.total) * 100) : 0;
                return (
                  <div
                    key={i}
                    className={`space-row ${n.is_dir && !isOther ? "drillable" : ""}`}
                    onClick={() => !isOther && n.is_dir && drill(n)}
                  >
                    <Icon
                      name={n.is_dir ? "file-zip" : "info"}
                      size={16}
                      style={{ color: "var(--on-surface-variant)", flexShrink: 0 }}
                    />
                    <div className="space-row-info">
                      <div className="space-row-name">
                        {isOther ? (zh ? "其他较小项" : "Other smaller items") : n.name}
                      </div>
                      <div className="space-row-bar">
                        <div className="space-row-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="space-row-size">{formatBytes(n.bytes)}</span>
                    <span className="space-row-pct">{pct}%</span>
                    {n.is_dir && !isOther && (
                      <button
                        className="btn-text space-row-open"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInExplorer(n.path);
                        }}
                      >
                        <Icon name="folder-open" size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function crumbDisplay(path: string, idx: number): string {
  if (idx === 0) return path; // 盘符
  const parts = path.replace(/[/\\]+$/, "").split(/[/\\]/);
  return parts[parts.length - 1] || path;
}
