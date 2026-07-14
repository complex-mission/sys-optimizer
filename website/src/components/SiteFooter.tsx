import Link from "next/link";
import type { Dict, Locale } from "@/i18n/dict";
import { GithubIcon, LogoHorizontal } from "./logos";

export default function SiteFooter({ locale, dict }: { locale: Locale; dict: Dict }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <LogoHorizontal locale={locale} className="footer-logo" />
            <p className="footer-tagline">{dict["site.tagline"]}</p>
          </div>
          <nav className="footer-nav">
            <Link href={`/${locale}`}>{dict["nav.home"]}</Link>
            <Link href={`/${locale}/download`}>{dict["nav.download"]}</Link>
            <Link href={`/${locale}/feedback`}>{dict["nav.feedback"]}</Link>
            <a
              href="https://github.com/complex-mission/sys-optimizer"
              target="_blank"
              rel="noopener noreferrer"
              className="gh-link"
            >
              <GithubIcon className="gh-icon" />
              {dict["footer.github"]}
            </a>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>{dict["footer.copyright"]}</span>
          <span>{dict["footer.support"]}</span>
        </div>
      </div>
    </footer>
  );
}
