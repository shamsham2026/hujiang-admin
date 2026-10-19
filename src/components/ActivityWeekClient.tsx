"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ACTIVITY_WEEK_SEED } from "@/lib/activity-week-seed";

type ActivitySeedItem = (typeof ACTIVITY_WEEK_SEED.seed)[number];
import type {
  ActivityWeekSubmission,
  ActivityWeekView,
} from "@/lib/activity-week-store";

type Row = {
  id: string;
  title: string;
  dateOrWindow: string;
  periods: string[];
  venue: string;
  audience: string;
  owner: string;
  hold: boolean;
  notes: string;
  track?: string;
  source: "seed" | "platform";
  submittedAt?: string;
  submitterName?: string;
  revised: boolean;
};

type Draft = {
  title: string;
  dateOrWindow: string;
  periods: string;
  venue: string;
  audience: string;
  owner: string;
  hold: boolean;
  notes: string;
  track: string;
};

const EMPTY_VIEW: ActivityWeekView = {
  submissions: [],
  seed: ACTIVITY_WEEK_SEED.seed,
  revisions: {},
  persistence: "local-json",
};

function seedRow(item: ActivitySeedItem, revised: boolean): Row {
  return {
    id: item.id,
    title: item.title,
    dateOrWindow: item.dateOrWindow,
    periods: [...item.periods],
    venue: item.venue,
    audience: item.audience,
    owner: item.owner,
    hold: item.hold,
    notes: item.notes,
    track: item.track,
    source: "seed",
    revised,
  };
}

function subRow(item: ActivityWeekSubmission, revised: boolean): Row {
  return {
    id: item.id,
    title: item.title,
    dateOrWindow: item.dateOrWindow,
    periods: [...(item.periods ?? [])],
    venue: item.venue,
    audience: item.audience,
    owner: item.owner,
    hold: item.hold,
    notes: item.notes,
    track: item.track,
    source: "platform",
    submittedAt: item.submittedAt,
    submitterName: item.submitterName,
    revised,
  };
}

function draftFrom(row: Row): Draft {
  return {
    title: row.title,
    dateOrWindow: row.dateOrWindow,
    periods: row.periods.join("、"),
    venue: row.venue,
    audience: row.audience,
    owner: row.owner,
    hold: row.hold,
    notes: row.notes,
    track: row.track ?? "",
  };
}

function splitPeriods(raw: string): string[] {
  return raw
    .split(/[,，、]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function ActivityWeekClient() {
  const [view, setView] = useState<ActivityWeekView>(EMPTY_VIEW);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/activity-week/subs", { cache: "no-store" });
      const data = (await res.json()) as ActivityWeekView & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "載入失敗");
      setView({
        submissions: data.submissions ?? [],
        seed: data.seed?.length ? data.seed : ACTIVITY_WEEK_SEED.seed,
        revisions: data.revisions ?? {},
        persistence: data.persistence ?? "local-json",
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const revisions = view.revisions ?? {};
    const seedRows = (view.seed.length ? view.seed : ACTIVITY_WEEK_SEED.seed).map(
      (item) => seedRow(item, Boolean(revisions[item.id])),
    );
    const subRows = view.submissions.map((item) =>
      subRow(item, Boolean(revisions[item.id])),
    );
    return [...seedRows, ...subRows];
  }, [view]);

  const subCount = view.submissions.length;

  function openEdit(row: Row) {
    setEditing(row);
    setDraft(draftFrom(row));
    setErr(null);
  }

  function closeEdit() {
    setEditing(null);
    setDraft(null);
  }

  async function saveEdit() {
    if (!editing || !draft) return;
    setBusyId(editing.id);
    setErr(null);
    try {
      const res = await fetch("/api/activity-week/subs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          action: "save",
          title: draft.title,
          dateOrWindow: draft.dateOrWindow,
          periods: splitPeriods(draft.periods),
          venue: draft.venue,
          audience: draft.audience,
          owner: draft.owner,
          hold: draft.hold,
          notes: draft.notes,
          track: draft.track,
        }),
      });
      const data = (await res.json()) as ActivityWeekView & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "儲存失敗");
      setView(data);
      closeEdit();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setBusyId(null);
    }
  }

  async function restoreRow(id: string) {
    setBusyId(id);
    setErr(null);
    try {
      const res = await fetch("/api/activity-week/subs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "restore" }),
      });
      const data = (await res.json()) as ActivityWeekView & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "還原失敗");
      setView(data);
      if (editing?.id === id) closeEdit();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "還原失敗");
    } finally {
      setBusyId(null);
    }
  }

  async function restoreAll() {
    if (!confirm("確定還原全部修訂？內建列回到原本清單，平台提交回到提交時內容。")) {
      return;
    }
    setBusyId("*");
    setErr(null);
    try {
      const res = await fetch("/api/activity-week/subs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore-all" }),
      });
      const data = (await res.json()) as ActivityWeekView & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "還原失敗");
      setView(data);
      closeEdit();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "還原失敗");
    } finally {
      setBusyId(null);
    }
  }

  async function removeSub(id: string) {
    if (!confirm("確定刪除此平台提交？")) return;
    setBusyId(id);
    setErr(null);
    try {
      const res = await fetch(
        `/api/activity-week/subs?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as ActivityWeekView & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "刪除失敗");
      setView(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "刪除失敗");
    } finally {
      setBusyId(null);
    }
  }

  const revisedCount = Object.keys(view.revisions ?? {}).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--brand-ink)]">
          活動週安排
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          內建同平台提交都可以修訂。修訂存於
          {view.persistence === "blob" ? " Vercel Blob（跨裝置）" : " 本機 JSON"}
          ，重新載入唔會清走。
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">待料：活動週逐日完整時間表未齊</p>
      </div>

      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      <section className="section-block space-y-2">
        <h2 className="section-title">硬性約束</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--brand-ink)]">
          {ACTIVITY_WEEK_SEED.constraints.map((c) => (
            <li key={c.date}>
              <span className="font-medium">{c.date}</span>：{c.rule}
            </li>
          ))}
        </ul>
      </section>

      <section className="section-block space-y-2">
        <h2 className="section-title">節次樣板（樣本日參考）</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--brand-line)] text-[var(--brand-muted)]">
                <th className="py-1 pr-3">節</th>
                <th className="py-1">時間</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVITY_WEEK_SEED.periods.map((p) => (
                <tr key={p.name} className="border-b border-[var(--brand-line)]/60">
                  <td className="py-1 pr-3 font-medium">{p.name}</td>
                  <td className="py-1">
                    {p.start}–{p.end}
                    {p.note ? `（${p.note}）` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">
            已知／平台提交（{rows.length}
            {ready ? "" : "…"}；提交 {subCount}）
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {revisedCount > 0 ? (
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => void restoreAll()}
                disabled={!ready || busyId === "*"}
              >
                還原全部修訂
              </button>
            ) : null}
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => void load()}
              disabled={!ready}
            >
              重新載入
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--brand-muted)]">
          重新載入只更新清單，唔會清除已修訂。要返返原本內容，用「還原此列」。
        </p>
        <div className="overflow-x-auto rounded-xl border border-[var(--brand-line)] bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[var(--brand-soft)] text-[var(--brand-muted)]">
              <tr>
                <th className="px-3 py-2">來源</th>
                <th className="px-3 py-2">日期／窗口</th>
                <th className="px-3 py-2">活動</th>
                <th className="px-3 py-2">對象</th>
                <th className="px-3 py-2">場地</th>
                <th className="px-3 py-2">節</th>
                <th className="px-3 py-2">負責</th>
                <th className="px-3 py-2">Hold</th>
                <th className="px-3 py-2">備註</th>
                <th className="px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[var(--brand-line)] align-top"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--brand-muted)]">
                    {row.source === "platform" ? "平台提交" : "內建"}
                    {row.revised ? (
                      <span className="mt-0.5 block font-medium text-[var(--brand-accent)]">
                        已修訂
                      </span>
                    ) : null}
                    {row.submittedAt ? (
                      <span className="mt-0.5 block">
                        {row.submittedAt.slice(0, 16).replace("T", " ")}
                      </span>
                    ) : null}
                    {row.submitterName ? (
                      <span className="mt-0.5 block">{row.submitterName}</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.dateOrWindow || "—"}
                    {row.track ? (
                      <span className="mt-0.5 block text-xs text-[var(--brand-muted)]">
                        {row.track}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-medium">{row.title}</td>
                  <td className="px-3 py-2">{row.audience || "—"}</td>
                  <td className="px-3 py-2">{row.venue || "—"}</td>
                  <td className="px-3 py-2">
                    {row.periods.length ? row.periods.join("、") : "—"}
                  </td>
                  <td className="px-3 py-2">{row.owner || "—"}</td>
                  <td className="px-3 py-2">{row.hold ? "是" : "—"}</td>
                  <td className="px-3 py-2 text-[var(--brand-muted)]">
                    {row.notes || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      disabled={busyId === row.id}
                      onClick={() => openEdit(row)}
                    >
                      修訂
                    </button>
                    {row.revised ? (
                      <button
                        type="button"
                        className="btn-secondary ml-1 text-xs"
                        disabled={busyId === row.id}
                        onClick={() => void restoreRow(row.id)}
                      >
                        還原此列
                      </button>
                    ) : null}
                    {row.source === "platform" ? (
                      <button
                        type="button"
                        className="btn-secondary ml-1 text-xs"
                        disabled={busyId === row.id}
                        onClick={() => void removeSub(row.id)}
                      >
                        刪
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && draft ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="aw-edit-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--brand-line)] bg-white p-5 shadow-xl"
          >
            <h3
              id="aw-edit-title"
              className="font-display text-xl font-bold text-[var(--brand-ink)]"
            >
              修訂{editing.source === "seed" ? "內建" : "平台提交"}
            </h3>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">
              {editing.title}
            </p>
            <div className="mt-4 grid gap-3">
              <label className="text-sm">
                <span className="text-[var(--brand-muted)]">活動</span>
                <input
                  className="field mt-1 w-full"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--brand-muted)]">日期／窗口</span>
                <input
                  className="field mt-1 w-full"
                  value={draft.dateOrWindow}
                  onChange={(e) =>
                    setDraft({ ...draft, dateOrWindow: e.target.value })
                  }
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--brand-muted)]">窗口標籤</span>
                <input
                  className="field mt-1 w-full"
                  value={draft.track}
                  onChange={(e) => setDraft({ ...draft, track: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--brand-muted)]">對象</span>
                <input
                  className="field mt-1 w-full"
                  value={draft.audience}
                  onChange={(e) =>
                    setDraft({ ...draft, audience: e.target.value })
                  }
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--brand-muted)]">場地</span>
                <input
                  className="field mt-1 w-full"
                  value={draft.venue}
                  onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--brand-muted)]">節（用、分隔）</span>
                <input
                  className="field mt-1 w-full"
                  value={draft.periods}
                  onChange={(e) =>
                    setDraft({ ...draft, periods: e.target.value })
                  }
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--brand-muted)]">負責</span>
                <input
                  className="field mt-1 w-full"
                  value={draft.owner}
                  onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.hold}
                  onChange={(e) => setDraft({ ...draft, hold: e.target.checked })}
                />
                Hold
              </label>
              <label className="text-sm">
                <span className="text-[var(--brand-muted)]">備註</span>
                <textarea
                  className="field mt-1 w-full"
                  rows={3}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {editing.revised ? (
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  disabled={busyId === editing.id}
                  onClick={() => void restoreRow(editing.id)}
                >
                  還原此列
                </button>
              ) : null}
              <button type="button" className="btn-secondary text-xs" onClick={closeEdit}>
                取消
              </button>
              <button
                type="button"
                className="btn-primary text-xs"
                disabled={busyId === editing.id}
                onClick={() => void saveEdit()}
              >
                儲存修訂
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
