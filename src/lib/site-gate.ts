/** Site password gate — cookie independent per platform */
export const GATE_COOKIE = "hj_admin_gate";
export const GATE_COOKIE_VALUE = "1";

export function expectedPassword(): string {
  return (process.env.SITE_GATE_PASSWORD || "saps2884").trim();
}

export function parseCookieHeader(
  header: string | null,
  name: string,
): string | undefined {
  if (!header) return undefined;
  const parts = header.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

export function isAuthorizedFromRequest(req: Request): boolean {
  const raw = parseCookieHeader(req.headers.get("cookie"), GATE_COOKIE);
  return raw === GATE_COOKIE_VALUE;
}

export function gateSetCookieHeader(maxAgeSec = 60 * 60 * 12): string {
  return `${GATE_COOKIE}=${GATE_COOKIE_VALUE}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

export function gateClearCookieHeader(): string {
  return `${GATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
