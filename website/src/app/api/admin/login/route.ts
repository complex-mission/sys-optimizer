import { NextRequest, NextResponse } from "next/server";
import { issueSessionToken, SESSION_COOKIE, verifyPassword, getClientIp } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 登录爆破防护:每 IP 每 10 分钟最多 10 次失败
const fails = new Map<string, number[]>();
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const FAIL_LIMIT = 10;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const now = Date.now();
  const recent = (fails.get(ip) ?? []).filter((t) => now - t < FAIL_WINDOW_MS);
  if (recent.length >= FAIL_LIMIT) {
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    // 空 body 按密码错误处理
  }

  if (!password || !verifyPassword(password)) {
    recent.push(now);
    fails.set(ip, recent);
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }

  fails.delete(ip);
  const { token, maxAge } = issueSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return res;
}
