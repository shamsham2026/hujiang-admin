"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ActivityWeekGrid } from "@/components/ActivityWeekGrid";
import { constraintLines, parseDateOrWindow } from "@/lib/activity-week-conflicts";
import { AW_REG_PATH } from "@/lib/activity-week-reg";
import {
  activityDays,
  defaultDay,
  suggestPlacements,
} from "@/lib/activity-week-grid";
import { ACTIVITY_WEEK_SEED } from "@/lib/activity-week-seed";
import type { ActivityEntry, ActivityPlacement } from "@/lib/activity-week-types";

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

type Payload = {
  entries?: ActivityEntry[];
  placements?: ActivityPlacement[];
  error?: string;
};

const DAYS = activityDays();
const GROUPS = [...new Set(DAYS.map((d) => d.group))];

export function ActivityWeekClient() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [placements, setPlacements] = useState<ActivityPlacement[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(defaultDay());
  const [armedId, setArmedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ActivityEntry | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);

  const apply = useCallback((data: Payload) => {
    setEntries(data.entries ?? []);
    setPlacements(data.placements ?? []);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/activity-week/subs", { cache: "no-store" });
      const data = (await res.json()) as Payload;
      if (!res.ok) throw new Error(data.error ?? "載入失敗");
      if (!data.entries) throw new Error("未登入");
      apply(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setReady(true);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/activity-week/subs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Payload;
      if (!res.ok) throw new Error(data.error ?? "儲存失敗");
      apply(data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function removeSubmission(id: string) {
    if (!confirm("確定刪除此平台提交？")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/activity-week/subs?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as Payload;
      if (!res.ok) throw new Error(data.error ?? "刪除失敗");
      apply(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除失敗");
    } finally {
      setBusy(false);
    }
  }

  function reload() {
    if (dirty) {
      const ok = confirm("有未儲存的修訂。重新載入會捨棄畫面上未儲存的內容，已儲存的修訂會保留。");
      if (!ok) return;
    }
    setEditing(null);
    setDraft(null);
    setDirty(false);
    void load();
  }

  function openEdit(entry: ActivityEntry) {
    setEditing(entry);
    setDraft({
      title: entry.title,
      dateOrWindow: entry.dateOrWindow,
      periods: entry.periods.join("、"),
      venue: entry.venue,
      audience: entry.audience,
      owner: entry.owner,
      hold: entry.hold,
      notes: entry.notes,
      track: entry.track,
    });
    setDirty(false);
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing || !draft) return;
    const ok = await mutate({
      action: editing.builtin ? "revise" : "updateSubmission",
      id: editing.id,
      ...draft,
    });
    if (ok) {
      setEditing(null);
      setDraft(null);
      setDirty(false);
    }
  }

  async function restore(entry: ActivityEntry) {
    if (!confirm("還原此內建項目到原本資料？已儲存的修訂會清除，時間表排位會保留。")) return;
    await mutate({ action: "restore", id: entry.id });
  }

  async function place(entryId: string, classCode: string, period: string) {
    await mutate({ action: "place", entryId, date, classCode, period });
  }

  async function unplace(id: string) {
    await mutate({ action: "unplace", id });
  }

  async function placeSuggested(entry: ActivityEntry) {
    const cells = suggestPlacements(entry);
    if (!cells.length) {
      setError("節數或對象未定，請先修訂，或者手動揀格。");
      return;
    }
    const ok = await mutate({ action: "placeMany", entryId: entry.id, date, cells });
    if (ok) setArmedId(null);
  }

  const submissions = entries.filter((e) => e.source === "platform");
  const dayEntries = useMemo(
    () => entries.filter((e) => parseDateOrWindow(e.dateOrWindow).includes(date)),
    [entries, date],
  );
  const unplaced = dayEntries.filter(
    (e) => !placements.some((p) => p.entryId === e.id && p.date === date),
  );
  const armed = entries.find((e) => e.id === armedId) ?? null;
  const dayRules = constraintLines(date);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--brand-ink)]">活動週安排</h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            上學期 1/4–8｜下學期 6/16–7/8｜期考後 12/16–18、21。7/9 結業禮唔排活動。
          </p>
        </div>
        <a href={AW_REG_PATH} className="btn-primary">
          同事登記入口
        </a>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="section-block space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="text-sm">
            <span className="text-[var(--brand-muted)]">邊一日</span>
            <select
              className="field mt-1"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            >
              {GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {DAYS.filter((d) => d.group === group).map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="max-w-xl text-xs leading-relaxed text-[var(--brand-muted)]">
            先撳節目「排入」再撳格子，或者拖入格子。同一格再撳個節目就可以移走。C 有蓋操場、B
            籃球場、E 飲食區、H 禮堂、106 室；沒註明場地＝課室。C1 教師持咪、〈教師〉主持、（教師）統籌。
          </p>
        </div>
        {dayRules.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-950">
            {dayRules.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {armed ? (
          <p className="text-sm font-medium text-[var(--brand-ink)]">
            排入中：{armed.title}。撳格子放下，或者再撳一次「排入」取消。
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {dayEntries.map((entry) => {
            const placed = placements.some((p) => p.entryId === entry.id && p.date === date);
            return (
              <div
                key={entry.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/aw-entry", entry.id);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                className={`flex items-center gap-2 rounded-full border px-2 py-1 text-xs ${
                  armedId === entry.id
                    ? "border-[var(--brand-accent)] bg-[var(--brand-soft)]"
                    : "border-[var(--brand-line)] bg-white"
                }`}
              >
                <span className="font-medium">{entry.title}</span>
                <span className="text-[var(--brand-muted)]">{placed ? "已排" : "未排入"}</span>
                <button
                  type="button"
                  className="btn-secondary px-2 py-0.5 text-xs"
                  onClick={() => setArmedId((cur) => (cur === entry.id ? null : entry.id))}
                >
                  排入
                </button>
                <button
                  type="button"
                  className="btn-secondary px-2 py-0.5 text-xs"
                  disabled={busy}
                  onClick={() => void placeSuggested(entry)}
                >
                  按對象排入
                </button>
              </div>
            );
          })}
          {dayEntries.length === 0 ? (
            <p className="text-sm text-[var(--brand-muted)]">呢日未有已知或已提交節目。</p>
          ) : null}
        </div>
        {unplaced.length ? (
          <p className="text-xs text-[var(--brand-muted)]">
            未排入：{unplaced.map((e) => e.title).join("、")}
          </p>
        ) : null}
        <ActivityWeekGrid
          date={date}
          entries={entries}
          placements={placements}
          armedId={armedId}
          onPlace={(entryId, classCode, period) => void place(entryId, classCode, period)}
          onUnplace={(id) => void unplace(id)}
        />
      </section>

      <section className="section-block space-y-2">
        <h2 className="section-title">硬性約束</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--brand-ink)]">
          {ACTIVITY_WEEK_SEED.constraints.map((rule) => (
            <li key={rule.date}>
              <span className="font-medium">{rule.date}</span>：{rule.rule}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title mb-0">
            已知／平台提交（{ready ? entries.length : "…"}；提交 {submissions.length}）
          </h2>
          <button type="button" className="btn-secondary text-xs" onClick={reload} disabled={!ready || busy}>
            重新載入
          </button>
        </div>
        <p className="text-xs text-[var(--brand-muted)]">
          重新載入只會再讀已儲存資料，唔會清走修訂。內建項目可逐項還原。
        </p>
        <div className="overflow-x-auto rounded-xl border border-[var(--brand-line)] bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[var(--brand-soft)] text-[var(--brand-muted)]">
              <tr>
                {["來源", "日期／窗口", "活動", "對象", "場地", "節", "負責", "Hold", "備註", ""].map(
                  (label) => (
                    <th key={label || "act"} className="px-3 py-2">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-[var(--brand-line)] align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--brand-muted)]">
                    {entry.source === "platform" ? "平台提交" : "內建"}
                    {entry.revised ? <span className="mt-0.5 block text-[var(--brand-accent)]">已修訂</span> : null}
                    {entry.submittedAt ? (
                      <span className="mt-0.5 block">{entry.submittedAt.slice(0, 16).replace("T", " ")}</span>
                    ) : null}
                    {entry.submitterName ? <span className="mt-0.5 block">{entry.submitterName}</span> : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {entry.dateOrWindow || "—"}
                    {entry.track ? (
                      <span className="mt-0.5 block text-xs text-[var(--brand-muted)]">{entry.track}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-medium">{entry.title}</td>
                  <td className="px-3 py-2">{entry.audience || "—"}</td>
                  <td className="px-3 py-2">{entry.venue || "—"}</td>
                  <td className="px-3 py-2">{entry.periods.length ? entry.periods.join("、") : "—"}</td>
                  <td className="px-3 py-2">{entry.owner || "—"}</td>
                  <td className="px-3 py-2">{entry.hold ? "是" : "—"}</td>
                  <td className="px-3 py-2 text-[var(--brand-muted)]">{entry.notes || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <button type="button" className="btn-secondary text-xs" onClick={() => openEdit(entry)}>
                        修訂
                      </button>
                      {entry.builtin && entry.revised ? (
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={busy}
                          onClick={() => void restore(entry)}
                        >
                          還原
                        </button>
                      ) : null}
                      {entry.source === "platform" ? (
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={busy}
                          onClick={() => void removeSubmission(entry.id)}
                        >
                          刪
                        </button>
                      ) : entry.revised ? null : (
                        <span className="text-xs text-[var(--brand-muted)]">內建</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && draft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            className="section-block max-h-[90vh] w-full max-w-lg space-y-3 overflow-auto bg-white"
            onSubmit={saveEdit}
          >
            <h2 className="font-display text-xl font-bold text-[var(--brand-ink)]">
              修訂{editing.builtin ? "內建" : "平台提交"}：{editing.title}
            </h2>
            <Field label="活動" value={draft.title} onChange={(title) => patchDraft(setDraft, setDirty, { title })} />
            <Field
              label="日期／窗口"
              value={draft.dateOrWindow}
              onChange={(dateOrWindow) => patchDraft(setDraft, setDirty, { dateOrWindow })}
            />
            <Field
              label="對象"
              value={draft.audience}
              onChange={(audience) => patchDraft(setDraft, setDirty, { audience })}
            />
            <Field label="場地" value={draft.venue} onChange={(venue) => patchDraft(setDraft, setDirty, { venue })} />
            <Field
              label="節"
              value={draft.periods}
              onChange={(periods) => patchDraft(setDraft, setDirty, { periods })}
              placeholder="第1節、第2節 或 全日"
            />
            <Field label="負責" value={draft.owner} onChange={(owner) => patchDraft(setDraft, setDirty, { owner })} />
            <Field label="軌／窗口" value={draft.track} onChange={(track) => patchDraft(setDraft, setDirty, { track })} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--brand-accent)]"
                checked={draft.hold}
                onChange={(e) => patchDraft(setDraft, setDirty, { hold: e.target.checked })}
              />
              Hold
            </label>
            <label className="block text-sm">
              <span className="text-[var(--brand-muted)]">備註</span>
              <textarea
                className="field mt-1 min-h-[88px] w-full"
                value={draft.notes}
                onChange={(e) => patchDraft(setDraft, setDirty, { notes: e.target.value })}
              />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={busy}>
                儲存
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditing(null);
                  setDraft(null);
                  setDirty(false);
                }}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function patchDraft(
  setDraft: (value: Draft | null | ((cur: Draft | null) => Draft | null)) => void,
  setDirty: (value: boolean) => void,
  patch: Partial<Draft>,
) {
  setDirty(true);
  setDraft((cur) => (cur ? { ...cur, ...patch } : cur));
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--brand-muted)]">{label}</span>
      <input
        className="field mt-1 w-full"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
