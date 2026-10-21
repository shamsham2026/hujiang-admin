/** Paths an anonymous visitor may open. Everything else needs the admin gate. */

const PUBLIC_FILES = new Set([
  "/favicon.ico",
  "/file.svg",
  "/globe.svg",
  "/next.svg",
  "/vercel.svg",
  "/window.svg",
]);

export function isPublicPath(pathname: string, method: string): boolean {
  const verb = method.toUpperCase();
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/brand/")) return true;
  if (PUBLIC_FILES.has(pathname)) return true;
  if (pathname === "/login" && (verb === "GET" || verb === "HEAD")) return true;
  if (pathname.startsWith("/aw-reg") && (verb === "GET" || verb === "HEAD")) return true;
  if (pathname === "/api/gate/login" && verb === "POST") return true;
  if (pathname === "/api/gate/logout" && verb === "POST") return true;
  if (pathname === "/api/gate/status" && verb === "GET") return true;
  if (pathname === "/api/activity-week/submit" && verb === "POST") return true;
  if (pathname === "/api/activity-week/subs" && verb === "GET") return true;
  return false;
}

/** Only same-site paths. Blocks protocol-relative and off-site redirects. */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return "/";
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.includes("://") || value.includes("\\") || value.includes("\0")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}
