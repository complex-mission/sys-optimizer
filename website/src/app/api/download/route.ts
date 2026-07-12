import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/auth";
import { appendDownloadLog } from "@/lib/downloadLog";
import { env } from "@/lib/env";
import { isValidKey, signDownloadUrl } from "@/lib/oss";
import { checkDownloadLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/download?file=<对象key> — 限流 → 记日志 → 302 跳转到 STS 签名 URL
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("file") ?? "";
  if (!isValidKey(key)) {
    return NextResponse.json({ error: "invalid file" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rate = checkDownloadLimit(ip, env.downloadRateLimitPerHour);
  if (!rate.allowed) {
    return new NextResponse(
      "Too many downloads from your IP. Please try again later.\n下载过于频繁,请稍后再试。",
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
          "Content-Type": "text/plain; charset=utf-8",
        },
      },
    );
  }

  try {
    const url = await signDownloadUrl(key);
    await appendDownloadLog({
      time: new Date().toISOString(),
      ip,
      key,
      userAgent: req.headers.get("user-agent") ?? "",
      referer: req.headers.get("referer") ?? "",
      lang: req.headers.get("accept-language") ?? "",
    });
    return NextResponse.redirect(url, 302);
  } catch (e) {
    console.error("download failed:", e);
    return NextResponse.json({ error: "download unavailable" }, { status: 502 });
  }
}
