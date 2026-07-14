import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/auth";
import { env } from "@/lib/env";
import { feedbackEnabled, sendFeedbackMail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// 提交限流:每 IP 每小时 FEEDBACK_RATE_LIMIT_PER_HOUR 次(进程内滑动窗口)
const hits = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;

const MESSAGE_MIN = 5;
const MESSAGE_MAX = 5000;
const NAME_MAX = 100;
const EMAIL_MAX = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (!feedbackEnabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 503 });
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= env.feedbackRateLimitPerHour) {
    return NextResponse.json({ error: "too many" }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(body.name).slice(0, NAME_MAX);
  const email = str(body.email).slice(0, EMAIL_MAX);
  const message = str(body.message);
  const locale = str(body.locale) === "en" ? "en" : "zh";
  // 蜜罐字段:正常用户看不到也不会填;机器人填了就假装成功,不发信
  const honeypot = str(body.website);

  if (honeypot) {
    return NextResponse.json({ ok: true });
  }
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return NextResponse.json({ error: "message length" }, { status: 400 });
  }
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "bad email" }, { status: 400 });
  }

  recent.push(now);
  hits.set(ip, recent);

  try {
    await sendFeedbackMail({
      name,
      email,
      message,
      locale,
      ip,
      userAgent: req.headers.get("user-agent") ?? "",
    });
  } catch (e) {
    console.error("feedback mail failed:", e);
    return NextResponse.json({ error: "send failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
