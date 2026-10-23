import { ACTIVITY_WEEK_SEED } from "./activity-week-seed";
import type { ActivityEntry, ConflictItem } from "./activity-week-types";

function enumerateIso(start: string, end: string): string[] {
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return [];
  const from = a <= b ? a : b;
  const to = a <= b ? b : a;
  const out: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function dmyToIso(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * The public calendar shows January, June, and July 2027.
 * Seed bookings and the admin grid stay on the same month and day in 2026.
 */
function seedCalendarIso(iso: string): string {
  const match = iso.match(/^2027-(01|06|07)-(\d{2})$/);
  if (!match) return iso;
  return `2026-${match[1]}-${match[2]}`;
}

/** Parse 日期／窗口 into ISO dates. Supports the forms already used on the register form. */
export function parseDateOrWindow(raw: string): string[] {
  return expandDateOrWindow(raw).map(seedCalendarIso);
}

function expandDateOrWindow(raw: string): string[] {
  const t = (raw ?? "").trim();
  if (!t) return [];

  const isoRange = t.match(
    /^(\d{4})-(\d{2})-(\d{2})\s*[\/–—-]\s*(\d{4})-(\d{2})-(\d{2})$/,
  );
  if (isoRange) {
    return enumerateIso(
      `${isoRange[1]}-${isoRange[2]}-${isoRange[3]}`,
      `${isoRange[4]}-${isoRange[5]}-${isoRange[6]}`,
    );
  }

  const compact = t.match(
    /^(\d{4})-(\d{2})-(\d{2})\s*[\/–—-]\s*(\d{1,2})$/,
  );
  if (compact) {
    const year = compact[1];
    const month = compact[2];
    const d1 = Number(compact[3]);
    const d2 = Number(compact[4]);
    const out: string[] = [];
    for (let d = Math.min(d1, d2); d <= Math.max(d1, d2); d++) {
      out.push(`${year}-${month}-${String(d).padStart(2, "0")}`);
    }
    return out;
  }

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return [`${iso[1]}-${iso[2]}-${iso[3]}`];

  const dmyRange = t.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})\s*(?:至|–|—|\/)\s*(\d{1,2})-(\d{1,2})-(\d{4})$/,
  );
  if (dmyRange) {
    const start = dmyToIso(dmyRange[1], dmyRange[2], dmyRange[3]);
    const end = dmyToIso(dmyRange[4], dmyRange[5], dmyRange[6]);
    if (start && end) return enumerateIso(start, end);
  }

  const dmy = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const isoDay = dmyToIso(dmy[1], dmy[2], dmy[3]);
    return isoDay ? [isoDay] : [];
  }

  const mdRange = t.match(
    /^(\d{1,2})\/(\d{1,2})\s*[\/–—-]\s*(\d{1,2})\/(\d{1,2})$/,
  );
  if (mdRange) {
    const start = `2026-${String(Number(mdRange[1])).padStart(2, "0")}-${String(Number(mdRange[2])).padStart(2, "0")}`;
    const end = `2026-${String(Number(mdRange[3])).padStart(2, "0")}-${String(Number(mdRange[4])).padStart(2, "0")}`;
    return enumerateIso(start, end);
  }

  const mdDays = t.match(/^(\d{1,2})\/(\d{1,2})\s*[\/–—-]\s*(\d{1,2})$/);
  if (mdDays) {
    const month = String(Number(mdDays[1])).padStart(2, "0");
    const d1 = Number(mdDays[2]);
    const d2 = Number(mdDays[3]);
    const out: string[] = [];
    for (let d = Math.min(d1, d2); d <= Math.max(d1, d2); d++) {
      out.push(`2026-${month}-${String(d).padStart(2, "0")}`);
    }
    return out;
  }

  const md = t.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (md) {
    const month = String(Number(md[1])).padStart(2, "0");
    const day = String(Number(md[2])).padStart(2, "0");
    return [`2026-${month}-${day}`];
  }

  return [];
}

export function coversDate(item: { dateOrWindow: string }, iso: string): boolean {
  return parseDateOrWindow(item.dateOrWindow).includes(iso);
}

/** Activities whose date window includes this calendar day. */
export function conflictsForDate<T extends { dateOrWindow: string }>(iso: string, items: T[]): T[] {
  const day = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
  return items.filter((item) => coversDate(item, day));
}

const PERIOD_ORDER = ["班主任節", "第1節", "第2節", "第3節", "第4節", "第5節", "全日", "頭三節", "一節／班"];

/**
 * Seed, platform submissions, and day-grid placements that occupy this calendar day.
 * A placement on the day is included even when the row's window does not list that date.
 */
export function activitiesForDate(
  iso: string,
  entries: ActivityEntry[],
  placements: { entryId: string; date: string; period: string }[],
): ActivityEntry[] {
  const day = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
  const out: ActivityEntry[] = [];
  for (const entry of entries) {
    const placed = placements.filter((p) => p.entryId === entry.id && p.date === day);
    if (!coversDate(entry, day) && placed.length === 0) continue;
    const periods = [...entry.periods];
    for (const placement of placed) {
      if (placement.period && !periods.includes(placement.period)) periods.push(placement.period);
    }
    periods.sort((a, b) => {
      const ia = PERIOD_ORDER.indexOf(a);
      const ib = PERIOD_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    out.push({ ...entry, periods });
  }
  return out;
}

export function isHallVenue(venue: string | null | undefined): boolean {
  const v = venue ?? "";
  return v.includes("禮堂") || /^\s*H\b/i.test(v);
}

function datesOf(raw: string): string[] {
  const parsed = parseDateOrWindow(raw);
  if (parsed.length) return parsed;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return [seedCalendarIso(t)];
  return [];
}

export function conflictTitles(dateOrWindow: string, items: ConflictItem[]): string[] {
  const dates = datesOf(dateOrWindow);
  if (!dates.length) return [];
  const titles = new Map<string, string>();
  for (const date of dates) {
    for (const item of items) {
      if (coversDate(item, date)) titles.set(item.id, item.title);
    }
  }
  return [...titles.values()].map((title) => `該天已有${title}活動安排`);
}

function occupiesHallAllDay(item: ConflictItem): boolean {
  const periods = item.periods ?? [];
  return (
    periods.some((p) => p.includes("全日")) ||
    Boolean(item.hold && isHallVenue(item.venue) && periods.length === 0)
  );
}

export function isHallFull(dateOrWindow: string, items: ConflictItem[]): boolean {
  const dates = datesOf(dateOrWindow);
  for (const date of dates) {
    for (const item of items) {
      if (coversDate(item, date) && isHallVenue(item.venue) && occupiesHallAllDay(item)) {
        return true;
      }
    }
    for (const rule of ACTIVITY_WEEK_SEED.constraints) {
      if (
        parseDateOrWindow(rule.date).includes(date) &&
        /禮堂/.test(rule.rule) &&
        /全日|封鎖|優先|總綵排/.test(rule.rule)
      ) {
        return true;
      }
    }
  }
  return false;
}

export function constraintLines(dateOrWindow: string): string[] {
  const dates = datesOf(dateOrWindow);
  const lines: string[] = [];
  for (const date of dates) {
    for (const rule of ACTIVITY_WEEK_SEED.constraints) {
      if (parseDateOrWindow(rule.date).includes(date)) {
        lines.push(`${rule.date}：${rule.rule}`);
      }
    }
  }
  return lines;
}

const TEACHING_SLOTS = ["班主任節", "第1節", "第2節", "第3節", "第4節", "第5節"] as const;

function expandedSlots(periods: string[]): string[] {
  const out: string[] = [];
  const add = (name: string) => {
    if (!out.includes(name)) out.push(name);
  };
  for (const raw of periods) {
    const period = raw.trim();
    if (!period) continue;
    if (period.includes("全日")) {
      TEACHING_SLOTS.forEach(add);
      continue;
    }
    if (period.includes("頭三")) {
      add("第1節");
      add("第2節");
      add("第3節");
      continue;
    }
    if (period.includes("一節") && period.includes("班")) continue;
    if ((TEACHING_SLOTS as readonly string[]).includes(period)) add(period);
  }
  return out;
}

function asPeriodList(periods: string[] | string | undefined): string[] {
  if (Array.isArray(periods)) return periods;
  return splitList(periods ?? "");
}

/** Shared venues only. 課室／空白＝各班課室，唔當撞場。 */
function sharedVenue(venue: string): string | null {
  const v = venue.trim();
  if (!v || v.includes("課室")) return null;
  if (v.includes("禮堂") || /^\s*H\b/i.test(v)) return "H";
  if (v.includes("有蓋") || /^\s*C\b/i.test(v)) return "C";
  if (v.includes("籃球") || /^\s*B\b/i.test(v)) return "B";
  if (v.includes("飲食") || /^\s*E\b/i.test(v)) return "E";
  if (v.includes("106")) return "106";
  return v.replace(/\s+/g, "").replace(/室$/, "");
}

function venuesClash(a: string, b: string): boolean {
  const left = sharedVenue(a);
  const right = sharedVenue(b);
  return Boolean(left && right && left === right);
}

/** Unknown slot overlaps a known booking. Named slots must share a period. */
function slotsClash(userPeriods: string[], itemPeriods: string[]): boolean {
  const user = expandedSlots(userPeriods);
  const item = expandedSlots(itemPeriods);
  if (!user.length || !item.length) return true;
  return user.some((slot) => item.includes(slot));
}

function schoolWideRule(rule: string): boolean {
  return /TSA|結業禮|唔排全校|唔排活動週/.test(rule);
}

function hallRule(rule: string): boolean {
  return /禮堂/.test(rule) && !schoolWideRule(rule);
}

/**
 * Colleague register prompts. Empty until the entered date and venue
 * actually collide with a known booking, submission, or hard block.
 * A different venue, or the same venue on a different period, stays quiet.
 */
export function regWarnings(
  dateOrWindow: string,
  items: ConflictItem[],
  venue = "",
  periods: string[] | string = "",
) {
  const empty = { conflicts: [] as string[], hallFull: false, constraints: [] as string[] };
  const trimmed = dateOrWindow.trim();
  if (!trimmed) return empty;
  const dates = datesOf(trimmed);
  if (!dates.length) return empty;

  const userVenue = venue.trim();
  const userPeriods = asPeriodList(periods);
  const titles = new Map<string, string>();
  for (const date of dates) {
    for (const item of items) {
      if (!coversDate(item, date)) continue;
      if (!venuesClash(userVenue, item.venue ?? "")) continue;
      if (!slotsClash(userPeriods, item.periods ?? [])) continue;
      titles.set(item.id, item.title);
    }
  }

  const constraints: string[] = [];
  const seen = new Set<string>();
  for (const date of dates) {
    for (const rule of ACTIVITY_WEEK_SEED.constraints) {
      if (!parseDateOrWindow(rule.date).includes(date)) continue;
      const line = `${rule.date}：${rule.rule}`;
      if (seen.has(line)) continue;
      const blockedDay = schoolWideRule(rule.rule);
      const blockedHall = hallRule(rule.rule) && isHallVenue(userVenue);
      if (!blockedDay && !blockedHall) continue;
      seen.add(line);
      constraints.push(line);
    }
  }

  return {
    conflicts: [...titles.values()].map((title) => `該天已有${title}活動安排`),
    hallFull: isHallVenue(userVenue) && dates.some((date) => isHallFull(date, items)),
    constraints,
  };
}

export function splitList(raw: string): string[] {
  return raw
    .split(/[,，、]/)
    .map((part) => part.trim())
    .filter(Boolean);
}
