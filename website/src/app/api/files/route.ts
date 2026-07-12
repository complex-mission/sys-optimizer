import { NextResponse } from "next/server";
import { listFiles, type OssFile } from "@/lib/oss";

export const dynamic = "force-dynamic";

// 公开的文件列表,进程内缓存 60s,避免每次访问都打 OSS
let cache: { at: number; files: OssFile[] } | null = null;

export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > 60_000) {
      cache = { at: Date.now(), files: await listFiles() };
    }
    return NextResponse.json({ files: cache.files });
  } catch (e) {
    console.error("list files failed:", e);
    return NextResponse.json({ error: "list unavailable" }, { status: 502 });
  }
}
