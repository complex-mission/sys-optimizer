"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/dict";

export default function LangSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? `/${locale}`;
  const other: Locale = locale === "zh" ? "en" : "zh";
  const target = pathname.replace(/^\/(zh|en)/, `/${other}`);
  return (
    <Link className="lang-switch" href={target} prefetch={false}>
      {locale === "zh" ? "English" : "中文"}
    </Link>
  );
}
