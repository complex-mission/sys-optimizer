import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminClient from "@/components/AdminClient";
import { env } from "@/lib/env";
import { getDict, isLocale } from "@/i18n/dict";

// 管理后台藏在 env 配置的路径段后面(ADMIN_PATH),猜错的路径一律 404,
// 与不存在的页面无法区分
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; secret: string }> }): Promise<Metadata> {
  const { locale, secret } = await params;
  if (!isLocale(locale) || !env.adminPath || secret !== env.adminPath) return {};
  return { title: getDict(locale)["admin.title"], robots: { index: false } };
}

export default async function AdminPage({ params }: { params: Promise<{ locale: string; secret: string }> }) {
  const { locale, secret } = await params;
  if (!isLocale(locale) || !env.adminPath || secret !== env.adminPath) notFound();
  return <AdminClient locale={locale} dict={getDict(locale)} />;
}
