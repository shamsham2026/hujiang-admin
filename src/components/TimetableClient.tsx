"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { DayBoard } from "@/components/DayBoard";
import type { DayBoardModel } from "@/lib/day-board";
import { PERIODS } from "@/lib/cover-timetable";
import { COVER_BASE } from "@/lib/types";

type Props = {
  date: string;
  dayLabel: string;
  board: DayBoardModel | null;
  fetchedAt: string | null;
  source: string | null;
  error: string | null;
  filters: {
    className: string;
    teacher: string;
    period: string;
  };
};

export function TimetableClient({
  date,
  dayLabel,
  board,
  fetchedAt,
  source,
  error,
  filters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [className, setClassName] = useState(filters.className);
  const [teacher, setTeacher] = useState(filters.teacher);
  const [period, setPeriod] = useState(filters.period);
  const [dateValue, setDateValue] = useState(date);

  const lessonCount = useMemo(() => {
    if (!board) return 0;
    return board.rows.reduce((n, r) => {
      if (r.schoolDuty) return n + r.duties.length;
      return n + Object.values(r.cells).filter((c) => !c.empty).length;
    }, 0);
  }, [board]);

  const swapCount = useMemo(() => {
    if (!board) return 0;
    return board.rows.reduce(
      (n, r) => n + Object.values(r.cells).filter((c) => c.changed).length,
      0,
    );
  }, [board]);

  function apply(refresh = false) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", dateValue);
    if (className.trim()) params.set("class", className.trim());
    else params.delete("class");
    if (teacher.trim()) params.set("teacher", teacher.trim());
    else params.delete("teacher");
    if (period.trim()) params.set("period", period.trim());
    else params.delete("period");
    if (refresh) params.set("refresh", "1");
    else params.delete("refresh");
    startTransition(() => {
      router.push(`/timetable?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--brand-ink)]">
            有效課表查詢
          </h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            顯示層對齊 cover 首頁全校課表（day-board）；資料只讀訂閱 board（lessons
            ⊕ swaps）。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="btn-secondary"
            href={COVER_BASE}
            target="_blank"
            rel="noreferrer"
          >
            cover 首頁課表 ↗
          </a>
          <a
            className="btn-secondary"
            href={`${COVER_BASE}/lookup`}
            target="_blank"
            rel="noreferrer"
          >
            去安排 ↗
          </a>
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--brand-line)] bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          apply(false);
        }}
      >
        <label className="text-sm">
          <span className="text-[var(--brand-muted)]">日期</span>
          <input
            type="date"
            className="field mt-1"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--brand-muted)]">班別</span>
          <input
            className="field mt-1"
            placeholder="如 3A"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--brand-muted)]">教師</span>
          <input
            className="field mt-1"
            placeholder="簡稱或全名片段"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--brand-muted)]">節次</span>
          <select
            className="field mt-1"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="">全部</option>
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-primary" disabled={pending}>
          查詢
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => apply(true)}
        >
          強制刷新
        </button>
      </form>

      <div className="flex flex-wrap gap-3 text-sm text-[var(--brand-muted)]">
        <span>
          {dateValue}（星期{dayLabel || "—"}）
        </span>
        <span>· {lessonCount} 格／當值</span>
        <span>· 調動覆蓋 {swapCount} 節</span>
        {fetchedAt ? (
          <span>· board {new Date(fetchedAt).toLocaleString("zh-HK")}</span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {board ? (
        <DayBoard board={board} highlightTeacher={filters.teacher} />
      ) : !error ? (
        <p className="text-sm text-[var(--brand-muted)]">暫無課表資料。</p>
      ) : null}

      {source ? (
        <p className="text-xs text-[var(--brand-muted)]">來源：{source}</p>
      ) : null}
    </div>
  );
}
