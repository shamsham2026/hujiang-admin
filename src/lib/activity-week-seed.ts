import handoff from "../data/activity-week-handoff.json";
import type { SeedActivity } from "./activity-week-seed-types";

export type { SeedActivity };

export type PeriodTemplate = {
  name: string;
  start: string;
  end: string;
  minutes: number;
  note?: string;
};

type HandoffActivity = (typeof handoff.activities)[number];

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function notesFor(activity: HandoffActivity): string {
  const parts: string[] = [];
  if ("date_note" in activity && activity.date_note) parts.push(activity.date_note);
  if ("duration_note" in activity && activity.duration_note) parts.push(activity.duration_note);
  else if (activity.duration_min) parts.push(`約 ${activity.duration_min} 分鐘`);
  if (activity.missing?.length) parts.push(`缺：${activity.missing.join("、")}`);
  return parts.join("。");
}

function fromHandoff(activity: HandoffActivity): SeedActivity {
  return {
    id: activity.id,
    title: activity.title,
    dateOrWindow: activity.window,
    periods: activity.periods ?? [],
    venue: text(activity.venue),
    audience: text(activity.audience),
    owner: text(activity.owner),
    hold: Boolean(activity.hold_venue),
    notes: notesFor(activity),
    track: activity.track,
    builtin: true,
  };
}

/**
 * 7/2 係硬性約束，唔係同事提交。
 * 禮堂優先所以種成全日禮堂佔用，其他節目先會喺格子見到衝突。
 */
const GRADUATION_REHEARSAL: SeedActivity = {
  id: "sem2-grad-rehearsal-0702",
  title: "畢業禮總綵排",
  dateOrWindow: "2026-07-02",
  periods: ["全日"],
  venue: "禮堂",
  audience: "",
  owner: "",
  hold: true,
  notes: "禮堂／相關場地優先預留。其他活動避開禮堂。唔入 Google Calendar。",
  track: "下學期活動週｜場地優先",
  builtin: true,
};

/** Built-in catalogue from the 2026-10-19 handoff. Revisions live in the store. */
export const ACTIVITY_WEEK_SEED: {
  periods: PeriodTemplate[];
  venues: { code: string | null; name: string }[];
  constraints: { date: string; rule: string }[];
  windows: {
    上學期活動週: { start: string; end: string };
    下學期活動週: { start: string; end: string };
    期考後時間表: { dates: string[]; note: string };
  };
  seed: SeedActivity[];
} = {
  periods: handoff.timetable.periods.map((period) => ({
    name: period.name,
    start: period.start,
    end: period.end,
    minutes: period.minutes,
    ...("note" in period && period.note ? { note: period.note } : {}),
  })),
  venues: handoff.timetable.venues.map((venue) => ({
    code: venue.code,
    name: venue.name,
  })),
  constraints: handoff.timetable.hard_constraints.map((rule) => ({
    date: rule.date,
    rule: rule.rule,
  })),
  windows: handoff.timetable.windows,
  seed: [...handoff.activities.map(fromHandoff), GRADUATION_REHEARSAL],
};
