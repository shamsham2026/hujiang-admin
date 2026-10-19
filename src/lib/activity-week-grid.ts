import { parseDateOrWindow } from "./activity-week-conflicts";
import { ACTIVITY_WEEK_SEED } from "./activity-week-seed";
import type { ActivityEntry, ActivityPlacement } from "./activity-week-types";

export const GRADES = ["1", "2", "3", "4", "5", "6"] as const;
export const CLASS_LETTERS = ["A", "B", "C", "D"] as const;

export const CLASS_CODES: string[] = [
  ...GRADES.flatMap((grade) => CLASS_LETTERS.map((letter) => `${grade}${letter}`)),
  "其他",
];

export const TEACHING_PERIODS = [
  "班主任節",
  "第1節",
  "第2節",
  "第3節",
  "第4節",
  "第5節",
] as const;

export type GridRow =
  | {
      kind: "period";
      name: string;
      time: string;
      note?: string;
    }
  | {
      kind: "break";
      name: string;
      time: string;
    };

export const GRID_ROWS: GridRow[] = [
  { kind: "period", name: "班主任節", time: "8:10–8:35" },
  { kind: "period", name: "第1節", time: "8:35–9:15" },
  { kind: "break", name: "小息", time: "9:15–9:35" },
  { kind: "period", name: "第2節", time: "9:35–10:05" },
  { kind: "period", name: "第3節", time: "10:05–10:35" },
  { kind: "break", name: "小息", time: "10:35–10:55" },
  { kind: "period", name: "第4節", time: "10:55–11:25" },
  { kind: "period", name: "第5節", time: "11:25–12:00", note: "11:55準備放學" },
];

const WEEKDAY = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

const GRADE_CHAR: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

export type DayOption = {
  date: string;
  group: string;
  label: string;
};

function isoRange(start: string, end: string, weekdaysOnly: boolean): string[] {
  const out: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    const iso = cursor.toISOString().slice(0, 10);
    const day = cursor.getUTCDay();
    if (!weekdaysOnly || (day >= 1 && day <= 5)) out.push(iso);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${m}/${d} ${WEEKDAY[dt.getUTCDay()]}`;
}

/** Selectable activity days. 7/9 結業禮唔喺活動週窗口。 */
export function activityDays(): DayOption[] {
  const days: DayOption[] = [];
  const push = (date: string, group: string) => {
    if (days.some((d) => d.date === date)) return;
    days.push({ date, group, label: formatDayLabel(date) });
  };
  const sem1 = ACTIVITY_WEEK_SEED.windows.上學期活動週;
  for (const date of isoRange(sem1.start, sem1.end, false)) {
    push(date, "上學期活動週");
  }
  const sem2 = ACTIVITY_WEEK_SEED.windows.下學期活動週;
  for (const date of isoRange(sem2.start, sem2.end, true)) {
    push(date, "下學期活動週");
  }
  for (const date of ACTIVITY_WEEK_SEED.windows.期考後時間表.dates) {
    push(date, "期考後時間表");
  }
  return days;
}

export function defaultDay(today = "2026-10-19"): string {
  const days = activityDays();
  return days.find((d) => d.date >= today)?.date ?? days[days.length - 1]?.date ?? today;
}

function gradeClasses(grade: number): string[] {
  if (grade < 1 || grade > 6) return [];
  return CLASS_LETTERS.map((letter) => `${grade}${letter}`);
}

export function audienceToClasses(audience: string): string[] {
  const s = audience.trim();
  if (!s || s === "—" || s === "-") return [];
  const range = s.match(/小([一二三四五六])至小([一二三四五六])/);
  if (range) {
    const a = GRADE_CHAR[range[1]];
    const b = GRADE_CHAR[range[2]];
    const from = Math.min(a, b);
    const to = Math.max(a, b);
    const classes: string[] = [];
    for (let g = from; g <= to; g++) classes.push(...gradeClasses(g));
    return classes;
  }
  const two = [...s.matchAll(/小([一二三四五六])/g)];
  if (two.length >= 2) {
    const classes: string[] = [];
    for (const hit of two) classes.push(...gradeClasses(GRADE_CHAR[hit[1]]));
    return [...new Set(classes)];
  }
  if (two.length === 1) return gradeClasses(GRADE_CHAR[two[0][1]]);
  return [];
}

export function expandPeriods(periods: string[]): string[] {
  const out: string[] = [];
  const add = (name: string) => {
    if (!out.includes(name)) out.push(name);
  };
  for (const raw of periods) {
    const p = raw.trim();
    if (!p) continue;
    if (p.includes("全日")) {
      TEACHING_PERIODS.forEach(add);
      continue;
    }
    if (p.includes("頭三")) {
      add("第1節");
      add("第2節");
      add("第3節");
      continue;
    }
    if (p.includes("一節") && p.includes("班")) continue;
    if ((TEACHING_PERIODS as readonly string[]).includes(p)) add(p);
  }
  return out;
}

/** Shared venues collide across classes. 課室／空白＝該班課室，唔跨班。 */
export function venueKey(venue: string): string | null {
  const v = venue.trim();
  if (!v || v.includes("課室")) return null;
  if (v.includes("禮堂") || /^\s*H\b/i.test(v)) return "H";
  if (v.includes("有蓋") || /^\s*C\b/i.test(v)) return "C";
  if (v.includes("籃球") || /^\s*B\b/i.test(v)) return "B";
  if (v.includes("飲食") || /^\s*E\b/i.test(v)) return "E";
  if (v.includes("106")) return "106";
  return v;
}

export function venueCode(venue: string): string {
  return venueKey(venue) ?? "課";
}

export type CellView = {
  placementId: string;
  entryId: string;
  title: string;
  venueCode: string;
  conflict: boolean;
};

export function cellKey(classCode: string, period: string): string {
  return `${classCode}|${period}`;
}

export function cellsForDay(
  date: string,
  entries: ActivityEntry[],
  placements: ActivityPlacement[],
): Map<string, CellView[]> {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const grouped = new Map<string, CellView[]>();
  const venueEntries = new Map<string, Set<string>>();

  for (const placement of placements) {
    if (placement.date !== date) continue;
    const entry = byId.get(placement.entryId);
    if (!entry) continue;
    const key = cellKey(placement.classCode, placement.period);
    const view: CellView = {
      placementId: placement.id,
      entryId: entry.id,
      title: entry.title,
      venueCode: venueCode(entry.venue),
      conflict: false,
    };
    const list = grouped.get(key) ?? [];
    list.push(view);
    grouped.set(key, list);
    const shared = venueKey(entry.venue);
    if (shared) {
      const bucket = `${placement.period}|${shared}`;
      const ids = venueEntries.get(bucket) ?? new Set<string>();
      ids.add(entry.id);
      venueEntries.set(bucket, ids);
    }
  }

  for (const list of grouped.values()) {
    if (list.length > 1) list.forEach((item) => (item.conflict = true));
  }
  for (const [bucket, entryIds] of venueEntries) {
    if (entryIds.size < 2) continue;
    const period = bucket.slice(0, bucket.indexOf("|"));
    for (const [key, list] of grouped) {
      if (!key.endsWith(`|${period}`)) continue;
      for (const item of list) {
        if (entryIds.has(item.entryId)) item.conflict = true;
      }
    }
  }
  return grouped;
}

export function suggestPlacements(
  entry: Pick<ActivityEntry, "id" | "audience" | "periods" | "venue">,
): { classCode: string; period: string }[] {
  const periods = expandPeriods(entry.periods);
  if (!periods.length) return [];
  let classes = audienceToClasses(entry.audience);
  if (!classes.length) classes = ["其他"];
  return classes.flatMap((classCode) =>
    periods.map((period) => ({ classCode, period })),
  );
}

function placementId(entryId: string, date: string, classCode: string, period: string) {
  return `seedplc:${entryId}:${date}:${classCode}:${period}`;
}

/** Known bookings with a definite class set and period. Unknown slots stay unplaced. */
export function defaultPlacements(now = "2026-01-01T00:00:00.000Z"): ActivityPlacement[] {
  const out: ActivityPlacement[] = [];
  for (const seed of ACTIVITY_WEEK_SEED.seed) {
    const dates = parseDateOrWindow(seed.dateOrWindow);
    const periods = expandPeriods(seed.periods);
    if (!periods.length) continue;
    const classes = audienceToClasses(seed.audience);
    const targets = classes.length ? classes : seed.periods.some((p) => p.includes("全日") || p.includes("頭三") || p.startsWith("第")) ? ["其他"] : [];
    if (!targets.length) continue;
    for (const date of dates) {
      for (const classCode of targets) {
        for (const period of periods) {
          out.push({
            id: placementId(seed.id, date, classCode, period),
            entryId: seed.id,
            date,
            classCode,
            period,
            updatedAt: now,
          });
        }
      }
    }
  }
  return out;
}

export function isClassCode(value: string): boolean {
  return CLASS_CODES.includes(value);
}

export function isTeachingPeriod(value: string): boolean {
  return (TEACHING_PERIODS as readonly string[]).includes(value);
}
