import { NextResponse } from "next/server";
import { isAuthorizedFromRequest } from "@/lib/site-gate";
import {
  examSourceInfo,
  getExamStore,
  persistenceMode,
  setOperatorName,
  togglePaperStep,
  toggleReminder,
} from "@/lib/exam-store";
import type { PaperStepKey, ReminderTaskKey } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAuthorizedFromRequest(req))) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  const store = await getExamStore();
  return NextResponse.json({
    store,
    persistence: persistenceMode(),
    source: examSourceInfo(),
  });
}

export async function POST(req: Request) {
  if (!(await isAuthorizedFromRequest(req))) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      action: string;
      periodId?: string;
      paperId?: string;
      stepKey?: PaperStepKey;
      taskKey?: ReminderTaskKey;
      ticked?: boolean;
      done?: boolean;
      by?: string;
      operatorName?: string;
    };

    let store;
    switch (body.action) {
      case "setOperator":
        store = await setOperatorName(body.operatorName ?? "");
        break;
      case "toggleStep":
        if (!body.periodId || !body.paperId || !body.stepKey) {
          return NextResponse.json({ error: "參數不足" }, { status: 400 });
        }
        store = await togglePaperStep(
          body.periodId,
          body.paperId,
          body.stepKey,
          Boolean(body.ticked),
          body.by,
        );
        break;
      case "toggleReminder":
        if (!body.taskKey) {
          return NextResponse.json({ error: "參數不足" }, { status: 400 });
        }
        store = await toggleReminder(
          body.periodId ?? null,
          body.taskKey,
          Boolean(body.done),
          body.by,
        );
        break;
      case "addPaper":
        return NextResponse.json(
          {
            error:
              "已停用網頁新增。請改試卷清單來源檔（Store／Drive cursor）。",
          },
          { status: 400 },
        );
      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }

    return NextResponse.json({
      store,
      persistence: persistenceMode(),
      source: examSourceInfo(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "伺服器錯誤";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
