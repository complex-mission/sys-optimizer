import { useEffect, useState, useCallback } from "react";
import { open, message } from "@tauri-apps/plugin-dialog";
import { useI18n } from "../i18n";
import { api, onAppSizeCacheChanged, AppView, Risk, TargetSizeCache, formatBytes } from "../lib/api";
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

/** 格式化扫描时间(相对时间) */
function formatScannedAt(ts: number, zh: boolean): string {
  if (!ts) return "";
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  if (diff < 60) return zh ? "刚刚" : "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}${zh ? "分钟前" : "min ago"}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${zh ? "小时前" : "h ago"}`;
  return `${Math.floor(diff / 86400)}${zh ? "天前" : "d ago"}`;
}

export function AppsPage() {
  const { t, lang } = useI18n();
  const [apps, setApps] = useState<AppView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [sizeCache, setSizeCache] = useState<Record<string, TargetSizeCache>>({});
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());

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

  const loadSizeCache = async () => {
    try {
      const cache = await api.getAppSizeCache();
      setSizeCache(cache);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load();
    loadSizeCache();
    // 智能扫描(含清理后的复扫)会更新同一份大小缓存,这里跟着刷新卡片上的数字
    return onAppSizeCacheChanged(loadSizeCache);
  }, []);

  const scanSize = useCallback(async (targetId: string) => {
    setScanningIds((prev) => new Set(prev).add(targetId));
    try {
      const result = await api.scanAppSize(targetId);
      setSizeCache((prev) => ({ ...prev, [targetId]: result }));
    } catch (e) {
      // ignore scan errors
    } finally {
      setScanningIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }, []);

  const specify = async (id: string, currentPath?: string) => {
    try {
      const picked = await open({
        directory: true,
        multiple: false,
        // 从当前解析路径打开选择器,方便就近调整
        defaultPath: currentPath || undefined,
      });
      if (typeof picked === "string") {
        await api.setPathOverride(id, [picked]);
        load();
      }
    } catch (e) {
      // setPathOverride 拒绝危险目录时把原因告诉用户;取消选择则静默
      if (e) {
        await message(String(e), { title: zh ? "无法设置路径" : "Can't set path", kind: "error" }).catch(() => {});
      }
    }
  };

  const clearOverride = async (id: string) => {
    await api.setPathOverride(id, []).catch(() => {});
    load();
  };

  const openInExplorer = (path: string) =>
    api.openPath(path).catch((e) =>
      message(String(e), { title: zh ? "无法打开位置" : "Can't open location", kind: "warning" }).catch(() => {})
    );

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

      {/* 风险圆点图例 */}
      <div className="apps-legend">
        {(["cache", "expensive", "report"] as Risk[]).map((r) => (
          <span key={r} className="apps-legend-item">
            <span className="target-dot" style={{ background: riskDot(r) }} />
            {t(`apps.legend.${r}`)}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="apps-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="app-card apps-skeleton">
              <div className="apps-sk-head">
                <span className="apps-sk-block apps-sk-icon" />
                <span className="apps-sk-block apps-sk-name" />
              </div>
              <div className="apps-sk-block apps-sk-line" />
              <div className="apps-sk-block apps-sk-line short" />
            </div>
          ))}
        </div>
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
              {g.apps.map((app) => {
                // 第四槽(清除自定义路径)按卡片保留:卡内有手动指定的目标才占位,
                // 否则整槽不渲染,避免动作区右侧常年空一格
                const anyOverride = app.targets.some((t) => t.has_override);
                return (
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
                      const path = (tg.resolved[0] ?? "").replace(/\//g, "\\");
                      const cached = sizeCache[tg.id];
                      const isScanning = scanningIds.has(tg.id);
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
                              {path && !tg.exists && (
                                <span className="target-missing">
                                  {zh ? "目录不存在" : "missing"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="target-actions">
                            {cached && (
                              <div className="target-size" title={`${cached.files} ${zh ? "个文件" : "files"}`}>
                                <span className="target-size-value">{formatBytes(cached.bytes)}</span>
                                <span className="target-size-time">
                                  {formatScannedAt(cached.scanned_at, zh)}
                                </span>
                              </div>
                            )}
                            {/* 前三个动作槽位恒定:不可用的显示压暗图标,不适用的留同宽空位,保证各行列对齐 */}
                            {path && tg.exists ? (
                              <button
                                className={`btn-text target-size-btn ${isScanning ? "scanning" : ""}`}
                                onClick={() => scanSize(tg.id)}
                                disabled={isScanning}
                                title={
                                  cached
                                    ? zh ? "重新扫描大小" : "Rescan size"
                                    : zh ? "扫描大小" : "Scan size"
                                }
                              >
                                <Icon name={isScanning ? "refresh" : "database"} size={14} />
                              </button>
                            ) : (
                              <span className="target-size-btn target-slot-disabled" aria-hidden="true">
                                <Icon name="database" size={14} />
                              </span>
                            )}
                            {path && tg.exists ? (
                              <button
                                className="btn-text target-btn"
                                onClick={() => openInExplorer(path)}
                                title={zh ? "打开文件夹" : "Open folder"}
                              >
                                <Icon name="folder-open" size={14} />
                              </button>
                            ) : (
                              <span className="target-btn target-slot-disabled" aria-hidden="true">
                                <Icon name="folder-open" size={14} />
                              </span>
                            )}
                            {tg.supports_override ? (
                              <button
                                className="btn-text target-btn"
                                onClick={() => specify(tg.id, path)}
                                title={zh ? "指定实际路径" : "Set actual path"}
                              >
                                <Icon name="tune" size={14} />
                              </button>
                            ) : (
                              <span className="target-btn target-slot-empty" aria-hidden="true" />
                            )}
                            {tg.has_override ? (
                              <button
                                className="btn-text target-btn"
                                onClick={() => clearOverride(tg.id)}
                                title={zh ? "清除自定义路径" : "Clear custom path"}
                              >
                                <Icon name="close" size={14} />
                              </button>
                            ) : anyOverride ? (
                              <span className="target-btn target-slot-empty" aria-hidden="true" />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
