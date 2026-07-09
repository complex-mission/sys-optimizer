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

  return (
    <div className={`cat-row ${riskClass} ${expanded ? "open" : ""}`}>
      <div className="cat-main">
        {isReport ? (
          <span className="cat-check-spacer" />
        ) : (
          <input
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

        <div className="cat-info" onClick={toggleOpen} role="button">
          <div className="cat-name">
            {t(meta.name_key)}
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

        <span className={`cat-size ${bytes > 0 && !isReport ? "has" : ""}`}>
          {formatBytes(bytes)}
        </span>

        {isReport ? (
          <button
            className="btn-outline"
            onClick={() => onOpen(previewFirstPath(entries))}
          >
            {t("result.open")}
          </button>
        ) : maybeMisplaced ? (
          <button className="btn-outline" onClick={handleSpecify}>
            <Icon name="folder-open" size={14} style={{ marginRight: 4 }} />
            {t("result.specify")}
          </button>
        ) : meta.previewable ? (
          <button className="cat-expand" onClick={toggleOpen} disabled={disabled}>
            <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} />
          </button>
        ) : (
          <span className="cat-check-spacer" />
        )}
      </div>

      {expanded && (
        <div className="cat-preview">
          {loading ? (
            <div className="preview-hint">…</div>
          ) : (
            <>
              {entries.map((f) => {
                const keep = keptPaths.has(f.path);
                return (
                  <div key={f.path} className={`file-row ${keep ? "kept" : ""}`}>
                    <input
                      type="checkbox"
                      checked={!keep}
                      onChange={(e) => onToggleKeep(f.path, !e.target.checked)}
                      aria-label={f.name}
                    />
                    <span className="file-name" title={f.path}>
                      {f.name}
                    </span>
                    <span className="file-size">{formatBytes(f.bytes)}</span>
                  </div>
                );
              })}
              <div className="preview-hint">
                {Math.min(entries.length, total)} / {files.toLocaleString()}
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
