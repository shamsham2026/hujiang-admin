import { promises as fs } from "fs";
import path from "path";
import { get, put } from "@vercel/blob";
import {
  ACTIVITY_WEEK_SEED,
  type ActivitySeedItem,
} from "./activity-week-seed";

export type ActivityWeekSubmission = {
  id: string;
  title: string;
  dateOrWindow: string;
  periods: string[];
  venue: string;
  audience: string;
  owner: string;
  hold: boolean;
  notes: string;
  submittedAt: string;
  submitterName?: string;
  track?: string;
};

/** Full-row override. Seed and platform rows stay intact so 還原此列 can undo. */
export type ActivityRevision = {
  title: string;
  dateOrWindow: string;
  periods: string[];
  venue: string;
  audience: string;
  owner: string;
  hold: boolean;
  notes: string;
  track?: string;
  revisedAt: string;
};

export type ActivityFields = {
  title: string;
  dateOrWindow: string;
  periods: string[];
  venue: string;
  audience: string;
  owner: string;
  hold: boolean;
  notes: string;
  track?: string;
};

type StoreShape = {
  submissions: ActivityWeekSubmission[];
  revisions: Record<string, ActivityRevision>;
  updatedAt: string;
};

export type ActivityWeekView = {
  submissions: ActivityWeekSubmission[];
  seed: ActivitySeedItem[];
  revisions: Record<string, ActivityRevision>;
  persistence: "blob" | "local-json";
};

const LOCAL_PATH = path.join(process.cwd(), "data", "activity-week-subs.json");
const BLOB_PATHNAME = "hujiang-admin/activity-week-subs.json";

declare global {
  var __hujiangAwSubs: StoreShape | undefined;
  var __hujiangAwSubsLock: Promise<void> | undefined;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function persistenceMode(): "blob" | "local-json" {
  return hasBlob() ? "blob" : "local-json";
}

function emptyStore(): StoreShape {
  return {
    submissions: [],
    revisions: {},
    updatedAt: new Date().toISOString(),
  };
}

function isStore(v: unknown): v is StoreShape {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.submissions)) return false;
  if (o.revisions !== undefined) {
    if (!o.revisions || typeof o.revisions !== "object" || Array.isArray(o.revisions)) {
      return false;
    }
  }
  return true;
}

function normalize(store: StoreShape): StoreShape {
  return {
    submissions: store.submissions.map((s) => ({
      ...s,
      periods: Array.isArray(s.periods) ? s.periods : [],
    })),
    revisions:
      store.revisions && typeof store.revisions === "object" ? store.revisions : {},
    updatedAt: store.updatedAt || new Date().toISOString(),
  };
}

async function readLocal(): Promise<StoreShape | null> {
  try {
    const raw = await fs.readFile(LOCAL_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return isStore(parsed) ? normalize(parsed) : null;
  } catch {
    return null;
  }
}

async function writeLocal(store: StoreShape): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function readBlob(): Promise<unknown | null> {
  if (!hasBlob()) return null;
  try {
    const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
    if (!result?.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function writeBlob(store: StoreShape): Promise<void> {
  if (!hasBlob()) return;
  await put(BLOB_PATHNAME, JSON.stringify(store, null, 2), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function load(): Promise<StoreShape> {
  if (globalThis.__hujiangAwSubs) return clone(globalThis.__hujiangAwSubs);
  const fromBlob = await readBlob();
  if (isStore(fromBlob)) {
    const normalized = normalize(fromBlob);
    globalThis.__hujiangAwSubs = normalized;
    return clone(normalized);
  }
  const fromLocal = await readLocal();
  if (fromLocal) {
    globalThis.__hujiangAwSubs = fromLocal;
    return clone(fromLocal);
  }
  const fresh = emptyStore();
  globalThis.__hujiangAwSubs = fresh;
  await persist(fresh);
  return clone(fresh);
}

async function persist(store: StoreShape): Promise<void> {
  store.updatedAt = new Date().toISOString();
  store.revisions = store.revisions ?? {};
  globalThis.__hujiangAwSubs = clone(store);
  if (hasBlob()) await writeBlob(store);
  else await writeLocal(store);
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = globalThis.__hujiangAwSubsLock ?? Promise.resolve();
  let release!: () => void;
  globalThis.__hujiangAwSubsLock = new Promise<void>((r) => {
    release = r;
  });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

function applyRevision<T extends ActivityFields>(base: T, rev?: ActivityRevision): T {
  if (!rev) return base;
  return {
    ...base,
    title: rev.title,
    dateOrWindow: rev.dateOrWindow,
    periods: [...rev.periods],
    venue: rev.venue,
    audience: rev.audience,
    owner: rev.owner,
    hold: rev.hold,
    notes: rev.notes,
    track: rev.track ?? base.track,
  };
}

function viewOf(store: StoreShape): ActivityWeekView {
  const revisions = store.revisions ?? {};
  return {
    persistence: persistenceMode(),
    revisions: clone(revisions),
    seed: ACTIVITY_WEEK_SEED.seed.map((item) =>
      applyRevision(item, revisions[item.id]),
    ),
    submissions: store.submissions.map((item) =>
      applyRevision(item, revisions[item.id]),
    ),
  };
}

export function knownIds(store: StoreShape): Set<string> {
  return new Set([
    ...ACTIVITY_WEEK_SEED.seed.map((s) => s.id),
    ...store.submissions.map((s) => s.id),
  ]);
}

export function normalizeFields(input: Partial<ActivityFields>): ActivityFields {
  const periods = Array.isArray(input.periods)
    ? input.periods.map((p) => String(p).trim()).filter(Boolean)
    : [];
  return {
    title: (input.title ?? "").trim(),
    dateOrWindow: (input.dateOrWindow ?? "").trim(),
    periods,
    venue: (input.venue ?? "").trim(),
    audience: (input.audience ?? "").trim(),
    owner: (input.owner ?? "").trim(),
    hold: Boolean(input.hold),
    notes: (input.notes ?? "").trim(),
    track: (input.track ?? "").trim(),
  };
}

export async function getActivityWeekView(): Promise<ActivityWeekView> {
  return withLock(async () => viewOf(await load()));
}

export async function addSubmission(
  input: ActivityFields & { submitterName?: string },
): Promise<ActivityWeekView> {
  return withLock(async () => {
    const store = await load();
    const fields = normalizeFields(input);
    if (!fields.title) throw new Error("請填活動名稱");
    if (!fields.dateOrWindow) throw new Error("請填日期／窗口");
    const row: ActivityWeekSubmission = {
      id: `sub-${crypto.randomUUID()}`,
      ...fields,
      track: fields.track || undefined,
      submittedAt: new Date().toISOString(),
      submitterName: input.submitterName?.trim() || undefined,
    };
    store.submissions.push(row);
    await persist(store);
    return viewOf(store);
  });
}

export async function deleteSubmission(id: string): Promise<ActivityWeekView> {
  return withLock(async () => {
    const store = await load();
    const before = store.submissions.length;
    store.submissions = store.submissions.filter((s) => s.id !== id);
    if (store.submissions.length === before) throw new Error("找不到此平台提交");
    if (store.revisions[id]) delete store.revisions[id];
    await persist(store);
    return viewOf(store);
  });
}

export async function saveRevision(
  id: string,
  input: Partial<ActivityFields>,
): Promise<ActivityWeekView> {
  return withLock(async () => {
    const store = await load();
    if (!knownIds(store).has(id)) throw new Error("找不到此活動");
    const fields = normalizeFields(input);
    store.revisions[id] = {
      ...fields,
      track: fields.track || undefined,
      revisedAt: new Date().toISOString(),
    };
    await persist(store);
    return viewOf(store);
  });
}

export async function restoreRevision(id: string): Promise<ActivityWeekView> {
  return withLock(async () => {
    const store = await load();
    if (!knownIds(store).has(id)) throw new Error("找不到此活動");
    delete store.revisions[id];
    await persist(store);
    return viewOf(store);
  });
}

export async function restoreAllRevisions(): Promise<ActivityWeekView> {
  return withLock(async () => {
    const store = await load();
    store.revisions = {};
    await persist(store);
    return viewOf(store);
  });
}
