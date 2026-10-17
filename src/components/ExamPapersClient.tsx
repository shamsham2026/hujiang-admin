"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  DRIVE_CURSOR_FOLDER_URL,
  EARLY_OWING_TASK,
  PAPER_STEPS,
  PERIOD_REMINDERS,
  SEPT_FOLDER_TASK,
  type ExamPeriod,
  type ExamStore,
  type PaperStepKey,
  type ReminderTaskKey,
} from "@/lib/types";

type Props = {
  initialStore: ExamStore;
  persistence: string;
  sourceLabel: string;
};

async function postAction(body: Record<string, unknown>) {
  const res = await fetch("/api/exam-papers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    store?: ExamStore;
    persistence?: string;
    source?: { label?: string };
    error?: string;
  };
  if (!res.ok) throw new Error(json.error ?? "更新失敗");
  return json;
}

function statusLabel(s: ExamPeriod["papers"][0]["status"]) {
  if (s === "done") return "完成";
  if (s === "in_progress") return "進行中";
  return "未開始";
}

export function ExamPapersClient({
  initialStore,
  persistence,
  sourceLabel: initialSourceLabel,
}: Props) {
  const [store, setStore] = useState(initialStore);
  const [mode, setMode] = useState(persistence);
  const [sourceLabel, setSourceLabel] = useState(
    initialStore.sourceLabel ?? initialSourceLabel,
  );
  const [periodId, setPeriodId] = useState(
    initialStore.periods.find((p) => p.status === "active")?.periodId ??
      initialStore.periods[0]?.periodId ??
      "",
  );
  const [gradeFilter, setGradeFilter] = useState<string>("全部");
  const [showCompleted, setShowCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const period = useMemo(
    () => store.periods.find((p) => p.periodId === periodId),
    [store, periodId],
  );

  const grades = useMemo(() => {
    if (!period) return [] as string[];
    return Array.from(new Set(period.papers.map((p) => p.grade)));
  }, [period]);

  const visiblePapers = useMemo(() => {
    if (!period) return [];
    let list = period.papers;
    if (gradeFilter !== "全部") {
      list = list.filter((p) => p.grade === gradeFilter);
    }
    if (!showCompleted) {
      list = list.filter((p) => p.status !== "done");
    }
    return list;
  }, [period, gradeFilter, showCompleted]);

  /** Chronological period notifications: early-owing → 9 → 10 → 7 → 8 */
  const chronoReminders = useMemo(() => {
    if (!period) return [];
    const items: {
      key: ReminderTaskKey;
      label: string;
      detail: string;
    }[] = [];
    if (period.isEarlyExam) {
      items.push({
        key: EARLY_OWING_TASK.key,
        label: EARLY_OWING_TASK.label,
        detail: EARLY_OWING_TASK.detail,
      });
    }
    for (const r of PERIOD_REMINDERS) {
      items.push({ key: r.key, label: `${r.key}. ${r.label}`, detail: r.detail });
    }
    return items.filter((item) => {
      const task = period.reminders.find((t) => t.taskKey === item.key);
      if (showCompleted) return true;
      return !task?.done;
    });
  }, [period, showCompleted]);

  const apply = useCallback(
    (json: {
      store?: ExamStore;
      persistence?: string;
      source?: { label?: string };
    }) => {
      if (json.store) {
        setStore(json.store);
        if (json.store.sourceLabel) setSourceLabel(json.store.sourceLabel);
      }
      if (json.persistence) setMode(json.persistence);
      if (json.source?.label) setSourceLabel(json.source.label);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/exam-papers", { cache: "no-store" });
        const json = (await res.json()) as {
          store: ExamStore;
          persistence: string;
          source?: { label?: string };
        };
        if (!cancelled) apply(json);
      } catch {
        /* keep SSR */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  function run(body: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        const json = await postAction(body);
        apply(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "更新失敗");
      }
    });
  }

  function toggleStep(paperId: string, stepKey: PaperStepKey, ticked: boolean) {
    run({
      action: "toggleStep",
      periodId,
      paperId,
      stepKey,
      ticked,
      by: store.operatorName,
    });
  }

  function toggleReminder(
    taskKey: ReminderTaskKey,
    done: boolean,
    forPeriod: boolean,
  ) {
    run({
      action: "toggleReminder",
      periodId: forPeriod ? periodId : undefined,
      taskKey,
      done,
      by: store.operatorName,
    });
  }

  const paperCount = store.periods.reduce((n, p) => n + p.papers.length, 0);
  const showSept =
    showCompleted || !store.septFolder.done;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--brand-ink)]">
            試卷處理
          </h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            步驟一至六按序剔選；完成即隱藏。剔選存於{" "}
            {mode === "blob" ? "Vercel Blob（跨裝置共用）" : "本機 JSON"}。
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--brand-ink)]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--brand-accent)]"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            顯示已完成
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--brand-muted)]">操作者顯示名稱</span>
            <input
              className="field"
              value={store.operatorName}
              onChange={(e) =>
                setStore((s) => ({ ...s, operatorName: e.target.value }))
              }
              onBlur={(e) =>
                run({ action: "setOperator", operatorName: e.target.value })
              }
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--brand-line)] bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--brand-ink)]">
        <p className="font-semibold">試卷來源（非網頁新增）</p>
        <p className="mt-1 text-[var(--brand-muted)]">
          {sourceLabel} · 共 {paperCount} 份卷 · {store.periods.length} 個考試期
        </p>
        <p className="mt-1 text-xs text-[var(--brand-muted)]">
          正式來源：Google Drive{" "}
          <a
            className="underline decoration-[var(--brand-accent)]"
            href={DRIVE_CURSOR_FOLDER_URL}
            target="_blank"
            rel="noreferrer"
          >
            Cursor
          </a>
          。勿在此頁打字新增。
        </p>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {showSept ? (
        <section className="section-block">
          <h2 className="section-title">學年任務 · 步驟 11（最早）</h2>
          <ReminderRow
            label={`11. ${SEPT_FOLDER_TASK.label}`}
            detail={SEPT_FOLDER_TASK.detail}
            done={store.septFolder.done}
            meta={store.septFolder}
            disabled={pending}
            onToggle={(done) => toggleReminder("11", done, false)}
          />
        </section>
      ) : null}

      <section className="section-block space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="section-title mb-0">考試期</h2>
          <select
            className="field"
            value={periodId}
            onChange={(e) => {
              setPeriodId(e.target.value);
              setGradeFilter("全部");
            }}
          >
            {store.periods.map((p) => (
              <option key={p.periodId} value={p.periodId}>
                {p.name}
                {p.isEarlyExam ? "（提前試）" : ""} · {p.startDate}–{p.endDate}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[var(--brand-muted)]">年級</span>
            <select
              className="field"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="全部">全部</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          {pending ? (
            <span className="text-xs text-[var(--brand-muted)]">儲存中…</span>
          ) : null}
        </div>

        {period ? (
          <>
            <div className="rounded-lg bg-white px-3 py-2 text-sm text-[var(--brand-ink)] ring-1 ring-[var(--brand-line)]">
              步驟 1→6 按序；提醒按時序（前一週→週五→考試日）。已剔預設隱藏。
            </div>

            <div>
              <h3 className="mb-2 text-base font-semibold">
                每份試卷（步驟 1–6）· 顯示 {visiblePapers.length} 份
                {!showCompleted ? "（已完成預設隱藏）" : `／共 ${period.papers.length}`}
              </h3>
              <div className="space-y-4">
                {visiblePapers.length === 0 ? (
                  <p className="text-sm text-[var(--brand-muted)]">
                    呢個篩選下無待辦試卷
                    {!showCompleted ? "（或已全部完成——可開「顯示已完成」）" : ""}。
                  </p>
                ) : null}
                {visiblePapers.map((paper) => {
                  const steps = PAPER_STEPS.filter((step) => {
                    const tick = paper.steps[step.key];
                    return showCompleted || !tick.ticked;
                  });
                  return (
                    <article
                      key={paper.paperId}
                      className="rounded-xl border border-[var(--brand-line)] bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-[var(--brand-ink)]">
                            {paper.label}
                          </h4>
                          <p className="text-xs text-[var(--brand-muted)]">
                            {paper.grade} · {paper.subject} · {paper.paperId}
                          </p>
                        </div>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs ${
                            paper.status === "done"
                              ? "bg-emerald-100 text-emerald-800"
                              : paper.status === "in_progress"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {statusLabel(paper.status)}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {steps.map((step) => {
                          const tick = paper.steps[step.key];
                          return (
                            <li key={step.key}>
                              <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-[var(--brand-soft)]">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 accent-[var(--brand-accent)]"
                                  checked={tick.ticked}
                                  disabled={pending}
                                  onChange={(e) =>
                                    toggleStep(
                                      paper.paperId,
                                      step.key,
                                      e.target.checked,
                                    )
                                  }
                                />
                                <span className="flex-1 text-sm">
                                  <span className="font-medium">
                                    {step.key}. {step.label}
                                  </span>
                                  {tick.ticked && tick.tickedBy ? (
                                    <span className="mt-0.5 block text-xs text-[var(--brand-muted)]">
                                      {tick.tickedBy}
                                      {tick.tickedAt
                                        ? ` · ${new Date(tick.tickedAt).toLocaleString("zh-HK")}`
                                        : ""}
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-base font-semibold">
                考試週提示（時序：前一週 → 週五 → 考試日）
              </h3>
              <div className="space-y-2">
                {chronoReminders.length === 0 ? (
                  <p className="text-sm text-[var(--brand-muted)]">
                    呢期提醒已全部完成
                    {!showCompleted ? "（可開「顯示已完成」）" : ""}。
                  </p>
                ) : null}
                {chronoReminders.map((r) => {
                  const task = period.reminders.find((t) => t.taskKey === r.key);
                  return (
                    <ReminderRow
                      key={r.key}
                      label={r.label}
                      detail={r.detail}
                      done={Boolean(task?.done)}
                      meta={task}
                      disabled={pending}
                      onToggle={(done) => toggleReminder(r.key, done, true)}
                    />
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--brand-muted)]">
            來源檔未有考試期。請編輯試卷清單。
          </p>
        )}
      </section>

      <p className="text-xs text-[var(--brand-muted)]">
        最後更新：
        {store.updatedAt
          ? new Date(store.updatedAt).toLocaleString("zh-HK")
          : "—"}
      </p>
    </div>
  );
}

function ReminderRow({
  label,
  detail,
  done,
  meta,
  disabled,
  onToggle,
}: {
  label: string;
  detail: string;
  done: boolean;
  meta?: { doneBy: string | null; doneAt: string | null } | null;
  disabled?: boolean;
  onToggle: (done: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--brand-line)] bg-white px-3 py-2.5 hover:bg-[var(--brand-soft)]">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[var(--brand-accent)]"
        checked={done}
        disabled={disabled}
        onChange={(e) => onToggle(e.target.checked)}
      />
      <span className="flex-1 text-sm">
        <span className="font-medium text-[var(--brand-ink)]">{label}</span>
        <span className="mt-0.5 block text-[var(--brand-muted)]">{detail}</span>
        {done && meta?.doneBy ? (
          <span className="mt-0.5 block text-xs text-[var(--brand-muted)]">
            {meta.doneBy}
            {meta.doneAt
              ? ` · ${new Date(meta.doneAt).toLocaleString("zh-HK")}`
              : ""}
          </span>
        ) : null}
      </span>
    </label>
  );
}
