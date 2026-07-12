import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { env } from "./env";

export const SESSION_COOKIE = "admin_session";

// 会话签名密钥由管理密码派生,改密码即全员下线
function hmacKey(): Buffer {
  return crypto.createHash("sha256").update("sysoptimizer-admin:" + env.adminPassword).digest();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", hmacKey()).update(payload).digest("hex");
}

export function verifyPassword(input: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(env.adminPassword);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** 签发会话令牌:`过期毫秒时间戳.签名` */
export function issueSessionToken(): { token: string; maxAge: number } {
  const ttl = env.adminSessionTtlSeconds;
  const exp = Date.now() + ttl * 1000;
  return { token: `${exp}.${sign(String(exp))}`, maxAge: ttl };
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(exp);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(exp) > Date.now();
}

export function isAdmin(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
