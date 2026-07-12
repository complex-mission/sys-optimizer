import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteFile, isValidKey, listFiles } from "@/lib/oss";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ files: await listFiles() });
  } catch (e) {
    console.error("admin list failed:", e);
    return NextResponse.json({ error: "list failed" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let key = "";
  try {
    const body = await req.json();
    key = typeof body?.key === "string" ? body.key : "";
  } catch {
    // fallthrough
  }
  if (!isValidKey(key)) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }
  try {
    await deleteFile(key);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete failed:", e);
    return NextResponse.json({ error: "delete failed" }, { status: 502 });
  }
}
