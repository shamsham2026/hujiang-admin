import {
  BOARD_URL,
  type BoardLesson,
  type BoardPayload,
  type BoardSwap,
  type EffectiveRow,
} from "./types";

const DAY_MAP: Record<number, string> = {
  0: "日",
  1: "一",
  2: "二",
  3: "三",
  4: "四",
  5: "五",
  6: "六",
};

export function weekdayLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return DAY_MAP[d.getDay()] ?? "";
}

export async function fetchBoard(refresh = false): Promise<{
  data: BoardPayload;
  fetchedAt: string | null;
  source: string | null;
}> {
  const url = refresh ? `${BOARD_URL}?refresh=1` : BOARD_URL;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`無法讀取課表 board（${res.status}）`);
  }
  const json = (await res.json()) as {
    data?: BoardPayload;
    source?: string;
    fetchedAt?: string;
  };
  const data = json.data ?? (json as unknown as BoardPayload);
  return {
    data,
    fetchedAt: json.fetchedAt ?? null,
    source: json.source ?? data.source ?? null,
  };
}

function periodSortKey(period: string): number {
  const n = Number(period);
  if (!Number.isNaN(n)) return n;
  if (period.includes("小息")) return 50;
  if (period.includes("午")) return 60;
  return 100;
}

/** lessons ⊕ swaps for a date → effective rows (read-only). */
export function buildEffective(
  lessons: BoardLesson[],
  swaps: BoardSwap[],
  dateIso: string,
  opts?: {
    className?: string;
    teacher?: string;
    period?: string;
  },
): EffectiveRow[] {
  const day = weekdayLabel(dateIso);
  const dayLessons = lessons.filter(
    (l) => l.day === day && Boolean(l.className),
  );

  const daySwaps = swaps.filter((s) => s.date === dateIso);

  const swapIndex = new Map<string, BoardSwap>();
  for (const s of daySwaps) {
    const key = `${s.className}|${s.period}`;
    swapIndex.set(key, s);
  }

  const rows: EffectiveRow[] = dayLessons.map((l) => {
    const key = `${l.className}|${l.period}`;
    const swap = swapIndex.get(key);
    if (swap) {
      return {
        period: l.period,
        className: l.className,
        course: swap.newLesson || l.course,
        teacher: swap.newTeacher || l.teacher,
        origTeacher: swap.origTeacher || l.teacher,
        room: l.room ?? "",
        source: "swap" as const,
        swapType: swap.type,
      };
    }
    return {
      period: l.period,
      className: l.className,
      course: l.course,
      teacher: l.teacher,
      room: l.room ?? "",
      source: "base" as const,
    };
  });

  let filtered = rows;
  if (opts?.className) {
    const q = opts.className.trim().toUpperCase();
    filtered = filtered.filter((r) =>
      r.className.toUpperCase().includes(q),
    );
  }
  if (opts?.teacher) {
    const q = opts.teacher.trim();
    filtered = filtered.filter(
      (r) => r.teacher.includes(q) || (r.origTeacher ?? "").includes(q),
    );
  }
  if (opts?.period) {
    const q = opts.period.trim();
    filtered = filtered.filter((r) => r.period === q);
  }

  return filtered.sort((a, b) => {
    const pd = periodSortKey(a.period) - periodSortKey(b.period);
    if (pd !== 0) return pd;
    return a.className.localeCompare(b.className, "zh-Hant");
  });
}

export function uniquePeriods(lessons: BoardLesson[]): string[] {
  const set = new Set(lessons.map((l) => l.period).filter(Boolean));
  return Array.from(set).sort(
    (a, b) => periodSortKey(a) - periodSortKey(b),
  );
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
