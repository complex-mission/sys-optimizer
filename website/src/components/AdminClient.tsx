"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dict, Locale } from "@/i18n/dict";
import { formatDate, formatSize } from "@/lib/format";

interface OssFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
}

interface LogEntry {
  time: string;
  ip: string;
  key: string;
  userAgent: string;
}

type Tab = "upload" | "files" | "logs";

export default function AdminClient({ locale, dict }: { locale: Locale; dict: Dict }) {
  const t = useCallback((k: string) => dict[k] ?? k, [dict]);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => setLoggedIn(!!d.loggedIn))
      .catch(() => setLoggedIn(false));
  }, []);

  if (loggedIn === null) {
    return <section className="page"><div className="container admin-loading" /></section>;
  }
  return loggedIn ? (
    <Dashboard locale={locale} t={t} onLogout={() => setLoggedIn(false)} />
  ) : (
    <Login t={t} onSuccess={() => setLoggedIn(true)} />
  );
}

function Login({ t, onSuccess }: { t: (k: string) => string; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) onSuccess();
      else if (res.status === 429) setError(t("admin.tooMany"));
      else setError(t("admin.wrongPassword"));
    } catch {
      setError(t("admin.networkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <div className="container">
        <form className="login-card" onSubmit={submit}>
          <h1 className="page-title">{t("admin.title")}</h1>
          <label className="field-label" htmlFor="admin-pw">{t("admin.password")}</label>
          <input
            id="admin-pw"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <div className="notice notice-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy || !password}>
            {busy ? t("admin.loggingIn") : t("admin.login")}
          </button>
        </form>
      </div>
    </section>
  );
}

function Dashboard({ locale, t, onLogout }: { locale: Locale; t: (k: string) => string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("upload");

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  return (
    <section className="page">
      <div className="container">
        <div className="admin-top">
          <h1 className="page-title">{t("admin.title")}</h1>
          <button className="btn btn-tonal btn-sm" onClick={logout}>{t("admin.logout")}</button>
        </div>
        <div className="tabs">
          {(["upload", "files", "logs"] as Tab[]).map((k) => (
            <button key={k} className={`tab ${tab === k ? "tab-active" : ""}`} onClick={() => setTab(k)}>
              {t(`admin.tab.${k}`)}
            </button>
          ))}
        </div>
        {tab === "upload" && <UploadPanel t={t} />}
        {tab === "files" && <FilesPanel locale={locale} t={t} />}
        {tab === "logs" && <LogsPanel locale={locale} t={t} />}
      </div>
    </section>
  );
}

function UploadPanel({ t }: { t: (k: string) => string }) {
  const [file, setFile] = useState<File | null>(null);
  const [rename, setRename] = useState("");
  const [progress, setProgress] = useState(-1);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function upload() {
    if (!file) return;
    setMessage(null);
    setProgress(0);

    const form = new FormData();
    form.append("file", file);
    if (rename.trim()) form.append("name", rename.trim());

    // 用 XHR 以获得上传进度
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgress(-1);
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        setMessage({
          ok: true,
          text: `${t("admin.upload.done")} ${data.key}${data.sha256 ? ` · SHA-256: ${data.sha256}` : ""}`,
        });
        setFile(null);
        setRename("");
        if (inputRef.current) inputRef.current.value = "";
      } else {
        setMessage({ ok: false, text: `${t("admin.upload.fail")} (${xhr.status})` });
      }
    };
    xhr.onerror = () => {
      setProgress(-1);
      setMessage({ ok: false, text: t("admin.upload.fail") });
    };
    xhr.send(form);
  }

  return (
    <div className="panel">
      <p className="panel-hint">{t("admin.upload.hint")}</p>
      <input
        ref={inputRef}
        type="file"
        className="input"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <input
        type="text"
        className="input"
        placeholder={t("admin.upload.rename")}
        value={rename}
        onChange={(e) => setRename(e.target.value)}
      />
      {progress >= 0 && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <span className="progress-text">{t("admin.upload.uploading")} {progress}%</span>
        </div>
      )}
      {message && (
        <div className={`notice ${message.ok ? "notice-ok" : "notice-error"}`}>{message.text}</div>
      )}
      <button className="btn btn-primary" disabled={!file || progress >= 0} onClick={upload}>
        {t("admin.upload.submit")}
      </button>
    </div>
  );
}

function FilesPanel({ locale, t }: { locale: Locale; t: (k: string) => string }) {
  const [files, setFiles] = useState<OssFile[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/files");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setFiles(data.files);
    } catch {
      setError(t("admin.loadFail"));
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  async function remove(key: string) {
    if (!window.confirm(t("admin.files.confirm"))) return;
    try {
      const res = await fetch("/api/admin/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error(String(res.status));
      load();
    } catch {
      setError(t("admin.loadFail"));
    }
  }

  return (
    <div className="panel">
      <div className="panel-actions">
        <button className="btn btn-tonal btn-sm" onClick={load}>{t("admin.files.refresh")}</button>
      </div>
      {error && <div className="notice notice-error">{error}</div>}
      {files && files.length === 0 && <div className="notice">{t("admin.files.empty")}</div>}
      {files && files.length > 0 && (
        <div className="table-wrap">
          <table className="file-table">
            <thead>
              <tr>
                <th>{t("download.name")}</th>
                <th>{t("download.size")}</th>
                <th>{t("download.date")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.key}>
                  <td className="file-name">{f.name}</td>
                  <td>{formatSize(f.size)}</td>
                  <td>{formatDate(f.lastModified, locale)}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(f.key)}>
                      {t("admin.files.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LogsPanel({ locale, t }: { locale: Locale; t: (k: string) => string }) {
  const [logs, setLogs] = useState<{ total: number; entries: LogEntry[] } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/logs?limit=200");
      if (!res.ok) throw new Error(String(res.status));
      setLogs(await res.json());
    } catch {
      setError(t("admin.loadFail"));
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="panel">
      <div className="panel-actions">
        <button className="btn btn-tonal btn-sm" onClick={load}>{t("admin.files.refresh")}</button>
        {logs && (
          <span className="panel-hint">
            {t("admin.logs.total").replace("{n}", String(logs.total)).replace("{m}", String(logs.entries.length))}
          </span>
        )}
      </div>
      {error && <div className="notice notice-error">{error}</div>}
      {logs && logs.entries.length === 0 && <div className="notice">{t("admin.logs.empty")}</div>}
      {logs && logs.entries.length > 0 && (
        <div className="table-wrap">
          <table className="file-table log-table">
            <thead>
              <tr>
                <th>{t("admin.logs.time")}</th>
                <th>{t("admin.logs.ip")}</th>
                <th>{t("admin.logs.file")}</th>
                <th>{t("admin.logs.ua")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.entries.map((e, i) => (
                <tr key={i}>
                  <td className="nowrap">{formatDate(e.time, locale)}</td>
                  <td className="nowrap">{e.ip}</td>
                  <td className="file-name">{e.key}</td>
                  <td className="ua-cell" title={e.userAgent}>{e.userAgent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
