import {
  CLASSES,
  PERIODS,
  canonicalizePeriod,
  dutyLocation,
  isDutyPeriod,
  subjectOf,
  type PeriodDef,
} from "./cover-timetable";
import type { BoardLesson, BoardSwap } from "./types";
import { weekdayLabel } from "./board";

export type LessonCell = {
  className: string;
  course: string;
  subject: string;
  teacher: string;
  baseTeacher?: string;
  changed: boolean;
  swapType?: string;
  empty: boolean;
};

export type DutyChip = {
  post: string;
  teacher: string;
  course: string;
};

export type DayBoardRow = {
  period: PeriodDef;
  /** Pink duty styling (recess / meals / morning / after-school / 班主任節). */
  duty: boolean;
  /** School-wide duty chips (span under sticky period col). */
  schoolDuty: boolean;
  duties: DutyChip[];
  cells: Record<string, LessonCell>;
};

export type DayBoardModel = {
  date: string;
  day: string;
  classes: string[];
  rows: DayBoardRow[];
};

function swapKey(className: string, period: string) {
  return `${className}|${period}`;
}

function fillClassCells(
  classes: string[],
  dayLessons: BoardLesson[],
  swapIndex: Map<string, BoardSwap>,
  periodId: string,
): Record<string, LessonCell> {
  const cells: Record<string, LessonCell> = {};
  for (const className of classes) {
    const base = dayLessons.find(
      (l) => l.className === className && l.period === periodId,
    );
    const swap = swapIndex.get(swapKey(className, periodId));
    if (!base && !swap) {
      cells[className] = {
        className,
        course: "",
        subject: "",
        teacher: "",
        changed: false,
        empty: true,
      };
      continue;
    }
    const teacher = swap?.newTeacher || base?.teacher || "";
    const course = swap?.newLesson || base?.course || "";
    const orig = swap?.origTeacher || base?.teacher || "";
    cells[className] = {
      className,
      course,
      subject:
        subjectOf(course, className) ||
        (periodId === "班主任節" ? "班主任節" : ""),
      teacher,
      baseTeacher: swap ? orig : undefined,
      changed: Boolean(swap),
      swapType: swap?.type,
      empty: !teacher && !course,
    };
  }
  return cells;
}

/** Build cover-style day board (class columns × period rows) from board payload. */
export function buildDayBoard(
  lessons: BoardLesson[],
  swaps: BoardSwap[],
  dateIso: string,
  opts?: {
    className?: string;
    teacher?: string;
    period?: string;
  },
): DayBoardModel {
  const day = weekdayLabel(dateIso);
  const dayLessons = lessons.filter((l) => l.day === day);
  const daySwaps = swaps.filter((s) => s.date === dateIso);
  const swapIndex = new Map<string, BoardSwap>();
  for (const s of daySwaps) {
    swapIndex.set(swapKey(s.className, s.period), s);
  }

  let classes = [...CLASSES];
  if (opts?.className?.trim()) {
    const q = opts.className.trim().toUpperCase();
    const filtered = classes.filter((c) => c.includes(q));
    if (filtered.length) classes = filtered;
  }

  const periodFilter = opts?.period?.trim() || "";
  // teacher filter is highlight-only (cover `.mine`), not a hide filter

  const rows: DayBoardRow[] = PERIODS.filter((p) => {
    if (!periodFilter) return true;
    return p.id === periodFilter || p.label.includes(periodFilter);
  }).map((period) => {
    const duty = period.kind === "duty";
    /** Per-class duty row (班主任節) vs school-wide chips. */
    const schoolDuty = duty && period.id !== "班主任節";

    if (!schoolDuty) {
      return {
        period,
        duty,
        schoolDuty: false,
        duties: [],
        cells: fillClassCells(classes, dayLessons, swapIndex, period.id),
      };
    }

    const duties: DutyChip[] = [];
    for (const l of dayLessons) {
      const canon = canonicalizePeriod(l.period, l.teacher, l.course);
      if (canon !== period.id) continue;
      if (!isDutyPeriod(l.period, l.course) && l.className) continue;
      const post =
        dutyLocation(l.course) ||
        l.className ||
        subjectOf(l.course, l.className) ||
        period.label;
      duties.push({ post, teacher: l.teacher, course: l.course });
    }

    return {
      period,
      duty: true,
      schoolDuty: true,
      duties,
      cells: {},
    };
  });

  return { date: dateIso, day, classes, rows };
}
