import Link from "next/link";
import type { Dict, Locale } from "@/i18n/dict";
import LangSwitch from "./LangSwitch";
import { GithubIcon, LogoHorizontal } from "./logos";

export default function SiteHeader({ locale, dict }: { locale: Locale; dict: Dict }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href={`/${locale}`} className="brand" aria-label={dict["site.name"]}>
          <LogoHorizontal locale={locale} className="brand-logo" />
        </Link>
        <nav className="site-nav">
          <Link href={`/${locale}`}>{dict["nav.home"]}</Link>
          <Link href={`/${locale}/download`}>{dict["nav.download"]}</Link>
          <Link href={`/${locale}/feedback`}>{dict["nav.feedback"]}</Link>
          <a
            href="https://github.com/complex-mission/sys-optimizer"
            target="_blank"
            rel="noopener noreferrer"
            className="gh-link"
            aria-label={dict["footer.github"]}
            title={dict["footer.github"]}
          >
            <GithubIcon className="gh-icon" />
          </a>
          <LangSwitch locale={locale} />
        </nav>
      </div>
    </header>
  );
}
