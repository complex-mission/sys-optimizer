import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useI18n } from "../i18n";
import {
  api,
  CategoryMeta,
  CategoryScanResult,
  FileEntry,
  formatBytes,
} from "../lib/api";
import { Icon, IconName } from "./Icon";

interface Props {
  meta: CategoryMeta;
  result?: CategoryScanResult;
  checked: boolean;
  keptPaths: Set<string>;
  disabled: boolean;
  onToggle: (on: boolean) => void;
  onToggleKeep: (path: string, keep: boolean) => void;
  onOpen: (path: string) => void;
  onSpecifyPath?: () => void;
}

const PAGE = 100;

function iconFor(id: string): IconName {
  if (id.startsWith("davinci")) return "movie";
  if (id.includes("recycle")) return "package";
  return "file-zip";
}

export function CategoryRow({
  meta,
  result,
  checked,
  keptPaths,
  disabled,
  onToggle,
  onToggleKeep,
  onOpen,
  onSpecifyPath,
}: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const bytes = result?.bytes ?? 0;
  const files = result?.files ?? 0;
  const isReport = meta.risk === "report";
  const isExpensive = meta.risk === "expensive";
  // 漏扫兜底:支持自定义路径的类别却扫出 0,很可能路径被用户改到别处
  const maybeMisplaced = meta.supports_override && bytes === 0;

  const handleSpecify = async () => {
    try {
      const picked = await open({ directory: true, multiple: false });
      if (typeof picked === "string") {
        await api.setPathOverride(meta.id, [picked]);
        onSpecifyPath?.();
      }
    } catch {
      /* 用户取消或无 dialog,忽略 */
    }
  };

  const loadPreview = async () => {
    if (!meta.previewable) return;
    setLoading(true);
    try {
      const page = await api.previewCategory(meta.id, 0, PAGE);
      setEntries(page.entries);
      setTotal(page.total);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => {
    if (isReport || !meta.previewable) return;
    const next = !expanded;
    setExpanded(next);
    if (next && entries.length === 0) loadPreview();
  };

  const riskClass = isReport ? "row-report" : isExpensive ? "row-expensive" : "row-cache";
  const sizeClass = bytes > 0 ? (isReport ? "size-report" : isExpensive ? "size-expensive" : "size-cache") : "size-zero";
  const canExpand = meta.previewable && !isReport && !maybeMisplaced;

  return (
    <div className={`cat-row ${riskClass} ${expanded ? "open" : ""}`}>
      <div className="cat-main">
        {isReport ? (
          <span className="cat-check-spacer" />
        ) : (
          <input
            className="cat-check"
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onToggle(e.target.checked)}
            aria-label={t(meta.name_key)}
          />
        )}

        <span className="cat-icon">
          <Icon name={iconFor(meta.id)} size={18} />
        </span>

        <div
          className="cat-info"
          onClick={canExpand ? toggleOpen : undefined}
          role={canExpand ? "button" : undefined}
        >
          <div className="cat-name">
            <span className="cat-name-text">{t(meta.name_key)}</span>
            {isExpensive && (
              <span className="tag tag-expensive">{t("result.risk.expensive")}</span>
            )}
            {isReport && (
              <span className="tag tag-report">{t("result.risk.report")}</span>
            )}
          </div>
          <div className={`cat-desc ${maybeMisplaced ? "hint-misplaced" : ""}`}>
            {maybeMisplaced
              ? t("result.misplaced.note")
              : isExpensive
              ? t("result.expensive.note")
              : isReport
              ? t("result.report.note")
              : `${t(meta.desc_key)}`}
          </div>
        </div>

        <div className="cat-metrics">
          <span className={`cat-size ${sizeClass}`}>{formatBytes(bytes)}</span>
          {!isReport && files > 0 && (
            <span className="cat-count">
              {files.toLocaleString()} {t("result.files")}
            </span>
          )}
        </div>

        {isReport ? (
          <button
            className="btn-outline cat-action"
            onClick={() => onOpen(previewFirstPath(entries))}
          >
            {t("result.open")}
          </button>
        ) : maybeMisplaced ? (
          <button className="btn-outline cat-action" onClick={handleSpecify}>
            <Icon name="folder-open" size={14} style={{ marginRight: 4 }} />
            {t("result.specify")}
          </button>
        ) : canExpand ? (
          <button
            className={`cat-expand ${expanded ? "open" : ""}`}
            onClick={toggleOpen}
            disabled={disabled}
            aria-label={t("result.preview")}
          >
            <Icon name="chevron-down" size={16} />
          </button>
        ) : (
          <span className="cat-check-spacer" />
        )}
      </div>

      {expanded && (
        <div className="cat-preview">
          {loading ? (
            <div className="preview-loading">
              <span className="preview-spinner" />
              {t("result.preview")}…
            </div>
          ) : entries.length === 0 ? (
            <div className="preview-hint">{t("result.empty")}</div>
          ) : (
            <>
              <div className="file-head">
                <span className="file-head-name">{t("result.preview")}</span>
                <span className="file-head-size">{t("result.found")}</span>
              </div>
              <div className="file-list">
                {entries.map((f) => {
                  const keep = keptPaths.has(f.path);
                  return (
                    <label key={f.path} className={`file-row ${keep ? "kept" : ""}`}>
                      <input
                        className="cat-check"
                        type="checkbox"
                        checked={!keep}
                        onChange={(e) => onToggleKeep(f.path, !e.target.checked)}
                        aria-label={f.name}
                      />
                      <Icon name="file-zip" size={13} style={{ color: "var(--outline)", flexShrink: 0 }} />
                      <span className="file-name" title={f.path}>
                        {f.name}
                      </span>
                      <span className="file-size">{formatBytes(f.bytes)}</span>
                    </label>
                  );
                })}
              </div>
              <div className="preview-hint">
                {t("result.showing")} {Math.min(entries.length, total).toLocaleString()} / {files.toLocaleString()}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function previewFirstPath(entries: FileEntry[]): string {
  return entries[0]?.path ?? "";
}
