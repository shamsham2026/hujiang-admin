import { NextResponse } from "next/server";
import { timetableRows } from "@/lib/activity-week-grid";
import { isAuthorizedFromRequest } from "@/lib/site-gate";
import {
  deleteSubmission,
  getActivityState,
  placeEntry,
  placeMany,
  restoreBuiltin,
  reviseBuiltin,
  toConflictItem,
  unplace,
  updateSubmission,
  type EditablePatch,
} from "@/lib/activity-week-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicBody(
  entries: Awaited<ReturnType<typeof getActivityState>>["entries"],
  placements: Awaited<ReturnType<typeof getActivityState>>["store"]["placements"],
) {
  return {
    seed: entries.filter((e) => e.builtin).map(toConflictItem),
    submissions: entries.filter((e) => !e.builtin).map(toConflictItem),
    timetable: timetableRows(entries, placements),
  };
}

export async function GET(req: Request) {
  const { store, entries, persistence } = await getActivityState();
  const body = publicBody(entries, store.placements);
  if (!isAuthorizedFromRequest(req)) {
    return NextResponse.json(body);
  }
  return NextResponse.json({
    ...body,
    entries,
    placements: store.placements,
    updatedAt: store.updatedAt,
    persistence,
  });
}

export async function DELETE(req: Request) {
  if (!isAuthorizedFromRequest(req)) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  try {
    const entries = await deleteSubmission(id);
    const { store, persistence } = await getActivityState();
    return NextResponse.json({
      ...publicBody(entries, store.placements),
      entries,
      placements: store.placements,
      updatedAt: store.updatedAt,
      persistence,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "刪除失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorizedFromRequest(req)) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | (EditablePatch & {
        action?: string;
        id?: string;
        entryId?: string;
        date?: string;
        classCode?: string;
        period?: string;
        cells?: { classCode: string; period: string }[];
      })
    | null;
  if (!body?.action) {
    return NextResponse.json({ error: "缺少操作" }, { status: 400 });
  }
  try {
    if (body.action === "revise") {
      if (!body.id) throw new Error("缺少 id");
      await reviseBuiltin(body.id, body);
    } else if (body.action === "restore") {
      if (!body.id) throw new Error("缺少 id");
      await restoreBuiltin(body.id);
    } else if (body.action === "updateSubmission") {
      if (!body.id) throw new Error("缺少 id");
      await updateSubmission(body.id, body);
    } else if (body.action === "place") {
      if (!body.entryId || !body.date || !body.classCode || !body.period) {
        throw new Error("排入資料不足");
      }
      await placeEntry(body.entryId, body.date, body.classCode, body.period);
    } else if (body.action === "placeMany") {
      if (!body.entryId || !body.date || !Array.isArray(body.cells)) {
        throw new Error("排入資料不足");
      }
      await placeMany(body.entryId, body.date, body.cells);
    } else if (body.action === "unplace") {
      if (!body.id) throw new Error("缺少 id");
      await unplace(body.id);
    } else {
      throw new Error("未知操作");
    }
    const { store, entries, persistence } = await getActivityState();
    return NextResponse.json({
      ...publicBody(entries, store.placements),
      entries,
      placements: store.placements,
      updatedAt: store.updatedAt,
      persistence,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "儲存失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
