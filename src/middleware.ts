import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GATE_COOKIE = "hj_admin_gate";

function isPublic(pathname: string, method: string): boolean {
  if (pathname.startsWith("/aw-reg")) return true;
  if (pathname.startsWith("/api/gate/")) return true;
  if (pathname === "/api/activity-week/submit") return true;
  if (pathname === "/api/activity-week/subs" && method === "GET") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/brand/")) return true;
  // Existing admin APIs (試卷等) stay reachable from their pages.
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/activity-week/")) {
    return true;
  }
  if (!pathname.startsWith("/api/")) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname, req.method)) return NextResponse.next();

  const ok = req.cookies.get(GATE_COOKIE)?.value === "1";
  if (!ok && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
