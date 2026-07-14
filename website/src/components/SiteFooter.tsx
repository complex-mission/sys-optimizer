import Link from "next/link";
import type { Dict, Locale } from "@/i18n/dict";

export default function SiteFooter({ locale, dict }: { locale: Locale; dict: Dict }) {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <div>{dict["footer.copyright"]}</div>
          <div className="footer-muted">{dict["footer.support"]}</div>
        </div>
        <nav className="footer-nav">
          <Link href={`/${locale}/download`}>{dict["nav.download"]}</Link>
          <a href="https://github.com/complex-mission/sys-optimizer" target="_blank" rel="noopener noreferrer">
            {dict["footer.github"]}
          </a>
        </nav>
      </div>
    </footer>
  );
}
