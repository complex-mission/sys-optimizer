import { NextRequest, NextResponse } from "next/server";

// 无语言前缀的路径按浏览器语言跳转到 /zh 或 /en
// (Next 16 起 middleware.ts 更名为 proxy.ts,逻辑不变)
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/zh") || pathname.startsWith("/en")) {
    return NextResponse.next();
  }
  const al = req.headers.get("accept-language") ?? "";
  const locale = al.split(",")[0]?.trim().toLowerCase().startsWith("zh") ? "zh" : "en";
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // 跳过 API、静态资源与带扩展名的文件
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
