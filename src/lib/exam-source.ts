import { promises as fs } from "fs";
import path from "path";
import {
  EARLY_OWING_TASK,
  PAPER_STEPS,
  PERIOD_REMINDERS,
  SCHOOL_YEAR_DEFAULT,
  SEPT_FOLDER_TASK,
  type ExamPeriod,
  type ExamStore,
  type PaperInstance,
  type PaperStepKey,
  type ReminderTask,
  type StepTick,
} from "./types";

export type SourcePaperDef = {
  key: string;
  grade: string;
  subject: string;
  label: string;
};

export type SourcePeriodDef = {
  periodId: string;
  name: string;
  startDate: string;
  endDate: string;
  isEarlyExam: boolean;
  papers: SourcePaperDef[];
};

export type ExamPapersSource = {
  schoolYear: string;
  sourceLabel: string;
  driveFolderId?: string;
  sourceFileId?: string;
  sourceFileName?: string;
  workflowFileName?: string;
  periods: SourcePeriodDef[];
};

/** Sham's school materials folder (Drive name: Cursor). */
export const DRIVE_CURSOR_FOLDER_ID =
  process.env.EXAM_DRIVE_FOLDER_ID ??
  "1powCilIiooBcrdb4SoLkLwKXowHVQsha";

export const DRIVE_CURSOR_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_CURSOR_FOLDER_ID}`;

export type ExamTickState = {
  version: 2;
  operatorName: string;
  septFolder: ReminderTask;
  /** periodId → taskKey → tick */
  reminders: Record<string, Partial<Record<string, ReminderTask>>>;
  /** paperId → stepKey → tick */
  paperTicks: Record<string, Partial<Record<PaperStepKey, StepTick>>>;
  updatedAt: string;
};

const SOURCE_PATH = path.join(
  process.cwd(),
  "data",
  "exam-papers-source.json",
);

function emptyTick(): StepTick {
  return { ticked: false, tickedBy: null, tickedAt: null };
}

function emptySteps(): Record<PaperStepKey, StepTick> {
  return Object.fromEntries(
    PAPER_STEPS.map((s) => [s.key, emptyTick()]),
  ) as Record<PaperStepKey, StepTick>;
}

function reminder(taskKey: ReminderTask["taskKey"]): ReminderTask {
  return { taskKey, done: false, doneBy: null, doneAt: null };
}

export function paperIdFor(periodId: string, key: string): string {
  return `${periodId}/${key}`;
}

export async function loadExamSource(): Promise<ExamPapersSource> {
  const raw = await fs.readFile(SOURCE_PATH, "utf8");
  const data = JSON.parse(raw) as ExamPapersSource;
  if (!data.periods?.length) {
    throw new Error("試卷清單沒有考試期");
  }
  return data;
}

export function sourceModeLabel(): string {
  const mode = process.env.EXAM_SOURCE_MODE ?? "store-file";
  if (mode === "drive") {
    return `Drive Cursor／${process.env.EXAM_SOURCE_FILE ?? "試卷清單.json"}（${DRIVE_CURSOR_FOLDER_ID}）`;
  }
  return `Drive Cursor／1. 各科各級試卷清單_給KIM檢查收齊試卷用.docx → data/exam-papers-source.json（${DRIVE_CURSOR_FOLDER_ID}）`;
}

export function emptyTickState(operatorName = "校務"): ExamTickState {
  return {
    version: 2,
    operatorName,
    septFolder: reminder(SEPT_FOLDER_TASK.key),
    reminders: {},
    paperTicks: {},
    updatedAt: new Date().toISOString(),
  };
}

/** Merge catalog (source of truth for papers) with Blob ticks. */
export function mergeSourceAndTicks(
  source: ExamPapersSource,
  ticks: ExamTickState,
): ExamStore {
  const periods: ExamPeriod[] = source.periods.map((p) => {
    const remKeys = [
      ...PERIOD_REMINDERS.map((r) => r.key),
      ...(p.isEarlyExam ? [EARLY_OWING_TASK.key] : []),
    ];
    const reminders: ReminderTask[] = remKeys.map((taskKey) => {
      const saved = ticks.reminders[p.periodId]?.[taskKey];
      if (saved) return { ...saved, taskKey };
      return reminder(taskKey);
    });

    const papers: PaperInstance[] = p.papers.map((def) => {
      const paperId = paperIdFor(p.periodId, def.key);
      const savedSteps = ticks.paperTicks[paperId] ?? {};
      const steps = emptySteps();
      for (const s of PAPER_STEPS) {
        const hit = savedSteps[s.key];
        if (hit) steps[s.key] = hit;
      }
      const values = Object.values(steps);
      const doneCount = values.filter((x) => x.ticked).length;
      const status =
        doneCount === 0
          ? "not_started"
          : doneCount === values.length
            ? "done"
            : "in_progress";
      return {
        paperId,
        periodId: p.periodId,
        label: def.label,
        subject: def.subject,
        grade: def.grade,
        status,
        steps,
      };
    });

    return {
      periodId: p.periodId,
      schoolYear: source.schoolYear || SCHOOL_YEAR_DEFAULT,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      isEarlyExam: p.isEarlyExam,
      status: "active",
      reminders,
      papers,
    };
  });

  return {
    schoolYear: source.schoolYear || SCHOOL_YEAR_DEFAULT,
    operatorName: ticks.operatorName || "校務",
    septFolder: ticks.septFolder?.taskKey
      ? ticks.septFolder
      : reminder(SEPT_FOLDER_TASK.key),
    periods,
    updatedAt: ticks.updatedAt || new Date().toISOString(),
    sourceLabel: source.sourceLabel || sourceModeLabel(),
    sourceMode: process.env.EXAM_SOURCE_MODE ?? "store-file",
  };
}

/** Extract ticks from legacy full ExamStore blob (v1). */
export function ticksFromLegacyStore(store: ExamStore): ExamTickState {
  const ticks = emptyTickState(store.operatorName);
  ticks.septFolder = store.septFolder;
  ticks.updatedAt = store.updatedAt;
  for (const period of store.periods) {
    ticks.reminders[period.periodId] = {};
    for (const r of period.reminders) {
      ticks.reminders[period.periodId][r.taskKey] = r;
    }
    for (const paper of period.papers) {
      ticks.paperTicks[paper.paperId] = { ...paper.steps };
    }
  }
  return ticks;
}

export function isTickState(v: unknown): v is ExamTickState {
  return Boolean(
    v &&
      typeof v === "object" &&
      (v as ExamTickState).version === 2 &&
      "paperTicks" in (v as object),
  );
}

export function isLegacyExamStore(v: unknown): v is ExamStore {
  return Boolean(
    v &&
      typeof v === "object" &&
      Array.isArray((v as ExamStore).periods) &&
      !("version" in (v as object) && (v as ExamTickState).version === 2),
  );
}
