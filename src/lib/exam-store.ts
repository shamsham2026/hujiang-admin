import { promises as fs } from "fs";
import path from "path";
import { BlobNotFoundError, BlobStoreNotFoundError, BlobStoreSuspendedError, get, put } from "@vercel/blob";
import {
  DRIVE_CURSOR_FOLDER_ID,
  DRIVE_CURSOR_FOLDER_URL,
  emptyTickState,
  isLegacyExamStore,
  isTickState,
  loadExamSource,
  mergeSourceAndTicks,
  sourceModeLabel,
  ticksFromLegacyStore,
  type ExamTickState,
} from "./exam-source";
import type {
  ExamStore,
  PaperStepKey,
  ReminderTaskKey,
} from "./types";

const LOCAL_TICKS_PATH = path.join(process.cwd(), "data", "exam-ticks.json");
const BLOB_PATHNAME = "hujiang-admin/exam-ticks.json";
/** Legacy full-store blob — migrated on first read. */
const LEGACY_BLOB_PATHNAME = "hujiang-admin/exam-store.json";

declare global {
  var __hujiangExamTicks: ExamTickState | undefined;
  var __hujiangExamStoreLock: Promise<void> | undefined;
  var __hujiangExamSourceCache:
    | Awaited<ReturnType<typeof loadExamSource>>
    | undefined;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readLocalTicks(): Promise<ExamTickState | null> {
  try {
    const raw = await fs.readFile(LOCAL_TICKS_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (isTickState(parsed)) return parsed;
    if (isLegacyExamStore(parsed)) return ticksFromLegacyStore(parsed);
    return null;
  } catch {
    return null;
  }
}

async function writeLocalTicks(ticks: ExamTickState): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_TICKS_PATH), { recursive: true });
  await fs.writeFile(LOCAL_TICKS_PATH, JSON.stringify(ticks, null, 2), "utf8");
}

type BlobRead = { status: "value"; value: unknown } | { status: "missing" } | { status: "unavailable" };

function blobIsMissing(err: unknown): boolean {
  return err instanceof BlobNotFoundError;
}

function blobIsUnavailable(err: unknown): boolean {
  return err instanceof BlobStoreSuspendedError || err instanceof BlobStoreNotFoundError;
}

/** Missing file is empty storage. A suspended store must not be treated as empty or rewritten. */
async function readBlobPath(pathname: string): Promise<BlobRead> {
  if (!hasBlob()) return { status: "missing" };
  try {
    const result = await get(pathname, {
      access: "private",
      useCache: false,
    });
    if (!result?.stream) return { status: "missing" };
    const text = await new Response(result.stream).text();
    return { status: "value", value: JSON.parse(text) as unknown };
  } catch (err) {
    if (blobIsMissing(err)) return { status: "missing" };
    if (blobIsUnavailable(err)) return { status: "unavailable" };
    throw err;
  }
}

async function writeBlobTicks(ticks: ExamTickState): Promise<void> {
  if (!hasBlob()) return;
  await put(BLOB_PATHNAME, JSON.stringify(ticks, null, 2), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function rememberTicks(ticks: ExamTickState): ExamTickState {
  globalThis.__hujiangExamTicks = ticks;
  return clone(ticks);
}

async function loadTicks(): Promise<ExamTickState> {
  if (globalThis.__hujiangExamTicks) {
    return clone(globalThis.__hujiangExamTicks);
  }

  if (hasBlob()) {
    const current = await readBlobPath(BLOB_PATHNAME);
    if (current.status === "unavailable") return rememberTicks(emptyTickState());
    if (current.status === "value" && isTickState(current.value)) {
      return rememberTicks(current.value);
    }

    const legacy = await readBlobPath(LEGACY_BLOB_PATHNAME);
    if (legacy.status === "unavailable") return rememberTicks(emptyTickState());
    if (legacy.status === "value" && isLegacyExamStore(legacy.value)) {
      return rememberTicks(ticksFromLegacyStore(legacy.value));
    }
    if (legacy.status === "value" && isTickState(legacy.value)) {
      return rememberTicks(legacy.value);
    }
    // Opening the page must not create or overwrite blob ticks.
    return rememberTicks(emptyTickState());
  }

  const fromLocal = await readLocalTicks();
  if (fromLocal) return rememberTicks(fromLocal);

  // Vercel’s deployment filesystem is read-only. Do not write a ticks file just to render the list.
  return rememberTicks(emptyTickState());
}

async function getSource() {
  if (!globalThis.__hujiangExamSourceCache) {
    globalThis.__hujiangExamSourceCache = await loadExamSource();
  }
  return globalThis.__hujiangExamSourceCache;
}

async function persistTicks(ticks: ExamTickState): Promise<void> {
  ticks.updatedAt = new Date().toISOString();
  globalThis.__hujiangExamTicks = clone(ticks);
  if (hasBlob()) {
    try {
      await writeBlobTicks(ticks);
    } catch (err) {
      if (blobIsUnavailable(err)) {
        throw new Error("試卷剔選儲存暫停，清單仍可查看，今次剔選未能寫入。");
      }
      throw err;
    }
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("試卷剔選未設定 Blob，清單仍可查看，今次剔選未能寫入。");
  }
  await writeLocalTicks(ticks);
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = globalThis.__hujiangExamStoreLock ?? Promise.resolve();
  let release!: () => void;
  globalThis.__hujiangExamStoreLock = new Promise<void>((r) => {
    release = r;
  });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

async function buildStore(): Promise<ExamStore> {
  const [source, ticks] = await Promise.all([getSource(), loadTicks()]);
  return mergeSourceAndTicks(source, ticks);
}

export function persistenceMode(): "blob" | "local-json" {
  return hasBlob() ? "blob" : "local-json";
}

export function examSourceInfo(): {
  mode: string;
  label: string;
  driveFolderId: string;
  driveFolderUrl: string;
} {
  return {
    mode: process.env.EXAM_SOURCE_MODE ?? "store-file",
    label: sourceModeLabel(),
    driveFolderId: DRIVE_CURSOR_FOLDER_ID,
    driveFolderUrl: DRIVE_CURSOR_FOLDER_URL,
  };
}

export async function getExamStore(): Promise<ExamStore> {
  return withLock(() => buildStore());
}

export async function setOperatorName(name: string): Promise<ExamStore> {
  return withLock(async () => {
    const ticks = await loadTicks();
    ticks.operatorName = name.trim() || ticks.operatorName;
    await persistTicks(ticks);
    return mergeSourceAndTicks(await getSource(), ticks);
  });
}

export async function togglePaperStep(
  periodId: string,
  paperId: string,
  stepKey: PaperStepKey,
  ticked: boolean,
  by?: string,
): Promise<ExamStore> {
  return withLock(async () => {
    const source = await getSource();
    const period = source.periods.find((p) => p.periodId === periodId);
    if (!period) throw new Error("找不到考試期");
    const known = period.papers.some(
      (p) => `${periodId}/${p.key}` === paperId,
    );
    if (!known) {
      throw new Error("清單中找不到此試卷（請改來源檔，勿在網頁新增）");
    }

    const ticks = await loadTicks();
    const who = (by ?? ticks.operatorName).trim() || "校務";
    if (!ticks.paperTicks[paperId]) ticks.paperTicks[paperId] = {};
    ticks.paperTicks[paperId][stepKey] = ticked
      ? { ticked: true, tickedBy: who, tickedAt: new Date().toISOString() }
      : { ticked: false, tickedBy: null, tickedAt: null };

    await persistTicks(ticks);
    return mergeSourceAndTicks(source, ticks);
  });
}

export async function toggleReminder(
  periodId: string | null,
  taskKey: ReminderTaskKey,
  done: boolean,
  by?: string,
): Promise<ExamStore> {
  return withLock(async () => {
    const source = await getSource();
    const ticks = await loadTicks();
    const who = (by ?? ticks.operatorName).trim() || "校務";
    const stamp = {
      taskKey,
      done,
      doneBy: done ? who : null,
      doneAt: done ? new Date().toISOString() : null,
    };

    if (taskKey === "11") {
      ticks.septFolder = stamp;
    } else {
      if (!periodId) throw new Error("缺少考試期");
      if (!source.periods.some((p) => p.periodId === periodId)) {
        throw new Error("找不到考試期");
      }
      if (!ticks.reminders[periodId]) ticks.reminders[periodId] = {};
      ticks.reminders[periodId][taskKey] = stamp;
    }

    await persistTicks(ticks);
    return mergeSourceAndTicks(source, ticks);
  });
}
