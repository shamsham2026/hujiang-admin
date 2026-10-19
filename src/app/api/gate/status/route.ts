import { NextResponse } from "next/server";
import { isAuthorizedFromRequest } from "@/lib/site-gate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return NextResponse.json({ ok: isAuthorizedFromRequest(req) });
}
