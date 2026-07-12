import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { api, AboutInfo, AppConfig, formatBytes, onStatsChanged } from "../lib/api";
import { TermsGate } from "../components/TermsGate";
import logoUrl from "../assets/cache-insight-logo.svg";

const OSS_LICENSES = [
  { name: "Tauri", license: "MIT / Apache-2.0" },
  { name: "React", license: "MIT" },
  { name: "walkdir · rayon · trash · chrono", license: "MIT / Apache-2.0" },
  { name: "Roboto Flex", license: "OFL-1.1" },
  { name: "Noto Sans SC", license: "OFL-1.1" },
  { name: "Material Symbols", license: "Apache-2.0" },
];

export function AboutPage() {
  const { t, lang } = useI18n();
  const zh = lang === "zh-CN";
  const [about, setAbout] = useState<AboutInfo | null>(null);
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const homepage = about ? ensureHttps(about.homepage) : "";

  useEffect(() => {
    api.aboutInfo().then(setAbout).catch(() => {});
    api.getConfig().then(setCfg).catch(() => {});
    return onStatsChanged(() => {
      api.getConfig().then(setCfg).catch(() => {});
    });
  }, []);

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img src={logoUrl} width={44} height={44} alt="" style={{ borderRadius: 10 }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.2 }}>{t("app.name")}</h1>
          {about && (
            <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>
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

      <button style={termsLink} onClick={() => setShowTerms(true)}>
        {t("about.terms")}
      </button>

      {about && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.6 }}>
            {t("about.website_hint")}
            <a
              href={homepage}
              title={t("about.website")}
              onClick={(e) => {
                e.preventDefault();
                api.openUrl(homepage).catch(() => {});
              }}
              style={{
                color: "var(--primary)",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              {homepage}
            </a>
          </p>
          <p style={{ fontSize: 12, color: "var(--on-surface-variant)", lineHeight: 1.6 }}>
            {zh ? about.copyright : "© 2026 XS Tech Co, Ltd. All rights reserved. · Support: Complex Mission"}
          </p>
        </div>
      )}

      {showTerms && <TermsGate viewOnly onAccept={() => setShowTerms(false)} />}
    </div>
  );
}

function ensureHttps(url: string): string {
  const value = url.trim();
  if (value.startsWith("https://")) return value;
  if (value.startsWith("http://")) return `https://${value.slice("http://".length)}`;
  return `https://${value}`;
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
const termsLink: React.CSSProperties = {
  alignSelf: "flex-start",
  background: "none",
  border: "none",
  padding: 0,
  fontSize: 13,
  color: "var(--primary)",
  cursor: "pointer",
};
const ossRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 13,
  padding: "6px 0",
  borderBottom: "1px solid var(--outline-variant)",
};
