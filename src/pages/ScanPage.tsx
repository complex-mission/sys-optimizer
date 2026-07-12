import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useI18n } from "../i18n";
import {
  api,
  onScanProgress,
  onCleanProgress,
  CategoryMeta,
  CategoryScanResult,
  Tier,
  formatBytes,
} from "../lib/api";
import { Icon, IconName } from "../components/Icon";
import { CategoryRow } from "../components/CategoryRow";
import "./ScanPage.css";

type Phase = "idle" | "scanning" | "results" | "cleaning" | "done";

const TIERS: { id: Tier; icon: IconName; recommended?: boolean }[] = [
  { id: "quick", icon: "bolt" },
  { id: "standard", icon: "scan", recommended: true },
  { id: "deep", icon: "radar" },
];

export function ScanPage() {
  const { t } = useI18n();
  const [cats, setCats] = useState<CategoryMeta[]>([]);
  const [tier, setTier] = useState<Tier>("standard");
  const [phase, setPhase] = useState<Phase>("idle");
  // 自定义扫描范围:null = 跟随挡位;非 null = 用户自选的类别集合
  const [customOpen, setCustomOpen] = useState(false);
  const [customIds, setCustomIds] = useState<Set<string> | null>(null);

  // 扫描结果:id -> {bytes, files}
  const [sizes, setSizes] = useState<Record<string, CategoryScanResult>>({});
  // 用户勾选的类别 id
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // 反选保留的文件路径:catId -> Set<path>
  const [kept, setKept] = useState<Record<string, Set<string>>>({});
  // 进度
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [current, setCurrent] = useState<string>("");
  const [stopping, setStopping] = useState(false);
  const [freed, setFreed] = useState(0);
  const [skipped, setSkipped] = useState(0);

  const scanUnlisten = useRef<null | (() => void)>(null);
  const cleanUnlisten = useRef<null | (() => void)>(null);

  useEffect(() => {
    api.listCategories().then(setCats).catch(() => setCats([]));
    return () => {
      scanUnlisten.current?.();
      cleanUnlisten.current?.();
    };
  }, []);

  // 类别默认勾选规则:cache 默认勾,expensive/report 默认不勾
  const defaultChecked = useCallback(
    (ids: string[]) => {
      const set = new Set<string>();
      for (const id of ids) {
        const c = cats.find((x) => x.id === id);
        if (c && c.risk === "cache") set.add(id);
      }
      return set;
    },
    [cats]
  );

  // 展开自定义面板时,以当前挡位的类别作为初始勾选
  const toggleCustom = async () => {
    if (!customOpen && customIds === null) {
      const ids = await api.idsForTier(tier).catch(() => [] as string[]);
      setCustomIds(new Set(ids));
    }
    setCustomOpen((v) => !v);
  };

  // 切挡位:若已进入自定义模式,重置勾选为新挡位默认
  const pickTier = async (id: Tier) => {
    setTier(id);
    if (customIds !== null) {
      const ids = await api.idsForTier(id).catch(() => [] as string[]);
      setCustomIds(new Set(ids));
    }
  };

  const resetCustom = async () => {
    const ids = await api.idsForTier(tier).catch(() => [] as string[]);
    setCustomIds(new Set(ids));
  };

  const toggleCustomId = (id: string, on: boolean) => {
    setCustomIds((prev) => {
      const next = new Set(prev ?? []);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const startScan = async () => {
    const ids =
      customIds !== null ? [...customIds] : await api.idsForTier(tier);
    if (ids.length === 0) return;
    setSizes({});
    setKept({});
    setChecked(defaultChecked(ids));
    setProgress({ done: 0, total: ids.length });
    setCurrent(ids[0] ?? "");
    setStopping(false);
    setPhase("scanning");

    scanUnlisten.current?.();
    scanUnlisten.current = await onScanProgress((p) => {
      // 完成事件才写入体积(开始事件的 result 为占位 0)
      if (p.result && (p.result.bytes > 0 || p.result.files > 0)) {
        setSizes((prev) => ({ ...prev, [p.result.id]: p.result }));
      }
      setProgress({ done: p.done, total: p.total });
      if (p.current) setCurrent(p.current);
    });

    const results = await api.runScan(ids);
    const map: Record<string, CategoryScanResult> = {};
    for (const r of results) map[r.id] = r;
    setSizes(map);
    setCurrent("");
    // 全部被停止且无结果时回到挡位选择,否则展示(可能是部分)结果
    setPhase(results.length === 0 ? "idle" : "results");
  };

  const stopScan = async () => {
    setStopping(true);
    await api.cancelScan().catch(() => {});
  };

  // 当前挡位涉及的类别(按结果展示顺序:有内容的在前)
  const visibleCats = useMemo(() => {
    const withSize = cats.filter((c) => sizes[c.id]);
    return withSize.sort(
      (a, b) => (sizes[b.id]?.bytes ?? 0) - (sizes[a.id]?.bytes ?? 0)
    );
  }, [cats, sizes]);

  const selectedBytes = useMemo(() => {
    let sum = 0;
    for (const id of checked) {
      const c = cats.find((x) => x.id === id);
      if (c?.risk === "report") continue; // report 不可清理
      sum += sizes[id]?.bytes ?? 0;
    }
    return sum;
  }, [checked, sizes, cats]);

  const totalFound = useMemo(
    () => Object.values(sizes).reduce((s, r) => s + r.bytes, 0),
    [sizes]
  );

  // 结果中最大项体积,作为各行占比条的分母
  const maxBytes = useMemo(
    () => Math.max(1, ...Object.values(sizes).map((r) => r.bytes)),
    [sizes]
  );

  const toggleCat = (id: string, on: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const toggleKeep = (catId: string, path: string, keep: boolean) => {
    setKept((prev) => {
      const set = new Set(prev[catId] ?? []);
      keep ? set.add(path) : set.delete(path);
      return { ...prev, [catId]: set };
    });
  };

  // 用户为某类别手动指定路径后,单独重扫该类别刷新大小
  const rescanOne = async (id: string) => {
    const [r] = await api.runScan([id]);
    if (r) setSizes((prev) => ({ ...prev, [id]: r }));
  };

  const startClean = async () => {
    const ids = [...checked].filter((id) => {
      const c = cats.find((x) => x.id === id);
      return c && c.risk !== "report" && (sizes[id]?.bytes ?? 0) > 0;
    });
    if (ids.length === 0) return;

    const ok = await confirm(
      t("result.footer"),
      { title: t("confirm.title"), kind: "warning" }
    ).catch(() => true); // 浏览器预览无 dialog 时放行
    if (!ok) return;

    const keepPaths: string[] = [];
    for (const id of ids) {
      for (const p of kept[id] ?? []) keepPaths.push(p);
    }

    setProgress({ done: 0, total: ids.length });
    setFreed(0);
    setSkipped(0);
    setPhase("cleaning");

    cleanUnlisten.current?.();
    cleanUnlisten.current = await onCleanProgress((p) => {
      setProgress({ done: p.done, total: p.total });
    });

    const results = await api.runClean(ids, keepPaths);
    let f = 0;
    let s = 0;
    for (const r of results) {
      f += r.freed_bytes;
      s += r.skipped;
    }
    setFreed(f);
    setSkipped(s);
    // 清理后把这些类别大小归零
    setSizes((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = { id, bytes: 0, files: 0 };
      return next;
    });
    setPhase("done");
  };

  const catName = (id: string) => {
    const c = cats.find((x) => x.id === id);
    return c ? t(c.name_key) : id;
  };

  /* ---------------- 渲染 ---------------- */

  if (phase === "scanning") {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="scan-running">
        <div className="scan-running-card">
          <div className="scan-running-icon">
            <Icon name="scan" size={26} />
          </div>
          <div className="scan-running-title">
            {stopping ? t("scan.stopping") : t("scan.scanning")}
          </div>
          <div className="scan-running-current" title={current}>
            {current ? catName(current) : "…"}
          </div>
          <div className="scan-progress-track">
            <div className="scan-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="scan-running-meta">
            {progress.done}/{progress.total} · {formatBytes(totalFound)}
          </div>
          <button className="btn-outline scan-stop" onClick={stopScan} disabled={stopping}>
            <Icon name="close" size={14} />
            {t("scan.stop")}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <div className="scan-home">
        <div className="scan-head">
          <h1>{t("scan.title")}</h1>
        </div>

        <div className="tier-grid">
          {TIERS.map((tr) => (
            <button
              key={tr.id}
              className={`tier-card ${tier === tr.id ? "selected" : ""}`}
              onClick={() => pickTier(tr.id)}
            >
              {tr.recommended && (
                <span className="tier-badge">{t("scan.recommended")}</span>
              )}
              <Icon name={tr.icon} size={22} style={{ color: "var(--primary)" }} />
              <div className="tier-name">{t(`scan.tier.${tr.id}`)}</div>
              <div className="tier-desc">{t(`scan.tier.${tr.id}.desc`)}</div>
            </button>
          ))}
        </div>

        {customOpen && customIds && (
          <div className="custom-panel">
            <div className="custom-head">
              <span className="custom-hint">{t("scan.custom.hint")}</span>
              <span className="custom-count">
                {customIds.size} {t("scan.custom.selected")}
              </span>
              <button className="btn-text custom-reset" onClick={resetCustom}>
                {t("scan.custom.reset")}
              </button>
            </div>
            <div className="custom-grid">
              {cats.map((c) => (
                <label
                  key={c.id}
                  className={`custom-item ${customIds.has(c.id) ? "on" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={customIds.has(c.id)}
                    onChange={(e) => toggleCustomId(c.id, e.target.checked)}
                  />
                  <span
                    className="custom-dot"
                    style={{
                      background:
                        c.risk === "expensive"
                          ? "var(--risk-expensive)"
                          : c.risk === "report"
                          ? "var(--risk-report)"
                          : "var(--risk-cache)",
                    }}
                  />
                  <span className="custom-name">{t(c.name_key)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="scan-actions">
          <button
            className={`btn-text custom-toggle ${customOpen ? "open" : ""}`}
            onClick={toggleCustom}
          >
            {t("scan.custom")}
            <Icon
              name="chevron-down"
              size={14}
              style={{
                transform: customOpen ? "rotate(180deg)" : undefined,
                transition: "transform 0.2s",
              }}
            />
          </button>
          <button
            className="btn-filled"
            onClick={startScan}
            disabled={customIds !== null && customIds.size === 0}
          >
            {t("scan.start")}
            {customIds !== null ? ` (${customIds.size})` : ""}
          </button>
        </div>
      </div>
    );
  }

  // results / cleaning / done
  return (
    <div className="scan-results">
      <div className="results-head">
        <button
          className="btn-text results-back"
          onClick={() => setPhase("idle")}
          disabled={phase === "cleaning"}
        >
          <Icon name="chevron-down" size={14} style={{ transform: "rotate(90deg)" }} />
          {t("scan.rescan")}
        </button>
        <div className="results-title">
          {phase === "done" ? (
            <>
              {t("result.freed")} {formatBytes(freed)}
              {skipped > 0 && (
                <span className="results-skipped">
                  · {skipped} {t("result.skipped")}
                </span>
              )}
            </>
          ) : (
            <>
              {t("result.done")} · {t("result.found")} {formatBytes(totalFound)}
            </>
          )}
        </div>
        <div className="results-sub">
          {phase !== "done" && (
            <>
              {t("result.selected")} {formatBytes(selectedBytes)}
            </>
          )}
        </div>
      </div>

      <div className="results-list">
        {visibleCats.map((c) => (
          <CategoryRow
            key={c.id}
            meta={c}
            result={sizes[c.id]}
            checked={checked.has(c.id)}
            keptPaths={kept[c.id] ?? new Set()}
            disabled={phase === "cleaning"}
            onToggle={(on) => toggleCat(c.id, on)}
            onToggleKeep={(path, keep) => toggleKeep(c.id, path, keep)}
            onOpen={(path) => api.openPath(path).catch(() => {})}
            onSpecifyPath={() => rescanOne(c.id)}
            share={(sizes[c.id]?.bytes ?? 0) / maxBytes}
          />
        ))}
      </div>

      {phase !== "done" && (
        <div className="results-footer">
          <span className="results-footer-note">{t("result.footer")}</span>
          <button
            className="btn-filled"
            onClick={startClean}
            disabled={phase === "cleaning" || selectedBytes === 0}
          >
            {phase === "cleaning"
              ? `${t("result.cleaning")} ${progress.done}/${progress.total}`
              : `${t("result.clean")} ${formatBytes(selectedBytes)}`}
          </button>
        </div>
      )}
    </div>
  );
}
