/** Site password gate. The cookie is a hash of the password, not a fixed flag. */

export const GATE_COOKIE = "hj_admin_gate";

const TOKEN_PREFIX = "hj-admin-gate:v1:";

export function expectedPassword(): string {
  const fromEnv = (process.env.SITE_GATE_PASSWORD || "").trim();
  if (fromEnv) return fromEnv;
  // The repo fallback is public. On Vercel, a missing secret must fail closed.
  if (process.env.VERCEL) return "";
  return "saps2884";
}

export function parseCookieHeader(
  header: string | null,
  name: string,
): string | undefined {
  if (!header) return undefined;
  const parts = header.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeCookie(rest.join("="));
  }
  return undefined;
}

function decodeCookie(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i += 1) out |= aa[i]! ^ bb[i]!;
  return out === 0;
}

export async function gateTokenFor(password: string): Promise<string> {
  if (!password) return "";
  const data = new TextEncoder().encode(`${TOKEN_PREFIX}${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function tokenMatches(raw: string | undefined): Promise<boolean> {
  const expected = await gateTokenFor(expectedPassword());
  if (!expected || !raw) return false;
  return constantTimeEqual(raw, expected);
}

export async function isAuthorizedFromRequest(req: Request): Promise<boolean> {
  const raw = parseCookieHeader(req.headers.get("cookie"), GATE_COOKIE);
  return tokenMatches(raw);
}

export function gateSetCookieHeader(token: string, maxAgeSec = 60 * 60 * 12): string {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${GATE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

export function gateClearCookieHeader(): string {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${GATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
