import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useI18n } from "../i18n";
import { api, AppView, Risk } from "../lib/api";
import { Icon, IconName } from "../components/Icon";
import { AppIcon } from "../components/AppIcon";
import "./AppsPage.css";

// 分组的展示顺序与图标
const GROUP_ORDER: { id: string; icon: IconName }[] = [
  { id: "video", icon: "movie" },
  { id: "3d", icon: "apps" },
  { id: "dev", icon: "package" },
  { id: "media", icon: "video" },
  { id: "comm", icon: "info" },
  { id: "game", icon: "play" },
  { id: "office", icon: "copy" },
  { id: "tools", icon: "settings" },
];

function riskDot(risk: Risk): string {
  return risk === "expensive"
    ? "var(--risk-expensive)"
    : risk === "report"
    ? "var(--risk-report)"
    : "var(--risk-cache)";
}

export function AppsPage() {
  const { t, lang } = useI18n();
  const [apps, setApps] = useState<AppView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    try {
      const a = await api.appRules();
      setApps(a);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const specify = async (id: string) => {
    try {
      const picked = await open({ directory: true, multiple: false });
      if (typeof picked === "string") {
        await api.setPathOverride(id, [picked]);
        load();
      }
    } catch {
      /* 取消 */
    }
  };

  const clearOverride = async (id: string) => {
    await api.setPathOverride(id, []).catch(() => {});
    load();
  };

  const visibleApps = showAll ? apps : apps.filter((a) => a.installed);

  const grouped = GROUP_ORDER.map((g) => ({
    ...g,
    apps: visibleApps.filter((a) => a.group === g.id),
  })).filter((g) => g.apps.length > 0);

  const zh = lang === "zh-CN";

  return (
    <div className="apps-page">
      <div className="apps-head">
        <div>
          <h1>{t("nav.apps")}</h1>
          <p className="apps-sub">
            {zh
              ? "按软件识别专业缓存,自定义了路径的软件可手动指定实际位置。"
              : "Detects app-specific caches. For apps with custom paths, set the real location manually."}
          </p>
        </div>
        <label className="apps-toggle">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          <span>{zh ? "显示未安装" : "Show not installed"}</span>
        </label>
      </div>

      {loading ? (
        <div className="apps-empty">…</div>
      ) : grouped.length === 0 ? (
        <div className="apps-empty">
          {zh ? "未检测到已安装的相关软件" : "No matching apps detected"}
        </div>
      ) : (
        grouped.map((g) => (
          <section key={g.id} className="apps-group">
            <div className="apps-group-title">
              <Icon name={g.icon} size={16} />
              <span>{t(`group.${g.id}`)}</span>
            </div>
            <div className="apps-grid">
              {g.apps.map((app) => (
                <div
                  key={app.app}
                  className={`app-card ${app.installed ? "" : "not-installed"}`}
                >
                  <div className="app-card-head">
                    <AppIcon appId={app.app} name={app.name} size={34} />
                    <span className="app-name">{app.name}</span>
                    {!app.installed && (
                      <span className="app-badge">
                        {zh ? "未安装" : "not installed"}
                      </span>
                    )}
                  </div>
                  <div className="app-targets">
                    {app.targets.map((tg) => {
                      const path = tg.resolved[0] ?? "";
                      return (
                        <div key={tg.id} className="app-target">
                          <span
                            className="target-dot"
                            style={{ background: riskDot(tg.risk) }}
                          />
                          <div className="target-info">
                            <div className="target-name">{t(`cat.${tg.id}.name`)}</div>
                            <div className="target-path" title={path}>
                              {path || (zh ? "未找到路径" : "path not found")}
                              {tg.has_override && (
                                <span className="target-ov">
                                  {zh ? "已手动指定" : "custom"}
                                </span>
                              )}
                            </div>
                          </div>
                          {tg.supports_override && (
                            <div className="target-actions">
                              <button
                                className="btn-text target-btn"
                                onClick={() => specify(tg.id)}
                              >
                                <Icon name="folder-open" size={14} />
                              </button>
                              {tg.has_override && (
                                <button
                                  className="btn-text target-btn"
                                  onClick={() => clearOverride(tg.id)}
                                  title={zh ? "清除" : "clear"}
                                >
                                  <Icon name="close" size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
