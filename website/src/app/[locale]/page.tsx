import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/i18n/dict";
import { getHomeContent } from "@/content/home";
import { appGroups } from "@/content/apps";

const featureIcons: Record<string, React.ReactNode> = {
  f1: <path d="M4 14l4-8 4 6 3-4 5 8H4z" />,
  f2: <path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4z" />,
  f3: <path d="M4 5h16v4H4zM4 11h7v8H4zM13 11h7v8h-7z" />,
  f4: <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6zm9 3a3 3 0 100-6 3 3 0 000 6z" />,
  f5: <path d="M10 4H4v16h16V8h-8l-2-4z" />,
  f6: <path d="M12 3a5 5 0 015 5v2h1a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1h1V8a5 5 0 015-5zm3 7V8a3 3 0 10-6 0v2h6z" />,
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);
  const home = getHomeContent(locale);
  const lang: Locale = locale;

  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="hero-badge">{dict["hero.badge"]}</span>
          <h1 className="hero-title">{dict["hero.title"]}</h1>
          <p className="hero-desc">{dict["hero.desc"]}</p>
          <div className="hero-actions">
            <Link href={`/${locale}/download`} className="btn btn-primary">
              {dict["hero.cta"]}
            </Link>
            <a href="#features" className="btn btn-tonal">
              {dict["hero.cta2"]}
            </a>
          </div>
          <div className="hero-shot">
            <Image
              src={locale === "zh" ? "/cn.webp" : "/en.webp"}
              alt={dict["hero.screenshotAlt"]}
              width={1560}
              height={1123}
              priority
              sizes="(max-width: 848px) 100vw, 800px"
            />
          </div>
        </div>
      </section>

      <section className="stats-strip">
        <div className="container stats-grid">
          {home.stats.map((s) => (
            <div className="stat" key={s.label}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="risk-strip">
        <div className="container">
          <h2 className="risk-title">{dict["risk.title"]}</h2>
          <p className="risk-subtitle">{dict["risk.subtitle"]}</p>
          <div className="risk-cards">
            {(["cache", "expensive", "report"] as const).map((r) => (
              <div className={`risk-card risk-card-${r}`} key={r}>
                <div className="risk-card-head">
                  <i className={`dot dot-${r}`} />
                  <h3>{dict[`risk.${r}.name`]}</h3>
                  <span className={`risk-state risk-state-${r}`}>{dict[`risk.${r}.state`]}</span>
                </div>
                <p>{dict[`risk.${r}.desc`]}</p>
              </div>
            ))}
          </div>
          <div className="risk-note">
            <svg className="risk-note-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 015.5 5.5v0a5.5 5.5 0 01-5.5 5.5H11"
              />
            </svg>
            <span>{dict["risk.note"]}</span>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">{dict["features.title"]}</h2>
          <div className="feature-grid">
            {(["f1", "f2", "f3", "f4", "f5", "f6"] as const).map((k) => (
              <div className="feature-card" key={k}>
                <svg className="feature-icon" viewBox="0 0 24 24" aria-hidden="true">
                  {featureIcons[k]}
                </svg>
                <h3>{dict[`features.${k}.title`]}</h3>
                <p>{dict[`features.${k}.desc`]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="manual" className="manual">
        <div className="container">
          <h2 className="section-title">{home.modulesTitle}</h2>
          <p className="section-desc">{home.modulesDesc}</p>
          <div className="manual-grid">
            {home.modules.map((m, i) => (
              <article className="manual-card" key={m.key}>
                <div className="manual-head">
                  <span className="manual-index">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{m.name}</h3>
                    <p className="manual-tagline">{m.tagline}</p>
                  </div>
                </div>
                <ul className="manual-points">
                  {m.points.map((p, j) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="apps" className="apps-list">
        <div className="container">
          <h2 className="section-title">{home.appsTitle}</h2>
          <p className="section-desc">{home.appsDesc}</p>
          <div className="risk-items apps-legend">
            <span className="risk-item"><i className="dot dot-cache" />{dict["risk.cache"]}</span>
            <span className="risk-item"><i className="dot dot-expensive" />{dict["risk.expensive"]}</span>
            <span className="risk-item"><i className="dot dot-report" />{dict["risk.report"]}</span>
          </div>
          <div className="apps-groups">
            {appGroups.map((g) => (
              <div className="apps-group" key={g.key}>
                <h3 className="apps-group-title">{g.title[lang]}</h3>
                <div className="apps-chips">
                  {g.apps.flatMap((a) =>
                    a.targets.map((t, ti) => (
                      <span
                        className="app-chip"
                        key={`${a.name}-${ti}`}
                        title={t.desc[lang] || t.name[lang]}
                      >
                        <i className={`dot dot-${t.risk}`} />
                        <b>{a.name}</b>
                        <span className="app-chip-target">{t.name[lang]}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="page-note">{home.appsNote}</p>
        </div>
      </section>

      <section className="craft">
        <div className="container">
          <h2 className="section-title">{home.craftTitle}</h2>
          <p className="section-desc">{home.craftDesc}</p>
          <div className="craft-grid">
            {home.craft.map((c) => (
              <div className="craft-card" key={c.title}>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="notdo">
        <div className="container">
          <h2 className="section-title">{home.notDoTitle}</h2>
          <p className="section-desc">{home.notDoDesc}</p>
          <ul className="notdo-list">
            {home.notDo.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="tech" className="tech">
        <div className="container">
          <h2 className="section-title">{home.techTitle}</h2>
          <p className="section-desc">{home.techDesc}</p>
          <div className="tech-grid">
            {home.tech.map((t) => (
              <div className="tech-card" key={t.title}>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
                {t.link && (
                  <a className="tech-link" href={t.link.href} target="_blank" rel="noopener noreferrer">
                    {t.link.label}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="faq">
        <div className="container">
          <h2 className="section-title">{home.faqTitle}</h2>
          <div className="faq-grid">
            {home.faq.map((f) => (
              <div className="faq-item" key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container cta-inner">
          <h2>{dict["cta.title"]}</h2>
          <p>{dict["cta.desc"]}</p>
          <Link href={`/${locale}/download`} className="btn btn-primary btn-lg">
            {dict["hero.cta"]}
          </Link>
        </div>
      </section>
    </>
  );
}
