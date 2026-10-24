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

/** Registration page only: 16-12-2026 週三. */
export function formatRegistrationDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${d}-${m}-${y} ${WEEKDAY[dt.getUTCDay()]}`;
}

/** Show a stored ISO or compact window as 日-月-年. Other text is unchanged. */
export function formatShownDate(raw: string): string {
  const text = raw.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${Number(iso[3])}-${Number(iso[2])}-${iso[1]}`;
  const compact = text.match(/^(\d{4})-(\d{2})-(\d{2})\/(\d{1,2})$/);
  if (compact) {
    const year = compact[1];
    const month = Number(compact[2]);
    return `${Number(compact[3])}-${month}-${year}至${Number(compact[4])}-${month}-${year}`;
  }
  const range = text.match(/^(\d{4})-(\d{2})-(\d{2})\s*[\/–—-]\s*(\d{4})-(\d{2})-(\d{2})$/);
  if (range) {
    return `${Number(range[3])}-${Number(range[2])}-${range[1]}至${Number(range[6])}-${Number(range[5])}-${range[4]}`;
  }
  return raw;
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
  const junior = s.includes("初小");
  const senior = s.includes("高小");
  if (junior || senior) {
    const classes: string[] = [];
    if (junior) for (let grade = 1; grade <= 3; grade++) classes.push(...gradeClasses(grade));
    if (senior) for (let grade = 4; grade <= 6; grade++) classes.push(...gradeClasses(grade));
    return classes;
  }
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
    const definite = seed.periods.some(
      (period) => period.includes("全日") || period.includes("頭三") || period.startsWith("第"),
    );
    const hallClosed =
      seed.hold && venueKey(seed.venue) === "H" && seed.periods.some((period) => period.includes("全日"));
    const targets = classes.length ? classes : hallClosed ? CLASS_CODES : definite ? ["其他"] : [];
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

/**
 * Keep definite seed bookings on the grid, and drop the 1/5 煤氣第2節
 * probe that was written while the period was still unset.
 * Bookings the user already placed for an entry are left in place.
 */
export function alignStoredPlacements(
  placements: ActivityPlacement[],
  revisions: Record<string, { periods?: string[] } | undefined>,
): { placements: ActivityPlacement[]; changed: boolean } {
  let changed = false;
  const gas = ACTIVITY_WEEK_SEED.seed.find((item) => item.id === "sem1-p5-gas");
  const gasPeriods = revisions["sem1-p5-gas"]?.periods ?? gas?.periods ?? [];
  const gasOpen = expandPeriods(gasPeriods);
  const next = placements.filter((placement) => {
    const probe =
      placement.entryId === "sem1-p5-gas" &&
      placement.date === "2026-01-05" &&
      placement.period === "第2節" &&
      ["5A", "5B", "5C", "5D"].includes(placement.classCode);
    if (!probe || gasOpen.includes("第2節")) return true;
    changed = true;
    return false;
  });
  const defaults = defaultPlacements();
  for (const seed of ACTIVITY_WEEK_SEED.seed) {
    const additions = defaults.filter((placement) => placement.entryId === seed.id);
    if (!additions.length) continue;
    const existing = next.filter((placement) => placement.entryId === seed.id);
    if (!existing.length) {
      next.push(...additions);
      changed = true;
      continue;
    }
    const hallWide = additions.some((placement) => placement.classCode !== "其他");
    if (!hallWide || !existing.every((placement) => placement.classCode === "其他")) continue;
    const have = new Set(existing.map((placement) => `${placement.date}|${placement.classCode}|${placement.period}`));
    for (const addition of additions) {
      const key = `${addition.date}|${addition.classCode}|${addition.period}`;
      if (have.has(key)) continue;
      next.push(addition);
      changed = true;
    }
  }
  return { placements: next, changed };
}

export type TimetableCell = { title: string; venue: string };

export type TimetableRow = {
  date: string;
  label: string;
  group: string;
  cells: Record<string, TimetableCell[]>;
};

/** One row per activity day. Same activity on many classes is listed once. */
export function timetableRows(
  entries: Pick<ActivityEntry, "id" | "title" | "venue">[],
  placements: Pick<ActivityPlacement, "entryId" | "date" | "period">[],
): TimetableRow[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return activityDays().map((day) => {
    const cells: Record<string, TimetableCell[]> = {};
    for (const period of TEACHING_PERIODS) {
      const seen = new Set<string>();
      const list: TimetableCell[] = [];
      for (const placement of placements) {
        if (placement.date !== day.date || placement.period !== period) continue;
        const entry = byId.get(placement.entryId);
        if (!entry || seen.has(entry.id)) continue;
        seen.add(entry.id);
        list.push({ title: entry.title, venue: venueCode(entry.venue) });
      }
      cells[period] = list;
    }
    return { date: day.date, label: day.label, group: day.group, cells };
  });
}

/** Blank registration grid only: 期考後 December, then 上學期 January, then 下學期 June–July. */
const REGISTRATION_BLANK_GROUPS = ["期考後時間表", "上學期活動週", "下學期活動週"] as const;

export function registrationBlankRows(): TimetableRow[] {
  const rank = new Map<string, number>(
    REGISTRATION_BLANK_GROUPS.map((group, index) => [group, index]),
  );
  return timetableRows([], [])
    .map((row) => ({ ...row, label: formatRegistrationDate(row.date) }))
    .sort((a, b) => {
      const fallback = REGISTRATION_BLANK_GROUPS.length;
      return (rank.get(a.group) ?? fallback) - (rank.get(b.group) ?? fallback);
    });
}

export type RegistrationCalendarDay = {
  date: string;
  label: string;
};

/** One month window. Weeks start 週日. Null cells are days outside the schedulable windows. */
export type RegistrationCalendarMonth = {
  group: string;
  year: number;
  month: number;
  weeks: (RegistrationCalendarDay | null)[][];
};

/** Calendar heading. December and January share one first-term title. */
export function registrationCalendarTitle(group: string): string {
  if (group === "下學期活動週") return "下學期期考後活動週";
  return "上學期期考後活動週";
}

/** Public calendar year. December stays 2026; January, June, and July are 2027. */
function registrationDisplayIso(iso: string): string {
  const match = iso.match(/^2026-(01|06|07)-(\d{2})$/);
  if (!match) return iso;
  return `2027-${match[1]}-${match[2]}`;
}

/**
 * Second-term days on the public calendar. The seed window is weekdays in 2026;
 * the form shows that same window in 2027, so Saturday and Sunday are dropped
 * again on the displayed dates. 7/9 stays outside the window.
 */
function secondTermRegistrationDates(): string[] {
  const window = ACTIVITY_WEEK_SEED.windows.下學期活動週;
  return isoRange(registrationDisplayIso(window.start), registrationDisplayIso(window.end), true);
}

/** Schedulable registration dates only, December post-exam months first. */
export function registrationCalendars(): RegistrationCalendarMonth[] {
  const months: RegistrationCalendarMonth[] = [];
  const weeks = new Map<string, (RegistrationCalendarDay | null)[]>();
  const rows = [
    ...registrationBlankRows()
      .filter((row) => row.group !== "下學期活動週")
      .map((row) => ({ date: registrationDisplayIso(row.date), group: row.group })),
    ...secondTermRegistrationDates().map((date) => ({ date, group: "下學期活動週" })),
  ];
  for (const row of rows) {
    const shown = row.date;
    const [year, month, day] = shown.split("-").map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const title = registrationCalendarTitle(row.group);
    let bucket = months.find(
      (item) => item.group === title && item.year === year && item.month === month,
    );
    if (!bucket) {
      bucket = { group: title, year, month, weeks: [] };
      months.push(bucket);
    }
    const key = `${row.group}|${year}-${month}|${day - weekday}`;
    let week = weeks.get(key);
    if (!week) {
      week = [null, null, null, null, null, null, null];
      weeks.set(key, week);
      bucket.weeks.push(week);
    }
    week[weekday] = { date: shown, label: formatRegistrationDate(shown) };
  }
  return months;
}

export function isClassCode(value: string): boolean {
  return CLASS_CODES.includes(value);
}

export function isTeachingPeriod(value: string): boolean {
  return (TEACHING_PERIODS as readonly string[]).includes(value);
}
