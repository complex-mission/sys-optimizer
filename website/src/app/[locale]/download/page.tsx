import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/i18n/dict";
import { formatDate, formatSize } from "@/lib/format";
import { listFiles, type OssFile } from "@/lib/oss";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDict(locale)["download.title"] };
}

async function getFiles(): Promise<OssFile[] | null> {
  try {
    return await listFiles();
  } catch (e) {
    console.error("download page list failed:", e);
    return null;
  }
}

export default async function DownloadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);
  const files = await getFiles();

  return (
    <section className="page">
      <div className="container">
        <h1 className="page-title">{dict["download.title"]}</h1>
        <p className="page-desc">{dict["download.desc"]}</p>

        {files === null && <div className="notice notice-error">{dict["download.error"]}</div>}
        {files !== null && files.length === 0 && <div className="notice">{dict["download.empty"]}</div>}

        {files !== null && files.length > 0 && (
          <div className="table-wrap">
            <table className="file-table">
              <thead>
                <tr>
                  <th>{dict["download.name"]}</th>
                  <th>{dict["download.size"]}</th>
                  <th>{dict["download.date"]}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {files.map((f, i) => (
                  <tr key={f.key}>
                    <td className="file-name">
                      {f.name}
                      {i === 0 && <span className="badge-latest">{dict["download.latest"]}</span>}
                    </td>
                    <td>{formatSize(f.size)}</td>
                    <td>{formatDate(f.lastModified, locale)}</td>
                    <td>
                      <a className="btn btn-primary btn-sm" href={`/api/download?file=${encodeURIComponent(f.key)}`}>
                        {dict["download.action"]}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="page-note">{dict["download.note"]}</p>
      </div>
    </section>
  );
}
