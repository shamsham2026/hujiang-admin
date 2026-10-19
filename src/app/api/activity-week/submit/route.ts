import { NextResponse } from "next/server";
import { addSubmission } from "@/lib/activity-week-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: string;
      dateOrWindow?: string;
      periods?: string[];
      venue?: string;
      audience?: string;
      owner?: string;
      hold?: boolean;
      notes?: string;
      submitterName?: string;
      track?: string;
    };
    const view = await addSubmission({
      title: body.title ?? "",
      dateOrWindow: body.dateOrWindow ?? "",
      periods: Array.isArray(body.periods) ? body.periods : [],
      venue: body.venue ?? "",
      audience: body.audience ?? "",
      owner: body.owner ?? "",
      hold: Boolean(body.hold),
      notes: body.notes ?? "",
      track: body.track,
      submitterName: body.submitterName,
    });
    return NextResponse.json({ ok: true, ...view });
  } catch (e) {
    const message = e instanceof Error ? e.message : "提交失敗";
    const status = message.startsWith("請填") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
