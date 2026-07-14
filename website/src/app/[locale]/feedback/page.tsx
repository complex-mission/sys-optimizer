import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FeedbackForm from "@/components/FeedbackForm";
import { getDict, isLocale } from "@/i18n/dict";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDict(locale)["feedback.title"] };
}

export default async function FeedbackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);

  return (
    <section className="page">
      <div className="container container-narrow">
        <h1 className="page-title">{dict["feedback.title"]}</h1>
        <p className="page-desc">{dict["feedback.desc"]}</p>
        <FeedbackForm locale={locale} />
        <p className="page-note">
          {dict["feedback.note"]}{" "}
          <a href="https://github.com/complex-mission/sys-optimizer/issues" target="_blank" rel="noopener noreferrer">
            GitHub Issues →
          </a>
        </p>
      </div>
    </section>
  );
}
