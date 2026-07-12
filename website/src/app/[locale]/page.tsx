import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/i18n/dict";

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
        </div>
      </section>

      <section className="risk-strip">
        <div className="container">
          <h2 className="risk-title">{dict["risk.title"]}</h2>
          <div className="risk-items">
            <span className="risk-item"><i className="dot dot-cache" />{dict["risk.cache"]}</span>
            <span className="risk-item"><i className="dot dot-expensive" />{dict["risk.expensive"]}</span>
            <span className="risk-item"><i className="dot dot-report" />{dict["risk.report"]}</span>
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
