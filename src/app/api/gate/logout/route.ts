import { NextResponse } from "next/server";
import { gateClearCookieHeader } from "@/lib/site-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", gateClearCookieHeader());
  return res;
}
