import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { sanitizeFileName, uploadFile } from "@/lib/oss";

export const dynamic = "force-dynamic";
// 大文件走内存中转,限制单文件 2GB 由反向代理(client_max_body_size)控制

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  const rename = form.get("name");
  const name = sanitizeFileName(typeof rename === "string" && rename.trim() ? rename : file.name);
  if (!name) {
    return NextResponse.json({ error: "invalid file name" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = await uploadFile(name, buffer);
    return NextResponse.json({ ok: true, key, size: buffer.length });
  } catch (e) {
    console.error("upload failed:", e);
    return NextResponse.json({ error: "upload failed" }, { status: 502 });
  }
}
