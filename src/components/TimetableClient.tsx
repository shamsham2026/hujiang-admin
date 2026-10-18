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
        <h1 className="font-display text-3xl font-bold text-[var(--brand-ink)]">
          有效課表查詢
        </h1>
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
        <label className="text-base font-semibold">
          日期
          <input
            type="date"
            className="field mt-1 block text-base"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
          />
        </label>
        <label className="text-base font-semibold">
          班別
          <input
            className="field mt-1 block text-base"
            placeholder="如 3A"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
        </label>
        <label className="text-base font-semibold">
          教師
          <input
            className="field mt-1 block text-base"
            placeholder="簡稱或全名片段"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
          />
        </label>
        <label className="text-base font-semibold">
          節次
          <select
            className="field mt-1 block text-base"
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
        <button type="submit" className="btn-primary text-base" disabled={pending}>
          查詢
        </button>
        <button
          type="button"
          className="btn-secondary text-base"
          disabled={pending}
          onClick={() => apply(true)}
        >
          強制刷新
        </button>
      </form>

      {board ? (
        <DayBoard board={board} highlightTeacher={filters.teacher} />
      ) : !error ? null : null}
    </div>
  );
}
