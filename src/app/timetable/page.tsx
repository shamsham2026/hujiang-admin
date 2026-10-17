import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { TimetableClient } from "@/components/TimetableClient";
import { fetchBoard, todayIso, weekdayLabel } from "@/lib/board";
import { buildDayBoard } from "@/lib/day-board";

export const dynamic = "force-dynamic";

type Search = {
  date?: string;
  class?: string;
  teacher?: string;
  period?: string;
  refresh?: string;
};

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const date = sp.date || todayIso();
  const filters = {
    className: sp.class ?? "",
    teacher: sp.teacher ?? "",
    period: sp.period ?? "",
  };
  const refresh = sp.refresh === "1";

  let board = null as ReturnType<typeof buildDayBoard> | null;
  let fetchedAt: string | null = null;
  let source: string | null = null;
  let error: string | null = null;

  try {
    const payload = await fetchBoard(refresh);
    fetchedAt = payload.fetchedAt;
    source = payload.source;
    board = buildDayBoard(
      payload.data.lessons ?? [],
      payload.data.swaps ?? [],
      date,
      filters,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "讀取 board 失敗";
  }

  return (
    <AppShell current="/timetable">
      <Suspense
        fallback={<p className="text-sm text-[var(--brand-muted)]">載入中…</p>}
      >
        <TimetableClient
          date={date}
          dayLabel={weekdayLabel(date)}
          board={board}
          fetchedAt={fetchedAt}
          source={source}
          error={error}
          filters={filters}
        />
      </Suspense>
    </AppShell>
  );
}
