import { NextResponse } from "next/server";
import {
  deleteSubmission,
  getActivityWeekView,
  persistenceMode,
  restoreAllRevisions,
  restoreRevision,
  saveRevision,
  type ActivityFields,
} from "@/lib/activity-week-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(e: unknown) {
  const message = e instanceof Error ? e.message : "更新失敗";
  const status = message.startsWith("找不到") || message.startsWith("請填") ? 400 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const view = await getActivityWeekView();
  return NextResponse.json(view);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  try {
    const view = await deleteSubmission(id);
    return NextResponse.json(view);
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as Partial<ActivityFields> & {
      id?: string;
      action?: string;
    };
    if (body.action === "restore-all") {
      const view = await restoreAllRevisions();
      return NextResponse.json({ ...view, persistence: persistenceMode() });
    }
    const id = body.id?.trim() ?? "";
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    const view =
      body.action === "restore"
        ? await restoreRevision(id)
        : await saveRevision(id, body);
    return NextResponse.json(view);
  } catch (e) {
    return fail(e);
  }
}
