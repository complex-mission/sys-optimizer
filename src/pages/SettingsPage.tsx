import { useEffect, useState } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useI18n, Lang } from "../i18n";
import { api, AppConfig, formatBytes } from "../lib/api";
import { Icon } from "../components/Icon";
import { getTheme, setTheme, Theme } from "../lib/theme";
import "./SettingsPage.css";

type LangChoice = "system" | Lang;

export function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const zh = lang === "zh-CN";

  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [logPath, setLogPath] = useState("");
  const [theme, setThemeState] = useState<Theme>(getTheme());

  const chooseTheme = (th: Theme) => {
    setTheme(th);
    setThemeState(th);
  };

  const load = async () => {
    try {
      const c = await api.getConfig();
      setCfg(c);
    } catch {
      /* 忽略 */
    }
    try {
      setLogPath(await api.logsDir());
    } catch {
      /* 忽略 */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const chooseLang = async (choice: LangChoice) => {
    await api.setLanguage(choice).catch(() => {});
    // 立即生效:system 时按浏览器语言,否则用选定值
    if (choice === "zh-CN" || choice === "en-US") {
      setLang(choice);
    } else {
      const n = navigator.language.toLowerCase();
      setLang(n.startsWith("zh") ? "zh-CN" : "en-US");
    }
    setCfg((prev) => (prev ? { ...prev, language: choice } : prev));
  };

  const chooseTier = async (tier: string) => {
    await api.setDefaultTier(tier).catch(() => {});
    setCfg((prev) => (prev ? { ...prev, default_tier: tier } : prev));
  };

  const chooseCautious = async (enabled: boolean) => {
    await api.setExpensiveToTrash(enabled).catch(() => {});
    setCfg((prev) => (prev ? { ...prev, expensive_to_trash: enabled } : prev));
  };

  const openLogs = () => api.openPath(logPath).catch(() => {});

  const reset = async () => {
    const ok = await confirm(
      zh
        ? "将语言、默认挡位等偏好恢复为初始值。使用条款同意状态与累计统计不受影响。"
        : "Reset preferences like language and default scan depth. Terms acceptance and totals are unaffected.",
      { title: zh ? "恢复默认设置" : "Reset to defaults", kind: "warning" }
    ).catch(() => false);
    if (!ok) return;
    await api.setLanguage("system").catch(() => {});
    await api.setDefaultTier("standard").catch(() => {});
    await api.setExpensiveToTrash(true).catch(() => {});
    const n = navigator.language.toLowerCase();
    setLang(n.startsWith("zh") ? "zh-CN" : "en-US");
    load();
  };

  const langChoice: LangChoice = (cfg?.language as LangChoice) ?? "system";
  const tierChoice = cfg?.default_tier ?? "standard";

  return (
    <div className="settings-page">
      <h1 className="settings-title">{t("nav.settings")}</h1>

      {/* 语言 */}
      <section className="settings-row">
        <div className="settings-label">
          <div className="settings-name">{t("settings.language")}</div>
          <div className="settings-desc">{zh ? "界面显示语言" : "Interface language"}</div>
        </div>
        <div className="seg">
          {(
            [
              ["system", zh ? "跟随系统" : "System"],
              ["zh-CN", "中文"],
              ["en-US", "English"],
            ] as [LangChoice, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              className={`seg-btn ${langChoice === val ? "active" : ""}`}
              onClick={() => chooseLang(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* 主题 */}
      <section className="settings-row">
        <div className="settings-label">
          <div className="settings-name">{zh ? "主题" : "Theme"}</div>
          <div className="settings-desc">
            {zh ? "浅色 / 深色 / 跟随系统" : "Light / dark / follow system"}
          </div>
        </div>
        <div className="seg">
          {(
            [
              ["system", zh ? "跟随系统" : "System"],
              ["light", zh ? "浅色" : "Light"],
              ["dark", zh ? "深色" : "Dark"],
            ] as [Theme, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              className={`seg-btn ${theme === val ? "active" : ""}`}
              onClick={() => chooseTheme(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* 默认扫描挡位 */}
      <section className="settings-row">
        <div className="settings-label">
          <div className="settings-name">{t("settings.default_tier")}</div>
          <div className="settings-desc">
            {zh ? "打开智能扫描时预选的挡位" : "Pre-selected depth on the scan page"}
          </div>
        </div>
        <div className="seg">
          {(
            [
              ["quick", t("scan.tier.quick")],
              ["standard", t("scan.tier.standard")],
              ["deep", t("scan.tier.deep")],
            ] as [string, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              className={`seg-btn ${tierChoice === val ? "active" : ""}`}
              onClick={() => chooseTier(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* 谨慎删除模式:高风险项走回收站 */}
      <section className="settings-row">
        <div className="settings-label">
          <div className="settings-name">
            {zh ? "谨慎删除模式" : "Cautious delete mode"}
          </div>
          <div className="settings-desc">
            {zh
              ? "开启后,高风险(琥珀色)项删除时移入回收站、可反悔;缓存类仍永久删除以立即释放空间。"
              : "When on, amber (high-cost) items go to the Recycle Bin and can be restored; caches are still purged to free space immediately."}
          </div>
        </div>
        <div className="seg">
          {(
            [
              ["on", zh ? "开启" : "On"],
              ["off", zh ? "关闭" : "Off"],
            ] as [string, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              className={`seg-btn ${
                ((cfg?.expensive_to_trash ?? true) ? "on" : "off") === val ? "active" : ""
              }`}
              onClick={() => chooseCautious(val === "on")}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* 日志目录 */}
      <section className="settings-row">
        <div className="settings-label">
          <div className="settings-name">{t("settings.open_logs")}</div>
          <div className="settings-desc settings-path" title={logPath}>
            {logPath || "—"}
          </div>
        </div>
        <button className="btn-outline" onClick={openLogs} disabled={!logPath}>
          <Icon name="folder-open" size={14} style={{ marginRight: 4 }} />
          {zh ? "打开" : "Open"}
        </button>
      </section>

      {/* 累计统计 */}
      {cfg && (
        <section className="settings-stats">
          <div className="stat-item">
            <div className="stat-label">{t("about.total_freed")}</div>
            <div className="stat-value">{formatBytes(cfg.total_freed_bytes)}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">{t("about.total_count")}</div>
            <div className="stat-value">
              {cfg.total_clean_count} {t("unit.times")}
            </div>
          </div>
        </section>
      )}

      {/* 恢复默认 */}
      <section className="settings-row settings-danger">
        <div className="settings-label">
          <div className="settings-name">{t("settings.reset")}</div>
          <div className="settings-desc">
            {zh ? "偏好设置恢复初始值" : "Restore preferences to defaults"}
          </div>
        </div>
        <button className="btn-outline" onClick={reset}>
          {t("settings.reset")}
        </button>
      </section>
    </div>
  );
}
