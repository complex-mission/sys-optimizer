import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { getDict, isLocale, locales } from "@/i18n/dict";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDict(locale);
  const title = locale === "zh" ? "系统优化助手 SysOptimizer" : "SysOptimizer";
  return {
    title: { default: title, template: `%s · ${title}` },
    description: dict["hero.desc"],
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);
  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"}>
      <head>
        {/* 抢在浏览器恢复滚动位置之前关闭原生恢复,否则刷新时会先闪现在原位置、
            再被 App Router 重置回顶部,造成可见的跳动 */}
        <script dangerouslySetInnerHTML={{ __html: "history.scrollRestoration='manual'" }} />
      </head>
      <body>
        <SiteHeader locale={locale} dict={dict} />
        <main>{children}</main>
        <SiteFooter locale={locale} dict={dict} />
      </body>
    </html>
  );
}
