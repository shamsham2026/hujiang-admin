/** Cover homepage timetable constants / helpers (structural parity with hujiang-cover). */

export type PeriodKind = "lesson" | "duty";

export type PeriodDef = {
  id: string;
  label: string;
  time: string;
  kind: PeriodKind;
};

export const PERIODS: PeriodDef[] = [
  { id: "7:30", label: "早會前 7:30", time: "7:30–7:45", kind: "duty" },
  { id: "7:45", label: "早會前 7:45", time: "7:45–8:10", kind: "duty" },
  { id: "班主任節", label: "班主任節", time: "8:10–8:35", kind: "duty" },
  { id: "1", label: "第 1 節", time: "8:35–9:05", kind: "lesson" },
  { id: "2", label: "第 2 節", time: "9:05–9:35", kind: "lesson" },
  { id: "小息1", label: "第一小息", time: "9:35–9:50", kind: "duty" },
  { id: "3", label: "第 3 節", time: "9:50–10:20", kind: "lesson" },
  { id: "4", label: "第 4 節", time: "10:20–10:50", kind: "lesson" },
  { id: "小息2", label: "第二小息", time: "10:50–11:05", kind: "duty" },
  { id: "5", label: "第 5 節", time: "11:05–11:35", kind: "lesson" },
  { id: "6", label: "第 6 節", time: "11:35–12:05", kind: "lesson" },
  { id: "午膳", label: "午膳", time: "12:05–12:45", kind: "duty" },
  { id: "午息", label: "午息", time: "12:45–13:00", kind: "duty" },
  { id: "7", label: "第 7 節", time: "13:00–13:30", kind: "lesson" },
  { id: "8", label: "第 8 節", time: "13:30–14:00", kind: "lesson" },
  { id: "9", label: "第 9 節", time: "14:00–14:30", kind: "lesson" },
  { id: "10", label: "第 10 節", time: "14:30–15:00", kind: "lesson" },
  { id: "放學", label: "放學當值", time: "15:00 後", kind: "duty" },
];

export const PERIOD_ORDER = new Map(PERIODS.map((p, i) => [p.id, i]));

export const GRADES = ["1", "2", "3", "4", "5", "6"] as const;
export const SECTIONS = ["A", "B", "C", "D"] as const;
export const CLASSES = GRADES.flatMap((g) => SECTIONS.map((s) => `${g}${s}`));

const DUTY_PERIOD_IDS = new Set(PERIODS.filter((p) => p.kind === "duty").map((p) => p.id));

/** Cover morning-duty eligibility (for splitting board「早會前」→ 7:30 / 7:45). */
const MORNING_730 = new Set(["俊", "忻", "玉", "錦", "黃", "邢", "梓", "蕭", "琪", "袁", "羅"]);
const MORNING_745 = new Set([
  "俊", "忻", "玉", "錦", "黃", "邢", "梓", "蕭", "琪",
  "蔡", "舒", "寶", "裕", "燁", "燤", "燕", "萬", "吳", "悠",
]);

export function periodMeta(id: string): PeriodDef {
  return (
    PERIODS.find((p) => p.id === id) ?? {
      id,
      label: id === "早會前" ? "早會前" : id,
      time: "",
      kind: "lesson",
    }
  );
}

export function periodLabel(id: string): string {
  return periodMeta(id).label;
}

export function isDutyPeriod(period: string, course = ""): boolean {
  if (DUTY_PERIOD_IDS.has(period) || period === "早會前") return true;
  return Boolean(
    course &&
      (course.includes("當值") ||
        course.includes("班主任節") ||
        course.includes("早會") ||
        course.startsWith("放學") ||
        course.includes("小息") ||
        course.includes("午膳") ||
        course.includes("午息")),
  );
}

export function dutyLocation(course: string): string {
  const m = course.match(/當值\((.+)\)/);
  return m?.[1] || "";
}

/** Strip class prefix from course string → subject line (cover subjectOf). */
export function subjectOf(course: string, className = ""): string {
  const r = course.trim();
  if (!r) return "";
  if (isDutyPeriod("", r) || r.includes("當值") || r.includes("班主任")) return r;
  const prefix = r.match(/^(?:[1-6][A-D]{1,2})+/);
  if (prefix) {
    const rest = r.slice(prefix[0].length).trim();
    return rest || r;
  }
  if (className && r.startsWith(className)) {
    return r.slice(className.length).trim() || r;
  }
  return r;
}

export function morningSlotForTeacher(teacher: string): "7:30" | "7:45" {
  const t = teacher.trim();
  const can730 = MORNING_730.has(t);
  const can745 = MORNING_745.has(t);
  if (can730 && !can745) return "7:30";
  if (can745 && !can730) return "7:45";
  if (can730 && can745) return "7:30";
  return "7:45";
}

export function canonicalizePeriod(period: string, teacher = "", course = ""): string {
  if (period === "早會前" || (course.includes("早會前") && !DUTY_PERIOD_IDS.has(period))) {
    return morningSlotForTeacher(teacher);
  }
  return period;
}
