/** Shared types for 滬江小學行政管理平台 */

export type PaperStepKey = "1" | "2" | "3" | "4" | "5" | "6";

export type ReminderTaskKey =
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "early-owing";

export const PAPER_STEPS: { key: PaperStepKey; label: string }[] = [
  { key: "1", label: "校長已簽" },
  { key: "2", label: "玉夾附面紙交 kim 印 2 份" },
  { key: "3", label: "玉請同事覆核試卷" },
  { key: "4", label: "完成覆核可送印" },
  { key: "5", label: "工友已印妥" },
  { key: "6", label: "已鎖 109" },
];

/** Chronological exam-week reminders (pre-exam → exam days). */
export const PERIOD_REMINDERS: {
  key: ReminderTaskKey;
  label: string;
  detail: string;
}[] = [
  {
    key: "9",
    label: "考試前一週檢查默書 folder",
    detail: "檢查各級默書是否齊全",
  },
  {
    key: "10",
    label: "考試前週五檢查聆聽 folder",
    detail: "考試前那個星期五檢查聆聽 folder",
  },
  {
    key: "7",
    label: "第一天考試出提示",
    detail: "小一至小三核英默／小四至小六核中默",
  },
  {
    key: "8",
    label: "第二天考試出提示",
    detail: "小一至小三核中默／小四至小六核英默",
  },
];

export const SEPT_FOLDER_TASK = {
  key: "11" as ReminderTaskKey,
  label: "九月開默書／聆聽 folder",
  detail: "默書、聆聽相關 folder 於九月開設（位置「m」待確認）",
};

export const EARLY_OWING_TASK = {
  key: "early-owing" as ReminderTaskKey,
  label: "提前試前一週「尚欠」提示",
  detail: "尚欠乜級——中作／說話／科學實驗／普通話／音樂／體育",
};

export type StepTick = {
  ticked: boolean;
  tickedBy: string | null;
  tickedAt: string | null;
};

export type PaperInstance = {
  paperId: string;
  periodId: string;
  label: string;
  subject: string;
  grade: string;
  status: "not_started" | "in_progress" | "done";
  steps: Record<PaperStepKey, StepTick>;
};

export type ReminderTask = {
  taskKey: ReminderTaskKey;
  done: boolean;
  doneBy: string | null;
  doneAt: string | null;
};

export type ExamPeriod = {
  periodId: string;
  schoolYear: string;
  name: string;
  startDate: string;
  endDate: string;
  isEarlyExam: boolean;
  status: "active" | "archived";
  reminders: ReminderTask[];
  papers: PaperInstance[];
};

export type ExamStore = {
  schoolYear: string;
  operatorName: string;
  septFolder: ReminderTask;
  periods: ExamPeriod[];
  updatedAt: string;
  /** Where PaperInstances were generated from (Drive cursor / Store file). */
  sourceLabel?: string;
  sourceMode?: string;
};

export type BoardLesson = {
  className: string;
  day: string;
  period: string;
  course: string;
  teacher: string;
  room?: string;
};

export type BoardSwap = {
  date: string;
  day: string;
  period: string;
  className: string;
  origTeacher: string;
  newTeacher: string;
  newLesson: string;
  type: string;
  key: string;
  status: string;
};

export type BoardTeacher = {
  full: string;
  short: string;
};

export type BoardPayload = {
  school?: string;
  year?: string;
  source?: string;
  teachers: BoardTeacher[];
  lessons: BoardLesson[];
  swaps: BoardSwap[];
  records?: unknown[];
  locked?: unknown[];
  calendar?: unknown[];
};

export type EffectiveRow = {
  period: string;
  className: string;
  course: string;
  teacher: string;
  origTeacher?: string;
  room: string;
  source: "base" | "swap";
  swapType?: string;
};

export const COVER_BASE = "https://hujiang-cover.vercel.app";
export const BOARD_URL =
  process.env.BOARD_URL ?? `${COVER_BASE}/api/board`;
export const SCHOOL_YEAR_DEFAULT = "2026/27";
export const OPERATOR_DEFAULT = "校務";

/** Google Drive folder name: Cursor */
export const DRIVE_CURSOR_FOLDER_ID = "1powCilIiooBcrdb4SoLkLwKXowHVQsha";
export const DRIVE_CURSOR_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_CURSOR_FOLDER_ID}`;
