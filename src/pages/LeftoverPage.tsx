import { useState } from "react";
import { useI18n } from "../i18n";
import { api, LeftoverReport, formatBytes } from "../lib/api";
import { Icon } from "../components/Icon";
import { Notice } from "../components/Notice";
import "./LeftoverPage.css";

export function LeftoverPage() {
  const { t, lang } = useI18n();
  const zh = lang === "zh-CN";

  const [report, setReport] = useState<LeftoverReport | null>(null);
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    setScanning(true);
    try {
      setReport(await api.detectLeftovers());
    } catch {
      setReport({ scanned_dirs: 0, items: [] });
    } finally {
      setScanning(false);
    }
  };

  const items = report?.items ?? null;
  const totalBytes = (items ?? []).reduce((s, i) => s + i.bytes, 0);

  return (
    <div className="leftover-page">
      <div className="leftover-head">
        <h1>{t("nav.uninstall")}</h1>
        <p className="leftover-sub">
          {zh
            ? "查找已卸载软件可能残留的文件夹。"
            : "Find folders possibly left behind by uninstalled software."}
        </p>
      </div>

      {/* 醒目免责:这是启发式猜测,只报告不删除 */}
      <Notice
        text={
          zh
            ? "以下为启发式检测结果,仅供参考,可能包含正在使用的软件。本工具不提供删除功能,请你确认后手动处理。"
            : "These are heuristic guesses and may include software you still use. Cache Insight does not delete them — review and handle manually."
        }
      />

      {items === null ? (
        <div className="leftover-start">
          <button className="btn-filled" onClick={scan} disabled={scanning}>
            {scanning ? (zh ? "检测中" : "Scanning") : zh ? "开始检测" : "Scan"}
          </button>
        </div>
      ) : scanning ? (
        <div className="leftover-empty">
          {zh ? "正在检测并统计目录大小,请稍候…" : "Scanning and sizing folders, please wait…"}
        </div>
      ) : items.length === 0 ? (
        <>
          <div className="leftover-empty">
            {zh
              ? `已检查 ${report?.scanned_dirs ?? 0} 个目录,没有发现明显的残留目录`
              : `Checked ${report?.scanned_dirs ?? 0} folders — no obvious leftovers found`}
          </div>
          <button className="btn-text leftover-rescan" onClick={scan}>
            <Icon name="scan" size={14} />
            {zh ? "重新检测" : "Rescan"}
          </button>
        </>
      ) : (
        <>
          <div className="leftover-summary">
            <span>
              {zh ? "已检查" : "Checked"} {report?.scanned_dirs ?? 0} {zh ? "个目录,发现" : "folders, found"}{" "}
              {items.length} {zh ? "个疑似残留" : "possible leftovers"}
            </span>
            <span className="leftover-summary-size">
              {zh ? "合计" : "Total"} {formatBytes(totalBytes)}
            </span>
          </div>
          <div className="leftover-list">
            {items.map((item) => (
              <div key={item.path} className="leftover-row">
                <span className={`conf-dot conf-${item.confidence}`} />
                <div className="leftover-info">
                  <div className="leftover-name">
                    {item.name}
                    <span className={`conf-tag conf-${item.confidence}`}>
                      {item.confidence === "high"
                        ? zh ? "较可能" : "likely"
                        : zh ? "存疑" : "maybe"}
                    </span>
                  </div>
                  <div className="leftover-path" title={item.path}>
                    {item.location} · {item.path}
                  </div>
                </div>
                <span className="leftover-size">{formatBytes(item.bytes)}</span>
                <button
                  className="btn-outline"
                  onClick={() => api.openPath(item.path).catch(() => {})}
                >
                  {zh ? "打开位置" : "Open"}
                </button>
              </div>
            ))}
          </div>
          <button className="btn-text leftover-rescan" onClick={scan}>
            <Icon name="scan" size={14} />
            {zh ? "重新检测" : "Rescan"}
          </button>
        </>
      )}
    </div>
  );
}
