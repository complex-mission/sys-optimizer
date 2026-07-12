import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { readDownloadLogs } from "@/lib/downloadLog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "200", 10) || 200, 1), 1000);
  const { total, entries } = await readDownloadLogs(limit);
  return NextResponse.json({ total, entries });
}
