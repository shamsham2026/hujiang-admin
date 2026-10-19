import { NextResponse } from "next/server";
import { expectedPassword, gateSetCookieHeader } from "@/lib/site-gate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if ((body.password ?? "") !== expectedPassword()) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", gateSetCookieHeader());
  return res;
}
