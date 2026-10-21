import { NextResponse } from "next/server";
import { gateSetCookieHeader, gateTokenFor, tokenMatches } from "@/lib/site-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const token = await gateTokenFor(body?.password ?? "");
  if (!(await tokenMatches(token))) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", gateSetCookieHeader(token));
  return res;
}
