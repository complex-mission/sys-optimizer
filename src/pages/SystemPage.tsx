import { useEffect, useState } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useI18n } from "../i18n";
import { api, SystemSpaceItem, formatBytes } from "../lib/api";
import { Icon, IconName } from "../components/Icon";
import "./SystemPage.css";

interface ItemMeta {
  id: string;
  icon: IconName;
  nameZh: string;
  nameEn: string;
  costZh: string;
  costEn: string;
  actionZh: string;
  actionEn: string;
}

const META: ItemMeta[] = [
  {
    id: "hibernation",
    icon: "bolt",
    nameZh: "休眠文件",
    nameEn: "Hibernation file",
    costZh: "关闭后将无法使用休眠和快速启动,hiberfil.sys 被移除。",
    costEn: "Disables hibernation and fast startup; hiberfil.sys is removed.",
    actionZh: "关闭休眠",
    actionEn: "Turn off hibernation",
  },
  {
    id: "restore-points",
    icon: "radar",
    nameZh: "系统还原点",
    nameEn: "System restore points",
    costZh: "将还原点存储上限收缩至 1GB,较旧的还原点会被清除,减少可回滚的时间点。",
    costEn: "Shrinks restore storage to 1GB; older restore points are removed.",
    actionZh: "收缩还原点",
    actionEn: "Shrink restore points",
  },
  {
    id: "windows-old",
    icon: "package",
    nameZh: "Windows.old",
    nameEn: "Windows.old",
    costZh: "移除上一个 Windows 版本的备份,清理后无法回退到旧版本。",
    costEn: "Removes the previous Windows version; you can't roll back after this.",
    actionZh: "清理旧版本",
    actionEn: "Clean up old version",
  },
  {
    id: "winsxs",
    icon: "file-zip",
    nameZh: "WinSxS 组件存储",
    nameEn: "WinSxS component store",
    costZh: "清理被取代的系统组件,清理后无法卸载已安装的更新。",
    costEn: "Removes superseded system components; installed updates can't be uninstalled after.",
    actionZh: "清理组件存储",
    actionEn: "Clean component store",
  },
];

export function SystemPage() {
  const { t, lang } = useI18n();
  const zh = lang === "zh-CN";

  const [items, setItems] = useState<SystemSpaceItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.listSystemSpace();
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

  const byId = (id: string) => items?.find((i) => i.id === id);

  const run = async (meta: ItemMeta) => {
    const ok = await confirm(zh ? meta.costZh : meta.costEn, {
      title: (zh ? meta.actionZh : meta.actionEn) + "?",
      kind: "warning",
    }).catch(() => false);
    if (!ok) return;

    setBusy(meta.id);
    try {
      const res = await api.executeSystemSpace(meta.id);
      setResults((prev) => ({ ...prev, [meta.id]: { ok: res.success, msg: res.message } }));
      if (res.success) await load(); // 刷新体积/状态
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [meta.id]: { ok: false, msg: String(e) },
      }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="system-page">
      <div className="system-head">
        <h1>{t("nav.system")}</h1>
        <p className="system-sub">
          {zh
            ? "回收系统占用的大块空间。每项都有代价,请阅读说明后再操作。"
            : "Reclaim large chunks of system space. Each has a cost — read before acting."}
        </p>
      </div>

      <div className="system-notice">
        <Icon name="info" size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          {zh
            ? "这些操作会改变系统状态且不可轻易撤销。默认全部关闭,请逐项确认。"
            : "These change system state and aren't easily undone. All off by default — confirm each one."}
        </div>
      </div>

      {loading && !items ? (
        <div className="system-empty">{zh ? "正在检测…" : "Checking…"}</div>
      ) : (
        <div className="system-grid">
          {META.map((meta) => {
            const item = byId(meta.id);
            const bytes = item?.bytes ?? 0;
            const available = item?.available ?? false;
            const result = results[meta.id];
            return (
              <div key={meta.id} className={`system-card ${available ? "" : "unavailable"}`}>
                <div className="system-card-head">
                  <span className="system-icon">
                    <Icon name={meta.icon} size={20} />
                  </span>
                  <div className="system-card-title">
                    <div className="system-name">{zh ? meta.nameZh : meta.nameEn}</div>
                    <div className="system-bytes">
                      {available
                        ? bytes > 0
                          ? formatBytes(bytes)
                          : zh ? "可清理" : "available"
                        : zh ? "当前无需处理" : "nothing to do"}
                    </div>
                  </div>
                </div>
                <p className="system-cost">{zh ? meta.costZh : meta.costEn}</p>
                {result && (
                  <div className={`system-result ${result.ok ? "ok" : "err"}`}>
                    {result.msg}
                  </div>
                )}
                <button
                  className="btn-outline system-action"
                  onClick={() => run(meta)}
                  disabled={!available || busy === meta.id}
                >
                  {busy === meta.id
                    ? zh ? "处理中…" : "Working…"
                    : zh ? meta.actionZh : meta.actionEn}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
