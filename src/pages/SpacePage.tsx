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
  const [expectedTotal, setExpectedTotal] = useState(0); // 进度条分母(已知的目录/磁盘体积)
  const [view, setView] = useState<View>("treemap");

  // 每个路径的分析结果缓存:回到已看过的目录直接显示上次结果,不重复扫描
  const cache = useRef<Record<string, SpaceLevel>>({});
  const unlisten = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    api.listDrives().then(setDrives).catch(() => setDrives([]));
    api.listNotableLocations().then(setNotable).catch(() => setNotable([]));
    return () => {
      unlisten.current?.();
    };
  }, []);

  // 实际扫描一个目录并写入缓存
  const analyze = async (path: string) => {
    setLevel(null);
    setScanning(true);
    setProgress(null);
    unlisten.current?.();
    unlisten.current = await onSpaceProgress((p) => setProgress(p));

    const result = await api.analyzeSpace(path, 14);
    cache.current[path] = result;
    setLevel(result);
    setScanning(false);
    unlisten.current?.();
    unlisten.current = null;
  };

  // 显示某路径:优先用缓存(除非强制刷新);denom 为进度条分母
  const show = (path: string, denom: number, force = false) => {
    setExpectedTotal(denom);
    if (!force && cache.current[path]) {
      setLevel(cache.current[path]);
      setScanning(false);
      return;
    }
    analyze(path);
  };

  // 从盘符进入:先取磁盘已用空间作进度条分母,重置面包屑
  const enterDrive = async (drive: string) => {
    setCrumbs([drive]);
    let used = 0;
    try {
      used = (await api.diskUsage(drive)).used;
    } catch {
      /* 忽略 */
    }
    show(drive, used);
  };

  // 从"值得关注"位置进入:体积未知,分母置 0(进度条走不定态)
  const enterPath = (path: string) => {
    setCrumbs([path]);
    show(path, 0);
  };

  const drill = (node: SpaceNode) => {
    if (!node.is_dir || !node.path) return;
    setCrumbs((prev) => [...prev, node.path]);
    show(node.path, node.bytes); // 分母 = 该目录已知体积
  };

  const goCrumb = (idx: number) => {
    const target = crumbs[idx];
    setCrumbs(crumbs.slice(0, idx + 1));
    show(target, 0); // 面包屑回退命中缓存,不会真的扫描
  };

  const refresh = () => {
    const cur = crumbs[crumbs.length - 1];
    if (cur) show(cur, expectedTotal, true);
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
            <button key={d} className="drive-card" onClick={() => enterDrive(d)}>
              <Icon name="drive" size={24} style={{ color: "var(--primary)" }} />
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
                <button className="btn-outline notable-btn" onClick={() => enterPath(n.path)}>
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

  const pct =
    expectedTotal > 0 && progress
      ? Math.min(100, Math.round((progress.scanned_bytes / expectedTotal) * 100))
      : 0;

  return (
    <div className="space-page">
      <div className="space-toolbar">
        <div className="crumbs">
          {crumbs.map((c, i) => (
            <span key={i} className="crumb-item">
              {i === 0 ? (
                <Icon name="drive" size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
              ) : (
                <Icon
                  name="chevron-down"
                  size={12}
                  style={{ transform: "rotate(-90deg)", opacity: 0.5 }}
                />
              )}
              <button className="crumb-btn" onClick={() => goCrumb(i)}>
                {crumbDisplay(c, i)}
              </button>
            </span>
          ))}
        </div>
        <div className="space-toolbar-right">
          <button
            className="btn-text space-refresh"
            onClick={refresh}
            disabled={scanning}
            title={zh ? "重新扫描" : "Rescan"}
          >
            <Icon name="refresh" size={16} />
          </button>
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
      </div>

      {scanning && (
        <div className="space-progress">
          <div className={`space-progress-bar ${expectedTotal > 0 ? "" : "indeterminate"}`}>
            <div
              className="space-progress-fill"
              style={expectedTotal > 0 ? { width: `${pct}%` } : undefined}
            />
          </div>
          <div className="space-progress-text">
            {zh ? "正在扫描" : "Scanning"} ·{" "}
            {progress ? formatBytes(progress.scanned_bytes) : "0 B"}
            {expectedTotal > 0 && ` / ${formatBytes(expectedTotal)} · ${pct}%`} ·{" "}
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
                const pctRow = level.total > 0 ? Math.round((n.bytes / level.total) * 100) : 0;
                return (
                  <div
                    key={i}
                    className={`space-row ${n.is_dir && !isOther ? "drillable" : ""}`}
                    onClick={() => !isOther && n.is_dir && drill(n)}
                  >
                    <Icon
                      name={n.is_dir ? "folder-open" : "file-zip"}
                      size={16}
                      style={{ color: "var(--on-surface-variant)", flexShrink: 0 }}
                    />
                    <div className="space-row-info">
                      <div className="space-row-name">
                        {isOther ? (zh ? "其他较小项" : "Other smaller items") : n.name}
                      </div>
                      <div className="space-row-bar">
                        <div
                          className="space-row-bar-fill"
                          style={{ width: `${pctRow}%`, background: barColor(i, isOther) }}
                        />
                      </div>
                    </div>
                    <span className="space-row-size">{formatBytes(n.bytes)}</span>
                    <span className="space-row-pct">{pctRow}%</span>
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

// 与 Treemap 一致的分类色板(列表视图的进度条着色,让各项彼此区分)
const BAR_COLORS = [
  "#4c8dff", "#22c3a6", "#f4b740", "#ef6f6c", "#a78bfa",
  "#34d399", "#f472b6", "#60a5fa", "#fbbf24", "#38bdf8",
  "#c084fc", "#2dd4bf", "#fb923c", "#f87171",
];
function barColor(idx: number, isOther: boolean): string {
  return isOther ? "var(--outline)" : BAR_COLORS[idx % BAR_COLORS.length];
}

function crumbDisplay(path: string, idx: number): string {
  if (idx === 0) return path; // 盘符
  const parts = path.replace(/[/\\]+$/, "").split(/[/\\]/);
  return parts[parts.length - 1] || path;
}
