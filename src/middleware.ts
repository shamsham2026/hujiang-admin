import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPublicPath, safeNextPath } from "@/lib/public-paths";
import { GATE_COOKIE, tokenMatches } from "@/lib/site-gate";

function isDocumentNavigation(req: NextRequest): boolean {
  if (req.headers.get("rsc") === "1") return false;
  if (req.headers.get("next-router-prefetch") === "1") return false;
  if (req.headers.get("next-router-segment-prefetch") === "1") return false;
  const dest = req.headers.get("sec-fetch-dest");
  if (dest && dest !== "document" && dest !== "empty") return false;
  return true;
}

function privateHeaders(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Vary", "Cookie");
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname, req.method)) return NextResponse.next();

  const ok = await tokenMatches(req.cookies.get(GATE_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/") || !isDocumentNavigation(req)) {
    return privateHeaders(NextResponse.json({ error: "未登入" }, { status: 401 }));
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", safeNextPath(`${pathname}${req.nextUrl.search}`));
  return privateHeaders(NextResponse.redirect(url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
