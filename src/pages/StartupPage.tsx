import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { api, StartupItem, StartupSource } from "../lib/api";
import { Icon, IconName } from "../components/Icon";
import "./StartupPage.css";

function sourceIcon(src: StartupSource): IconName {
  if (src === "task") return "settings";
  if (src === "folder") return "folder-open";
  return "play";
}

export function StartupPage() {
  const { t, lang } = useI18n();
  const zh = lang === "zh-CN";

  const [items, setItems] = useState<StartupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.listStartup();
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (item: StartupItem) => {
    const want = !item.enabled;
    setBusy(item.id);
    setError(null);
    // 乐观更新
    setItems((prev) =>
      prev.map((x) => (x.id === item.id ? { ...x, enabled: want } : x))
    );
    try {
      await api.setStartupEnabled(item.id, want);
    } catch (e) {
      // 回滚
      setItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, enabled: item.enabled } : x))
      );
      setError(
        zh
          ? `无法修改「${item.name}」。系统级启动项需要管理员权限。`
          : `Couldn't change "${item.name}". System-level items need administrator rights.`
      );
    } finally {
      setBusy(null);
    }
  };

  const sourceLabel = (src: StartupSource): string => {
    const zhMap = { registry: "注册表", folder: "启动文件夹", task: "计划任务" };
    const enMap = { registry: "Registry", folder: "Startup folder", task: "Scheduled task" };
    return (zh ? zhMap : enMap)[src];
  };

  const enabledCount = items.filter((i) => i.enabled).length;

  return (
    <div className="startup-page">
      <div className="startup-head">
        <h1>{t("nav.startup")}</h1>
        <p className="startup-sub">
          {zh
            ? "管理开机自启动的程序。关闭开关即禁用(不删除),随时可重新启用。"
            : "Manage what launches at startup. Toggling off disables (doesn't delete) — re-enable anytime."}
        </p>
      </div>

      {error && <div className="startup-error">{error}</div>}

      {loading ? (
        <div className="startup-empty">…</div>
      ) : items.length === 0 ? (
        <div className="startup-empty">
          {zh ? "没有检测到启动项" : "No startup items found"}
        </div>
      ) : (
        <>
          <div className="startup-summary">
            {zh
              ? `共 ${items.length} 项 · ${enabledCount} 项已启用`
              : `${items.length} items · ${enabledCount} enabled`}
          </div>
          <div className="startup-list">
            {items.map((item) => (
              <div key={item.id} className={`startup-row ${item.enabled ? "" : "disabled"}`}>
                <span className="startup-icon">
                  <Icon name={sourceIcon(item.source)} size={18} />
                </span>
                <div className="startup-info">
                  <div className="startup-name">{item.name}</div>
                  <div className="startup-cmd" title={item.command}>
                    {item.command}
                  </div>
                </div>
                <div className="startup-meta">
                  <span className="startup-source">{sourceLabel(item.source)}</span>
                  {item.scope === "machine" && (
                    <span className="startup-scope">{zh ? "所有用户" : "All users"}</span>
                  )}
                </div>
                <button
                  className={`toggle ${item.enabled ? "on" : "off"}`}
                  onClick={() => toggle(item)}
                  disabled={busy === item.id}
                  role="switch"
                  aria-checked={item.enabled}
                  aria-label={item.name}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
