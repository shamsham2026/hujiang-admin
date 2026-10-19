import assert from "node:assert/strict";
import { parseDateOrWindow } from "../src/lib/activity-week-conflicts.ts";
import { isHallFull } from "../src/lib/activity-week-conflicts.ts";
import {
  alignStoredPlacements,
  audienceToClasses,
  cellsForDay,
  defaultPlacements,
  expandPeriods,
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
assert.ok(parseDateOrWindow("6/16–7/8").includes("2026-06-16"));
assert.ok(parseDateOrWindow("6/16–7/8").includes("2026-07-08"));
assert.ok(!parseDateOrWindow("6/16–7/8").includes("2026-07-09"));

assert.deepEqual(audienceToClasses("小二各班"), ["2A", "2B", "2C", "2D"]);
assert.equal(audienceToClasses("小一至小二").length, 8);
assert.equal(audienceToClasses("小三及小四各班").length, 8);
assert.deepEqual(audienceToClasses("小五"), ["5A", "5B", "5C", "5D"]);
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

console.log("activity-week checks ok", seeded.length);
