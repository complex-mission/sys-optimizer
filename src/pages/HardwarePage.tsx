import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { api, HardwareReport, formatBytes } from "../lib/api";
import { Icon, IconName } from "../components/Icon";
import "./HardwarePage.css";

export function HardwarePage() {
  const { t, lang } = useI18n();
  const zh = lang === "zh-CN";

  const [hw, setHw] = useState<HardwareReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const reload = () => {
    setLoading(true);
    api
      .hardwareReport()
      .then(setHw)
      .catch(() => setHw(null))
      .finally(() => setLoading(false));
  };

  // 首次进入自动读取;之后由用户手动“刷新”(keep-alive 保留结果)
  useEffect(() => {
    reload();
  }, []);

  const na = zh ? "厂商未提供" : "not provided";
  const show = (s: string) => (s && s.length > 0 ? s : na);

  const copyReport = async () => {
    if (!hw) return;
    const lines: string[] = [];
    lines.push(`Cache Insight ${zh ? "硬件报告" : "Hardware Report"}`);
    lines.push(`CPU: ${show(hw.cpu_model)} (${hw.cpu_cores}C/${hw.cpu_threads}T @ ${hw.cpu_mhz}MHz)`);
    lines.push(`${zh ? "主板" : "Board"}: ${show(hw.board_vendor)} ${show(hw.board_model)}`);
    lines.push(`BIOS: ${show(hw.bios_version)}`);
    lines.push(`GPU: ${show(hw.gpu_model)}`);
    if (hw.gpu_driver_version) {
      lines.push(
        `${zh ? "显卡驱动" : "GPU driver"}: ${hw.gpu_driver_version}${hw.gpu_driver_date ? ` (${hw.gpu_driver_date})` : ""}`
      );
    }
    lines.push(
      `${zh ? "内存" : "Memory"}: ${formatBytes(hw.memory_total_bytes)} (${hw.memory_slots_used}/${hw.memory_slots_total} ${zh ? "槽" : "slots"})`
    );
    hw.memory_slots.forEach((s) => {
      lines.push(
        `  ${s.locator}: ${s.occupied ? `${formatBytes(s.capacity_bytes)} ${s.kind} ${s.speed_mhz}MHz ${s.manufacturer} ${s.part_number}` : zh ? "空" : "empty"}`
      );
    });
    hw.disks.forEach((d) => {
      lines.push(`${zh ? "磁盘" : "Disk"}: ${show(d.model)} ${formatBytes(d.bytes)} ${d.media_type} ${d.bus_type}`);
    });
    if (hw.battery.present) {
      lines.push(`${zh ? "电池健康" : "Battery"}: ${hw.battery.health_percent}%`);
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 忽略 */
    }
  };

  if (loading) {
    return <div className="hw-empty">{zh ? "正在读取硬件信息…" : "Reading hardware info…"}</div>;
  }

  if (!hw || !hw.available) {
    return (
      <div className="hw-page">
        <h1 className="hw-title">{t("nav.hardware")}</h1>
        <div className="hw-unavailable">
          {zh
            ? "无法读取硬件信息(仅 Windows 支持,或 WMI 查询失败)。"
            : "Can't read hardware info (Windows only, or WMI query failed)."}
        </div>
      </div>
    );
  }

  const usedRatio = hw.memory_slots_total > 0 ? hw.memory_slots_used / hw.memory_slots_total : 0;

  return (
    <div className="hw-page">
      <div className="hw-head">
        <h1 className="hw-title">{t("nav.hardware")}</h1>
        <div className="hw-head-actions">
          <button className="btn-text hw-refresh" onClick={reload} disabled={loading} title={zh ? "刷新" : "Refresh"}>
            <Icon name="refresh" size={15} />
          </button>
          <button className="btn-outline" onClick={copyReport}>
            <Icon name="copy" size={14} style={{ marginRight: 4 }} />
            {copied ? (zh ? "已复制" : "Copied") : zh ? "复制报告" : "Copy report"}
          </button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="hw-overview">
        <OverviewCard icon="settings" label="CPU" value={show(hw.cpu_model)} sub={`${hw.cpu_cores}${zh ? "核" : "C"} / ${hw.cpu_threads}${zh ? "线程" : "T"} · ${(hw.cpu_mhz / 1000).toFixed(1)} GHz`} />
        <OverviewCard
          icon="apps"
          label="GPU"
          value={show(hw.gpu_model)}
          sub={[
            hw.gpu_vram_bytes > 0 ? `${zh ? "显存" : "VRAM"} ${formatBytes(hw.gpu_vram_bytes)}` : "",
            hw.gpu_driver_version
              ? `${zh ? "驱动" : "Driver"} ${hw.gpu_driver_version}${hw.gpu_driver_date ? ` (${hw.gpu_driver_date})` : ""}`
              : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <OverviewCard icon="tune" label={zh ? "主板" : "Board"} value={`${show(hw.board_vendor)} ${show(hw.board_model)}`.trim()} sub={`BIOS ${show(hw.bios_version)}`} />
      </div>

      {/* 内存插槽可视化(需求核心) */}
      <section className="hw-section">
        <div className="hw-section-title">
          <Icon name="memory" size={16} />
          <span>{zh ? "内存插槽" : "Memory slots"}</span>
          <span className="hw-section-meta">
            {formatBytes(hw.memory_total_bytes)} · {hw.memory_slots_used}/{hw.memory_slots_total} {zh ? "已用" : "used"}
          </span>
        </div>

        <div className="slot-row">
          {hw.memory_slots.map((s, i) => (
            <div key={i} className={`slot ${s.occupied ? "occupied" : "empty"}`}>
              <div className="slot-locator">{s.locator || `SLOT ${i + 1}`}</div>
              {s.occupied ? (
                <>
                  <div className="slot-cap">{formatBytes(s.capacity_bytes)}</div>
                  <div className="slot-detail">
                    {[s.kind, s.speed_mhz > 0 ? `${s.speed_mhz}MHz` : ""].filter(Boolean).join(" · ")}
                  </div>
                  {s.manufacturer && <div className="slot-mfr">{s.manufacturer}</div>}
                </>
              ) : (
                <div className="slot-empty-label">{zh ? "空槽" : "empty"}</div>
              )}
            </div>
          ))}
          {/* 补足未报告的空槽(总数 > 已列出) */}
          {Array.from({ length: Math.max(0, hw.memory_slots_total - hw.memory_slots.length) }).map((_, i) => (
            <div key={`e${i}`} className="slot empty">
              <div className="slot-locator">SLOT</div>
              <div className="slot-empty-label">{zh ? "空槽" : "empty"}</div>
            </div>
          ))}
        </div>
        {usedRatio < 1 && (
          <p className="hw-hint">
            {zh
              ? `还有 ${hw.memory_slots_total - hw.memory_slots_used} 个空槽,可加装内存。`
              : `${hw.memory_slots_total - hw.memory_slots_used} free slot(s) — you can add more memory.`}
          </p>
        )}
      </section>

      {/* 存储:物理磁盘 + 分区使用率 */}
      {(hw.disks.length > 0 || hw.volumes.length > 0) && (
        <section className="hw-section">
          <div className="hw-section-title">
            <Icon name="drive" size={16} />
            <span>{zh ? "存储" : "Storage"}</span>
          </div>

          {hw.disks.length > 0 && (
            <div className="hw-rows">
              {hw.disks.map((d, i) => (
                <div key={i} className="hw-row">
                  <div className="hw-row-name">{show(d.model)}</div>
                  <div className="hw-row-meta">
                    {[d.media_type, d.bus_type].filter(Boolean).join(" · ") ||
                      (zh ? "磁盘" : "disk")}
                  </div>
                  <div className="hw-row-value">{formatBytes(d.bytes)}</div>
                </div>
              ))}
            </div>
          )}

          {/* 分区使用率 */}
          {hw.volumes.length > 0 && (
            <div className="vol-grid">
              {hw.volumes.map((v, i) => {
                const used = v.total_bytes - v.free_bytes;
                const pct = v.total_bytes > 0 ? Math.round((used / v.total_bytes) * 100) : 0;
                const hot = pct >= 90;
                return (
                  <div key={i} className="vol-card">
                    <div className="vol-head">
                      <span className="vol-letter">
                        {v.letter}
                        {v.label ? ` ${v.label}` : ""}
                      </span>
                      <span className="vol-fs">{v.fs}</span>
                    </div>
                    <div className="vol-bar">
                      <div
                        className={`vol-fill ${hot ? "hot" : ""}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="vol-meta">
                      <span>
                        {formatBytes(used)} / {formatBytes(v.total_bytes)} · {pct}%
                      </span>
                      <span className="vol-free">
                        {formatBytes(v.free_bytes)} {zh ? "可用" : "free"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 显示器 */}
      {hw.displays.length > 0 && (
        <section className="hw-section">
          <div className="hw-section-title">
            <Icon name="apps" size={16} />
            <span>{zh ? "显示设备" : "Displays"}</span>
          </div>
          <div className="hw-rows">
            {hw.displays.map((d, i) => (
              <div key={i} className="hw-row">
                <div className="hw-row-name">{show(d.name)}</div>
                <div className="hw-row-value">
                  {d.width} × {d.height}
                  {d.refresh_hz > 0 ? ` @ ${d.refresh_hz}Hz` : ""}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 电池 */}
      {hw.battery.present && (
        <section className="hw-section">
          <div className="hw-section-title">
            <Icon name="bolt" size={16} />
            <span>{zh ? "电池" : "Battery"}</span>
          </div>
          <div className="battery-health">
            <div className="battery-bar">
              <div
                className="battery-fill"
                style={{
                  width: `${hw.battery.health_percent}%`,
                  background:
                    hw.battery.health_percent >= 80
                      ? "var(--risk-cache)"
                      : hw.battery.health_percent >= 50
                      ? "var(--risk-expensive)"
                      : "var(--error)",
                }}
              />
            </div>
            <span className="battery-pct">
              {hw.battery.health_percent}% {zh ? "健康度" : "health"}
            </span>
          </div>
        </section>
      )}

      <p className="hw-footnote">
        {zh
          ? "不含温度、风扇转速等需内核驱动的数据。信息来自系统固件(SMBIOS),部分字段可能为厂商未填。"
          : "Temperature and fan speed (which need a kernel driver) are not shown. Data comes from system firmware (SMBIOS); some fields may be unset by the vendor."}
      </p>
    </div>
  );
}

function OverviewCard({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub: string }) {
  return (
    <div className="ov-card">
      <div className="ov-icon">
        <Icon name={icon} size={18} />
      </div>
      <div className="ov-label">{label}</div>
      <div className="ov-value" title={value}>
        {value}
      </div>
      {sub && <div className="ov-sub">{sub}</div>}
    </div>
  );
}
