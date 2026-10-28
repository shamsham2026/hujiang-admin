import { NextResponse } from "next/server";
import { addSubmission } from "@/lib/activity-week-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    dateOrWindow?: string;
    periods?: string[] | string;
    venue?: string;
    audience?: string;
    owner?: string;
    subjectTeachers?: string;
    hold?: boolean;
    notes?: string;
    submitterName?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "提交失敗" }, { status: 400 });
  try {
    const submission = await addSubmission(body);
    return NextResponse.json({ ok: true, submission });
  } catch (err) {
    const message = err instanceof Error ? err.message : "提交失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
