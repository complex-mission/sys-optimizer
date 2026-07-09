import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { api, AboutInfo, AppConfig, formatBytes } from "../lib/api";
import { Icon } from "../components/Icon";

const OSS_LICENSES = [
  { name: "Tauri", license: "MIT / Apache-2.0" },
  { name: "React", license: "MIT" },
  { name: "walkdir · rayon · trash · chrono", license: "MIT / Apache-2.0" },
  { name: "Roboto Flex", license: "OFL-1.1" },
  { name: "Noto Sans SC", license: "OFL-1.1" },
  { name: "Material Symbols", license: "Apache-2.0" },
];

export function AboutPage() {
  const { t } = useI18n();
  const [about, setAbout] = useState<AboutInfo | null>(null);
  const [cfg, setCfg] = useState<AppConfig | null>(null);

  useEffect(() => {
    api.aboutInfo().then(setAbout).catch(() => {});
    api.getConfig().then(setCfg).catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ color: "var(--primary)" }}>
          <Icon name="scan" size={36} />
        </span>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500 }}>Cache Insight 智缓</h1>
          {about && (
            <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>
              v{about.version} / {about.build_date}
            </p>
          )}
        </div>
      </div>

      <div style={statCardsWrap}>
        <div style={statCard}>
          <div style={statLabel}>{t("about.total_freed")}</div>
          <div style={statValue}>
            {cfg ? formatBytes(cfg.total_freed_bytes) : "--"}
          </div>
        </div>
        <div style={statCard}>
          <div style={statLabel}>{t("about.total_count")}</div>
          <div style={statValue}>
            {cfg ? `${cfg.total_clean_count} ${t("unit.times")}` : "--"}
          </div>
        </div>
      </div>

      <div>
        <h2 style={sectionTitle}>{t("about.oss")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {OSS_LICENSES.map((l) => (
            <div key={l.name} style={ossRow}>
              <span>{l.name}</span>
              <span style={{ color: "var(--on-surface-variant)" }}>{l.license}</span>
            </div>
          ))}
        </div>
      </div>

      {about && (
        <p style={{ fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.6 }}>
          {about.copyright}
        </p>
      )}
    </div>
  );
}

const statCardsWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};
const statCard: React.CSSProperties = {
  background: "var(--surface-container)",
  borderRadius: "var(--shape-md)",
  padding: "16px 18px",
};
const statLabel: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--on-surface-variant)",
};
const statValue: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 500,
  marginTop: 4,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--primary)",
  marginBottom: 10,
};
const ossRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 13,
  padding: "6px 0",
  borderBottom: "1px solid var(--outline-variant)",
};
