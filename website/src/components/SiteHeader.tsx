import Link from "next/link";
import type { Dict, Locale } from "@/i18n/dict";
import LangSwitch from "./LangSwitch";
import { LogoHorizontal } from "./logos";

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
          <LangSwitch locale={locale} />
        </nav>
      </div>
    </header>
  );
}
