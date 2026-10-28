import { promises as fs } from "fs";
import path from "path";
import { splitList } from "./activity-week-conflicts";
import { friendlyGitHubError, githubStore, githubStoreEnabled } from "./github-store";
import {
  alignStoredPlacements,
  isClassCode,
  isTeachingPeriod,
} from "./activity-week-grid";
import { ACTIVITY_WEEK_SEED } from "./activity-week-seed";
import type {
  ActivityEntry,
  ActivityPlacement,
  ActivityRevision,
  ActivitySubmission,
  ConflictItem,
} from "./activity-week-types";

/**
 * 呢個 store 同一個 GitHub 檔案俾兩個 project 共用：
 * 公開登記站（sap-activity-week）同埋呢個管理平台都寫 `activity-week/subs.json`。
 *
 * 所以每次寫入之前一定要重新讀最新版本，
 * 否則會蓋咗對方啱啱改咗嘅內容（例如同事啱啱提交嘅登記）。
 */

type StoreShape = {
  submissions: ActivitySubmission[];
  revisions: Record<string, ActivityRevision>;
  placements: ActivityPlacement[];
  placementsSeeded: boolean;
  updatedAt: string;
};

const LOCAL_PATH = path.join(process.cwd(), "data", "activity-week-subs.json");
/** Same Cover store repo, dedicated path already used on Production. */
const META_PATHNAME = "activity-week/subs.json";

declare global {
  var __hujiangAwSha: string | null | undefined;
  var __hujiangAwSubsLock: Promise<void> | undefined;
}

function emptyStore(): StoreShape {
  return {
    submissions: [],
    revisions: {},
    placements: [],
    placementsSeeded: false,
    updatedAt: new Date().toISOString(),
  };
}

function isStore(v: unknown): v is Partial<StoreShape> & { submissions: unknown } {
  if (!v || typeof v !== "object") return false;
  return Array.isArray((v as { submissions?: unknown }).submissions);
}

function normalize(raw: Partial<StoreShape>): StoreShape {
  const revisions =
    raw.revisions && typeof raw.revisions === "object" && !Array.isArray(raw.revisions)
      ? raw.revisions
      : {};
  return {
    submissions: Array.isArray(raw.submissions) ? raw.submissions : [],
    revisions,
    placements: Array.isArray(raw.placements) ? raw.placements : [],
    placementsSeeded: Boolean(raw.placementsSeeded),
    updatedAt: raw.updatedAt || new Date().toISOString(),
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

async function readGithub(): Promise<{ store: StoreShape; sha: string } | null> {
  if (!githubStoreEnabled()) return null;
  const file = await githubStore.read(META_PATHNAME);
  if (!file) return null;
  const parsed = JSON.parse(file.text) as unknown;
  if (!isStore(parsed)) return null;
  return { store: normalize(parsed), sha: file.sha };
}

async function writeGithub(store: StoreShape, sha: string | null): Promise<string> {
  return githubStore.write(
    META_PATHNAME,
    JSON.stringify(store, null, 2),
    sha,
    "update activity-week/subs.json",
  );
}

/**
 * 寫入 GitHub store。
 *
 * 撞到 409（有人喺我哋讀取之後改咗個檔）就直接擲返出嚟，
 * 由 `mutate()` 重讀最新版本再重新套用同一個改動。
 *
 * 之前呢度會自己攞住一份舊 snapshot 重試寫入，
 * 咁樣會蓋咗公開登記站啱啱寫入嘅另一筆登記。
 */
async function persist(store: StoreShape): Promise<void> {
  store.updatedAt = new Date().toISOString();
  if (githubStoreEnabled()) {
    globalThis.__hujiangAwSha = await writeGithub(store, globalThis.__hujiangAwSha ?? null);
  } else if (process.env.VERCEL) {
    throw new Error("GitHub store 未設定（GITHUB_STORE_TOKEN）");
  } else {
    await writeLocal(store);
  }
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = globalThis.__hujiangAwSubsLock ?? Promise.resolve();
  let release!: () => void;
  globalThis.__hujiangAwSubsLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

/**
 * 每次都讀返 GitHub 最新版本。
 *
 * 唔會用記憶體快取，因為公開登記站隨時都會寫入同一個檔案；
 * 用快取嘅話，呢邊會一直睇到舊資料。
 */
async function load(): Promise<StoreShape> {
  if (githubStoreEnabled()) {
    const fromGithub = await readGithub();
    const store = fromGithub?.store ?? emptyStore();
    globalThis.__hujiangAwSha = fromGithub?.sha ?? null;
    return store;
  }
  return (await readLocal()) ?? emptyStore();
}

/**
 * 補返內建活動嘅預設排位。
 * 只係喺記憶體調整，唔會自己寫檔；真正寫入由 `mutate()` 統一處理。
 */
function alignSeededPlacements(store: StoreShape): boolean {
  const aligned = alignStoredPlacements(store.placements, store.revisions);
  store.placements = aligned.placements;
  const needWrite = aligned.changed || !store.placementsSeeded;
  store.placementsSeeded = true;
  return needWrite;
}

/**
 * 改資料嘅統一入口：每次都重讀最新版本，套用改動，再寫返。
 *
 * 公開登記站（sap-activity-week）同管理平台都寫同一個 GitHub store 檔，
 * 所以唔可以攞住一份舊 snapshot 就成份寫返去，
 * 否則會蓋咗另一邊啱啱登記／修改嘅內容。
 *
 * 如果寫入時撞到人改（409），就重讀最新版本再重新套用同一個改動。
 */
async function mutate<T>(apply: (store: StoreShape) => T | Promise<T>): Promise<T> {
  if (!githubStoreEnabled()) {
    const store = await load();
    alignSeededPlacements(store);
    const result = await apply(store);
    await persist(store);
    return result;
  }
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    // 每次都重讀，確保改動係基於最新版本。
    const store = await load();
    alignSeededPlacements(store);
    const result = await apply(store);
    try {
      await persist(store);
      return result;
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number }).status;
      if (status !== 409) throw new Error(friendlyGitHubError(err));
      // 有其他人喺我哋寫入之前改咗個檔：下一輪重讀再套用同一個改動。
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("GitHub store 寫入衝突，請稍後再試");
}

export function persistenceMode(): "github" | "local-json" {
  return githubStoreEnabled() ? "github" : "local-json";
}

export type EditablePatch = {
  title?: string;
  dateOrWindow?: string;
  periods?: string[] | string;
  venue?: string;
  audience?: string;
  owner?: string;
  /** PDF 表格「科任、活動時長」入面嘅科任老師。 */
  subjectTeachers?: string;
  hold?: boolean;
  notes?: string;
  track?: string;
};

function asPeriods(value: string[] | string | undefined, fallback: string[]): string[] {
  if (Array.isArray(value)) return value.map((p) => p.trim()).filter(Boolean);
  if (typeof value === "string") return splitList(value);
  return fallback;
}

function revisionFrom(seed: (typeof ACTIVITY_WEEK_SEED.seed)[number], patch: EditablePatch): ActivityRevision {
  return {
    title: (patch.title ?? seed.title).trim(),
    dateOrWindow: (patch.dateOrWindow ?? seed.dateOrWindow).trim(),
    periods: asPeriods(patch.periods, seed.periods),
    venue: (patch.venue ?? seed.venue).trim(),
    audience: (patch.audience ?? seed.audience).trim(),
    owner: (patch.owner ?? seed.owner).trim(),
    subjectTeachers: (patch.subjectTeachers ?? "").trim(),
    hold: patch.hold ?? seed.hold,
    notes: (patch.notes ?? seed.notes).trim(),
    track: (patch.track ?? seed.track).trim(),
    updatedAt: new Date().toISOString(),
  };
}

export function mergeEntries(store: StoreShape): ActivityEntry[] {
  const builtins: ActivityEntry[] = ACTIVITY_WEEK_SEED.seed.map((seed) => {
    const rev = store.revisions[seed.id];
    if (!rev) {
      return {
        ...seed,
        subjectTeachers: "",
        source: "seed",
        revised: false,
      };
    }
    return {
      id: seed.id,
      title: rev.title,
      dateOrWindow: rev.dateOrWindow,
      periods: rev.periods,
      venue: rev.venue,
      audience: rev.audience,
      owner: rev.owner,
      subjectTeachers: rev.subjectTeachers ?? "",
      hold: rev.hold,
      notes: rev.notes,
      track: rev.track,
      builtin: true,
      source: "seed",
      revised: true,
    };
  });
  const submitted: ActivityEntry[] = store.submissions.map((sub) => ({
    id: sub.id,
    title: sub.title,
    dateOrWindow: sub.dateOrWindow,
    periods: sub.periods ?? [],
    venue: sub.venue ?? "",
    audience: sub.audience ?? "",
    owner: sub.owner ?? "",
    subjectTeachers: sub.subjectTeachers ?? "",
    hold: Boolean(sub.hold),
    notes: sub.notes ?? "",
    track: sub.track ?? "",
    builtin: false,
    source: "platform",
    revised: false,
    submittedAt: sub.submittedAt,
    submitterName: sub.submitterName,
  }));
  return [...builtins, ...submitted];
}

export function toConflictItem(entry: ActivityEntry): ConflictItem {
  return {
    id: entry.id,
    title: entry.title,
    dateOrWindow: entry.dateOrWindow,
    periods: entry.periods,
    venue: entry.venue,
    hold: entry.hold,
  };
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getActivityState() {
  return withLock(async () => {
    const store = await load();
    // 補預設排位：只喺真係需要時先寫一次，唔好每次讀取都改檔。
    if (alignSeededPlacements(store)) {
      try {
        await persist(store);
      } catch {
        // 寫入撞到人改：重讀最新版本，唔好用緊一份舊 snapshot
        // 覆蓋同事喺公開登記站啱啱提交嘅登記。
        const fresh = await load();
        return {
          store: fresh,
          entries: mergeEntries(fresh),
          persistence: persistenceMode(),
        };
      }
    }
    return {
      store,
      entries: mergeEntries(store),
      persistence: persistenceMode(),
    };
  });
}

export async function addSubmission(input: EditablePatch & { submitterName?: string }) {
  const title = (input.title ?? "").trim();
  const dateOrWindow = (input.dateOrWindow ?? "").trim();
  const owner = (input.owner ?? "").trim();
  if (!title) throw new Error("請填活動名稱");
  if (!dateOrWindow) throw new Error("請填日期");
  if (!owner) throw new Error("請填負責老師");
  return withLock(async () => {
    // 每次都重讀最新版本，確保唔會蓋咗平台上啱啱新增／修改嘅登記。
    return mutate((store) => {
      const submission: ActivitySubmission = {
        id: uid("sub"),
        title,
        dateOrWindow,
        periods: asPeriods(input.periods, []),
        venue: (input.venue ?? "").trim(),
        audience: (input.audience ?? "").trim(),
        owner,
        subjectTeachers: (input.subjectTeachers ?? "").trim(),
        hold: Boolean(input.hold),
        notes: (input.notes ?? "").trim(),
        track: (input.track ?? "").trim() || undefined,
        submittedAt: new Date().toISOString(),
        submitterName: input.submitterName?.trim() || undefined,
      };
      store.submissions.unshift(submission);
      return submission;
    });
  });
}

export async function deleteSubmission(id: string) {
  return withLock(async () => {
    return mutate((store) => {
      const before = store.submissions.length;
      store.submissions = store.submissions.filter((s) => s.id !== id);
      if (store.submissions.length === before) throw new Error("找不到呢項平台提交");
      store.placements = store.placements.filter((p) => p.entryId !== id);
      return mergeEntries(store);
    });
  });
}

export async function reviseBuiltin(id: string, patch: EditablePatch) {
  const seed = ACTIVITY_WEEK_SEED.seed.find((s) => s.id === id);
  if (!seed) throw new Error("呢項唔係內建活動");
  const title = (patch.title ?? seed.title).trim();
  const dateOrWindow = (patch.dateOrWindow ?? seed.dateOrWindow).trim();
  if (!title) throw new Error("請填活動名稱");
  if (!dateOrWindow) throw new Error("請填日期");
  return withLock(async () => {
    return mutate((store) => {
      store.revisions[id] = revisionFrom(seed, { ...patch, title, dateOrWindow });
      return mergeEntries(store);
    });
  });
}

export async function restoreBuiltin(id: string) {
  if (!ACTIVITY_WEEK_SEED.seed.some((s) => s.id === id)) {
    throw new Error("呢項唔係內建活動");
  }
  return withLock(async () => {
    return mutate((store) => {
      delete store.revisions[id];
      return mergeEntries(store);
    });
  });
}

export async function updateSubmission(id: string, patch: EditablePatch) {
  return withLock(async () => {
    return mutate((store) => {
      const sub = store.submissions.find((s) => s.id === id);
      if (!sub) throw new Error("找不到呢項平台提交");
      const title = (patch.title ?? sub.title).trim();
      const dateOrWindow = (patch.dateOrWindow ?? sub.dateOrWindow).trim();
      const owner = (patch.owner ?? sub.owner).trim();
      if (!title) throw new Error("請填活動名稱");
      if (!dateOrWindow) throw new Error("請填日期");
      if (!owner) throw new Error("請填負責老師");
      sub.title = title;
      sub.dateOrWindow = dateOrWindow;
      sub.periods = asPeriods(patch.periods, sub.periods);
      sub.venue = (patch.venue ?? sub.venue).trim();
      sub.audience = (patch.audience ?? sub.audience).trim();
      sub.owner = owner;
      if (patch.subjectTeachers !== undefined) {
        sub.subjectTeachers = patch.subjectTeachers.trim();
      }
      sub.hold = patch.hold ?? sub.hold;
      sub.notes = (patch.notes ?? sub.notes).trim();
      sub.track = (patch.track ?? sub.track ?? "").trim() || undefined;
      return mergeEntries(store);
    });
  });
}

export async function placeEntry(entryId: string, date: string, classCode: string, period: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("日期格式唔啱");
  if (!isClassCode(classCode)) throw new Error("班別唔啱");
  if (!isTeachingPeriod(period)) throw new Error("只可以排入正課節");
  return withLock(async () => {
    return mutate((store) => {
      const known = mergeEntries(store).some((e) => e.id === entryId);
      if (!known) throw new Error("找不到呢個活動");
      const exists = store.placements.some(
        (p) =>
          p.entryId === entryId &&
          p.date === date &&
          p.classCode === classCode &&
          p.period === period,
      );
      if (!exists) {
        const placement: ActivityPlacement = {
          id: uid("plc"),
          entryId,
          date,
          classCode,
          period,
          updatedAt: new Date().toISOString(),
        };
        store.placements.push(placement);
      }
      return store.placements;
    });
  });
}

export async function placeMany(
  entryId: string,
  date: string,
  cells: { classCode: string; period: string }[],
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("日期格式唔啱");
  return withLock(async () => {
    return mutate((store) => {
      const known = mergeEntries(store).some((e) => e.id === entryId);
      if (!known) throw new Error("找不到呢個活動");
      for (const cell of cells) {
        if (!isClassCode(cell.classCode) || !isTeachingPeriod(cell.period)) continue;
        const exists = store.placements.some(
          (p) =>
            p.entryId === entryId &&
            p.date === date &&
            p.classCode === cell.classCode &&
            p.period === cell.period,
        );
        if (exists) continue;
        store.placements.push({
          id: uid("plc"),
          entryId,
          date,
          classCode: cell.classCode,
          period: cell.period,
          updatedAt: new Date().toISOString(),
        });
      }
      return store.placements;
    });
  });
}

export async function unplace(id: string) {
  return withLock(async () => {
    return mutate((store) => {
      const before = store.placements.length;
      store.placements = store.placements.filter((p) => p.id !== id);
      if (store.placements.length === before) throw new Error("找不到呢格");
      return store.placements;
    });
  });
}
