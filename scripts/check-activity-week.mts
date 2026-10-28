import assert from "node:assert/strict";
import { activitiesForDate, conflictsForDate, parseDateOrWindow, regWarnings } from "../src/lib/activity-week-conflicts.ts";
import { isHallFull } from "../src/lib/activity-week-conflicts.ts";
import {
  alignStoredPlacements,
  audienceToClasses,
  cellsForDay,
  defaultPlacements,
  expandPeriods,
  formatShownDate,
  registrationBlankRows,
  registrationCalendars,
  timetableRows,
  venueKey,
} from "../src/lib/activity-week-grid.ts";
import { ACTIVITY_WEEK_SEED } from "../src/lib/activity-week-seed.ts";
import { CANDIDATES } from "../src/lib/activity-week-planning.ts";
import type { ActivityEntry } from "../src/lib/activity-week-types.ts";

const jan = parseDateOrWindow("2026-01-04/2026-01-08");
assert.deepEqual(jan, [
  "2026-01-04",
  "2026-01-05",
  "2026-01-06",
  "2026-01-07",
  "2026-01-08",
]);
assert.deepEqual(parseDateOrWindow("2026-06-14/15"), ["2026-06-14", "2026-06-15"]);
assert.deepEqual(parseDateOrWindow("1/4–8"), jan);
assert.deepEqual(parseDateOrWindow("16-12-2026"), ["2026-12-16"]);
assert.deepEqual(parseDateOrWindow("16-12-2026至21-12-2026"), [
  "2026-12-16",
  "2026-12-17",
  "2026-12-18",
  "2026-12-19",
  "2026-12-20",
  "2026-12-21",
]);
assert.deepEqual(parseDateOrWindow("4-1-2027"), ["2026-01-04"]);
assert.deepEqual(parseDateOrWindow("16-6-2027"), ["2026-06-16"]);
assert.deepEqual(parseDateOrWindow("2-7-2027"), ["2026-07-02"]);
assert.deepEqual(parseDateOrWindow("2027-01-04/2027-01-08"), jan);
assert.deepEqual(parseDateOrWindow("16-12-2027"), ["2027-12-16"]);
assert.ok(parseDateOrWindow("6/16–7/8").includes("2026-06-16"));
assert.ok(parseDateOrWindow("6/16–7/8").includes("2026-07-08"));
assert.ok(!parseDateOrWindow("6/16–7/8").includes("2026-07-09"));

assert.deepEqual(audienceToClasses("小二各班"), ["2A", "2B", "2C", "2D"]);
assert.equal(audienceToClasses("小一至小二").length, 8);
assert.equal(audienceToClasses("小三及小四各班").length, 8);
assert.deepEqual(audienceToClasses("小五"), ["5A", "5B", "5C", "5D"]);
assert.equal(audienceToClasses("初小").length, 12);
assert.equal(audienceToClasses("高小").length, 12);
assert.equal(audienceToClasses("初小、高小").length, 24);
assert.deepEqual(audienceToClasses("80人"), []);
assert.deepEqual(expandPeriods(["全日"]), [
  "班主任節",
  "第1節",
  "第2節",
  "第3節",
  "第4節",
  "第5節",
]);
assert.deepEqual(expandPeriods(["頭三節"]), ["第1節", "第2節", "第3節"]);
assert.deepEqual(expandPeriods(["一節／班"]), []);
assert.equal(venueKey("課室"), null);
assert.equal(venueKey("禮堂"), "H");
assert.equal(venueKey("408室"), "408室");

const seeded = defaultPlacements();
assert.ok(
  seeded.some(
    (p) =>
      p.entryId === "sem1-p2-classroom" &&
      p.date === "2026-01-05" &&
      p.classCode === "2A" &&
      p.period === "第1節",
  ),
);
assert.ok(!seeded.some((p) => p.entryId === "sem1-p5-gas"));
assert.ok(!seeded.some((p) => p.entryId === "sem2-flag-p3p4"));
assert.ok(!seeded.some((p) => p.date === "2026-07-09" || p.date === "2026-06-14"));
assert.ok(
  seeded.some(
    (p) => p.entryId === "sem2-hall-block-0617" && p.date === "2026-06-17" && p.classCode === "其他",
  ),
);
assert.equal(
  seeded.filter((p) => p.entryId === "sem2-grad-rehearsal-0702" && p.date === "2026-07-02").length,
  25 * 6,
);
assert.ok(
  seeded.some(
    (p) => p.entryId === "sem2-hall-block-0617" && p.classCode === "1A" && p.period === "第1節",
  ),
);
assert.ok(isHallFull("2026-07-02", []));
assert.ok(isHallFull("2026-06-17", []));
assert.equal(
  ACTIVITY_WEEK_SEED.seed.some((item) => CANDIDATES.some((c) => item.title === c.title)),
  false,
);
const gasProbe = {
  id: "plc-gas",
  entryId: "sem1-p5-gas",
  date: "2026-01-05",
  classCode: "5A",
  period: "第2節",
  updatedAt: "",
};
const aligned = alignStoredPlacements([gasProbe], {});
assert.ok(!aligned.placements.some((p) => p.entryId === "sem1-p5-gas"));
assert.ok(aligned.placements.some((p) => p.entryId === "sem2-grad-rehearsal-0702"));
const kept = alignStoredPlacements([gasProbe], { "sem1-p5-gas": { periods: ["第2節"] } });
assert.ok(kept.placements.some((p) => p.id === "plc-gas"));

const hallA: ActivityEntry = {
  id: "a",
  title: "禁毒",
  dateOrWindow: "2026-12-18",
  periods: ["全日"],
  venue: "禮堂",
  audience: "小一",
  owner: "",
  subjectTeachers: "",
  hold: true,
  notes: "",
  track: "",
  builtin: true,
  source: "seed",
  revised: false,
};
const hallB: ActivityEntry = { ...hallA, id: "b", title: "木笛" };
const cells = cellsForDay("2026-12-18", [hallA, hallB], [
  {
    id: "1",
    entryId: "a",
    date: "2026-12-18",
    classCode: "1A",
    period: "第1節",
    updatedAt: "",
  },
  {
    id: "2",
    entryId: "a",
    date: "2026-12-18",
    classCode: "1B",
    period: "第1節",
    updatedAt: "",
  },
  {
    id: "3",
    entryId: "b",
    date: "2026-12-18",
    classCode: "其他",
    period: "第1節",
    updatedAt: "",
  },
]);
assert.equal(cells.get("1A|第1節")?.[0].conflict, true);
assert.equal(cells.get("1B|第1節")?.[0].conflict, true);
const sameOnly = cellsForDay("2026-12-18", [hallA], [
  {
    id: "1",
    entryId: "a",
    date: "2026-12-18",
    classCode: "1A",
    period: "第1節",
    updatedAt: "",
  },
  {
    id: "2",
    entryId: "a",
    date: "2026-12-18",
    classCode: "1B",
    period: "第1節",
    updatedAt: "",
  },
]);
assert.equal(sameOnly.get("1A|第1節")?.[0].conflict, false);

const table = timetableRows(
  ACTIVITY_WEEK_SEED.seed.map((item) => ({ ...item, source: "seed" as const, revised: false })),
  seeded,
);
const jan5 = table.find((row) => row.date === "2026-01-05");
assert.deepEqual(jan5?.cells["第1節"], [{ title: "課室活動", venue: "課" }]);
assert.deepEqual(jan5?.cells["第2節"], []);
const jul2 = table.find((row) => row.date === "2026-07-02");
assert.equal(jul2?.cells["第1節"]?.[0].title, "畢業禮總綵排");
assert.ok(table.some((row) => row.date === "2026-12-16"));
assert.ok(!table.some((row) => row.date === "2026-07-09"));

const catalog = ACTIVITY_WEEK_SEED.seed.map(
  (item): ActivityEntry => ({ ...item, source: "seed", revised: false }),
);
const jan5hits = activitiesForDate("2026-01-05", catalog, []);
assert.deepEqual(
  jan5hits.map((item) => item.title),
  ["課室活動", "煤氣講座"],
);
assert.equal(jan5hits.find((item) => item.title === "煤氣講座")?.hold, true);
assert.equal(jan5hits.find((item) => item.title === "煤氣講座")?.venue, "408室");
assert.deepEqual(activitiesForDate("2026-03-01", catalog, []), []);
assert.deepEqual(
  conflictsForDate("2026-01-05", catalog).map((item) => item.title),
  ["課室活動", "煤氣講座"],
);
const placedOffWindow = activitiesForDate("2026-03-02", catalog, [
  { entryId: "sem1-p5-gas", date: "2026-03-02", period: "第3節" },
]);
assert.equal(placedOffWindow.length, 1);
assert.equal(placedOffWindow[0]?.title, "煤氣講座");
assert.deepEqual(placedOffWindow[0]?.periods, ["第3節"]);

const known = ACTIVITY_WEEK_SEED.seed.map((item) => ({
  id: item.id,
  title: item.title,
  dateOrWindow: item.dateOrWindow,
  periods: [...item.periods],
  venue: item.venue,
  hold: item.hold,
}));
assert.deepEqual(regWarnings("", known, "禮堂"), {
  conflicts: [],
  hallFull: false,
  constraints: [],
});
const dateOnly = regWarnings("2026-06-22", known, "");
assert.deepEqual(dateOnly.conflicts, []);
assert.equal(dateOnly.hallFull, false);
assert.deepEqual(dateOnly.constraints, []);
const hall = regWarnings("2026-06-22", known, "H 禮堂");
assert.ok(hall.conflicts.some((line) => line.includes("生涯規劃")));
assert.equal(hall.hallFull, true);
assert.ok(hall.constraints.some((line) => line.includes("禮堂")));
const court = regWarnings("2026-06-22", known, "B 籃球場", "全日");
assert.deepEqual(court.conflicts, []);
assert.equal(court.hallFull, false);
assert.deepEqual(court.constraints, []);
const gas = regWarnings("2026-01-05", known, "408");
assert.ok(gas.conflicts.some((line) => line.includes("煤氣")));
const gasNextYear = regWarnings("2027-01-05", known, "408");
assert.ok(gasNextYear.conflicts.some((line) => line.includes("煤氣")));
const gradNextYear = regWarnings("2027-07-02", known, "禮堂", "第3節");
assert.equal(gradNextYear.hallFull, true);
assert.ok(gradNextYear.conflicts.some((line) => line.includes("畢業禮")));
const peerNextYear = regWarnings(
  "4-1-2027",
  [
    ...known,
    {
      id: "sub-2027",
      title: "英文週",
      dateOrWindow: "2027-01-04",
      periods: ["第1節"],
      venue: "408室",
      hold: false,
    },
  ],
  "408",
  "第1節",
);
assert.ok(peerNextYear.conflicts.some((line) => line.includes("英文週")));
assert.equal(gas.hallFull, false);
const janHall = regWarnings("2026-01-05", known, "禮堂", "第1節");
assert.deepEqual(janHall.conflicts, []);
assert.equal(janHall.hallFull, false);
assert.deepEqual(janHall.constraints, []);
const morning = regWarnings("2026-12-21", known, "禮堂", "第1節");
assert.ok(morning.conflicts.some((line) => line.includes("木笛")));
assert.ok(!morning.conflicts.some((line) => line.includes("STEM")));
assert.equal(morning.hallFull, false);
const afternoon = regWarnings("2026-12-21", known, "禮堂", "第5節");
assert.ok(afternoon.conflicts.some((line) => line.includes("STEM")));
assert.ok(!afternoon.conflicts.some((line) => line.includes("木笛")));
const unspecified = regWarnings("2026-12-21", known, "禮堂", "");
assert.ok(unspecified.conflicts.some((line) => line.includes("木笛")));
assert.ok(unspecified.conflicts.some((line) => line.includes("STEM")));
const classroom = regWarnings("2026-01-05", known, "課室", "第1節");
assert.deepEqual(classroom.conflicts, []);
assert.deepEqual(classroom.constraints, []);
const closing = regWarnings("2026-07-09", known, "課室");
assert.deepEqual(closing.conflicts, []);
assert.equal(closing.hallFull, false);
assert.ok(closing.constraints.some((line) => line.includes("結業禮")));
const gradCourt = regWarnings("2026-07-02", known, "籃球場");
assert.deepEqual(gradCourt.conflicts, []);
assert.equal(gradCourt.hallFull, false);
assert.deepEqual(gradCourt.constraints, []);
const gradHall = regWarnings("2026-07-02", known, "禮堂", "第3節");
assert.equal(gradHall.hallFull, true);
assert.ok(gradHall.conflicts.some((line) => line.includes("畢業禮")));
const flag = regWarnings("2026-06-18", known, "禮堂", "第1節");
assert.ok(!flag.conflicts.some((line) => line.includes("升旗")));
assert.deepEqual(flag.constraints, []);
const submitted = [
  ...known,
  {
    id: "sub-cover",
    title: "英文週",
    dateOrWindow: "2026-12-16",
    periods: ["第2節"],
    venue: "有蓋操場",
    hold: false,
  },
];
assert.ok(
  regWarnings("2026-12-16", submitted, "C 有蓋操場", "第2節").conflicts.some((line) =>
    line.includes("英文週"),
  ),
);
assert.deepEqual(regWarnings("2026-12-16", submitted, "C 有蓋操場", "第4節").conflicts, []);

const blank = timetableRows([], []);
assert.ok(blank.length > 0);
assert.ok(blank.every((row) => Object.values(row.cells).every((items) => items.length === 0)));
assert.ok(blank.some((row) => row.date === "2026-01-05"));
assert.ok(!blank.some((row) => JSON.stringify(row.cells).includes("課室活動")));

const registrationBlank = registrationBlankRows();
assert.deepEqual(
  registrationBlank.filter((row) => row.group === "期考後時間表").map((row) => row.date),
  ["2026-12-16", "2026-12-17", "2026-12-18", "2026-12-21"],
);
assert.deepEqual(
  [...new Set(registrationBlank.map((row) => row.group))],
  ["期考後時間表", "上學期活動週", "下學期活動週"],
);
assert.ok(registrationBlank.findIndex((row) => row.date.startsWith("2026-01")) > 3);
assert.ok(
  registrationBlank.findIndex((row) => row.date.startsWith("2026-06")) >
    registrationBlank.findIndex((row) => row.date.startsWith("2026-01")),
);
assert.equal(
  registrationBlank.find((row) => row.date === "2026-12-16")?.label,
  "16-12-2026 週三",
);
assert.equal(
  registrationBlank.find((row) => row.date === "2026-01-04")?.label,
  "4-1-2026 週日",
);
assert.ok(registrationBlank.every((row) => !row.label.includes("/")));
assert.equal(formatShownDate("2026-07-02"), "2-7-2026");
assert.equal(formatShownDate("2026-06-14/15"), "14-6-2026至15-6-2026");

const calendars = registrationCalendars();
assert.deepEqual(
  calendars.map((month) => `${month.group}:${month.year}-${String(month.month).padStart(2, "0")}`),
  [
    "上學期期考後活動週:2026-12",
    "上學期期考後活動週:2027-01",
    "下學期期考後活動週:2027-06",
    "下學期期考後活動週:2027-07",
  ],
);
assert.deepEqual(
  [...new Set(calendars.map((month) => month.group))],
  ["上學期期考後活動週", "下學期期考後活動週"],
);
const listed = calendars.flatMap((month) =>
  month.weeks.flatMap((week) => week.flatMap((day) => (day ? [day.date] : []))),
);
const schoolDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
};
const secondTerm = listed.filter((iso) => iso.startsWith("2027-06") || iso.startsWith("2027-07"));
assert.ok(secondTerm.every(schoolDay));
assert.deepEqual(
  listed.filter((iso) => !iso.startsWith("2027-06") && !iso.startsWith("2027-07")),
  registrationBlank
    .filter((row) => row.group !== "下學期活動週")
    .map((row) => row.date.replace(/^2026-01-/, "2027-01-")),
);
assert.deepEqual(
  secondTerm.filter((iso) => iso.startsWith("2027-06")),
  [
    "2027-06-16",
    "2027-06-17",
    "2027-06-18",
    "2027-06-21",
    "2027-06-22",
    "2027-06-23",
    "2027-06-24",
    "2027-06-25",
    "2027-06-28",
    "2027-06-29",
    "2027-06-30",
  ],
);
assert.deepEqual(
  secondTerm.filter((iso) => iso.startsWith("2027-07")),
  ["2027-07-01", "2027-07-02", "2027-07-05", "2027-07-06", "2027-07-07", "2027-07-08"],
);
assert.ok(calendars.every((month) => month.weeks.every((week) => week.length === 7)));
const december16 = calendars[0]?.weeks
  .flatMap((week) => week.map((day, index) => (day?.date === "2026-12-16" ? index : -1)))
  .find((index) => index >= 0);
assert.equal(december16, 3);
const january4 = calendars[1]?.weeks
  .flatMap((week) => week.map((day, index) => (day?.date === "2027-01-04" ? index : -1)))
  .find((index) => index >= 0);
assert.equal(january4, 1);
assert.equal(
  calendars[1]?.weeks.flat().find((day) => day?.date === "2027-01-04")?.label,
  "4-1-2027 週一",
);
assert.deepEqual(
  calendars[1]?.weeks.flatMap((week) => week.flatMap((day) => (day ? [Number(day.date.slice(8))] : []))),
  [4, 5, 6, 7, 8],
);
for (const blocked of [
  "2026-12-15",
  "2026-12-19",
  "2027-06-14",
  "2027-06-19",
  "2027-06-26",
  "2027-07-03",
  "2027-07-09",
  "2027-01-03",
]) {
  assert.equal(listed.includes(blocked), false, blocked);
}

console.log("activity-week checks ok", seeded.length);
