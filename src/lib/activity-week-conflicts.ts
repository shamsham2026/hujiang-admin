import { ACTIVITY_WEEK_SEED } from "./activity-week-seed";
import type { ConflictItem } from "./activity-week-types";

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

/** Parse 日期／窗口 into ISO dates. Supports the forms already used on the register form. */
export function parseDateOrWindow(raw: string): string[] {
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

export function isHallVenue(venue: string | null | undefined): boolean {
  const v = venue ?? "";
  return v.includes("禮堂") || /^\s*H\b/i.test(v);
}

function datesOf(raw: string): string[] {
  const parsed = parseDateOrWindow(raw);
  if (parsed.length) return parsed;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return [t];
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
        /全日|封鎖/.test(rule.rule)
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

export function regWarnings(dateOrWindow: string, items: ConflictItem[]) {
  const trimmed = dateOrWindow.trim();
  if (!trimmed) return { conflicts: [] as string[], hallFull: false, constraints: [] as string[] };
  return {
    conflicts: conflictTitles(trimmed, items),
    hallFull: isHallFull(trimmed, items),
    constraints: constraintLines(trimmed),
  };
}

export function splitList(raw: string): string[] {
  return raw
    .split(/[,，、]/)
    .map((part) => part.trim())
    .filter(Boolean);
}
