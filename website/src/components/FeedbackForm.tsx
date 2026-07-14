"use client";

import { useState } from "react";
import { getDict, type Locale } from "@/i18n/dict";

type Status = "idle" | "sending" | "done" | "error";

export default function FeedbackForm({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // 蜜罐,正常用户不可见
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;

    if (message.trim().length < 5) {
      setStatus("error");
      setError(dict["feedback.tooShort"]);
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus("error");
      setError(dict["feedback.badEmail"]);
      return;
    }

    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, website, locale }),
      });
      if (res.ok) {
        setStatus("done");
        setName("");
        setEmail("");
        setMessage("");
        return;
      }
      setStatus("error");
      if (res.status === 429) setError(dict["feedback.tooMany"]);
      else if (res.status === 503) setError(dict["feedback.disabled"]);
      else setError(dict["feedback.fail"]);
    } catch {
      setStatus("error");
      setError(dict["feedback.fail"]);
    }
  };

  return (
    <form className="feedback-form" onSubmit={submit}>
      <div className="form-row">
        <label className="form-field">
          <span className="field-label">{dict["feedback.name"]}</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={dict["feedback.namePlaceholder"]}
            maxLength={100}
          />
        </label>
        <label className="form-field">
          <span className="field-label">{dict["feedback.email"]}</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={dict["feedback.emailPlaceholder"]}
            maxLength={200}
          />
        </label>
      </div>

      <label className="form-field">
        <span className="field-label">{dict["feedback.message"]}</span>
        <textarea
          className="input feedback-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={dict["feedback.messagePlaceholder"]}
          maxLength={5000}
          required
        />
      </label>

      {/* 蜜罐字段:通过 CSS 移出视口,机器人填了会被服务端静默丢弃 */}
      <input
        className="hp-field"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        name="website"
      />

      {status === "done" && <div className="notice notice-ok">{dict["feedback.done"]}</div>}
      {status === "error" && <div className="notice notice-error">{error}</div>}

      <div className="panel-actions">
        <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
          {status === "sending" ? dict["feedback.sending"] : dict["feedback.submit"]}
        </button>
      </div>
    </form>
  );
}
