"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ActivityWeekGrid } from "@/components/ActivityWeekGrid";
import { activitiesForDate, constraintLines } from "@/lib/activity-week-conflicts";
import { AW_REG_PATH } from "@/lib/activity-week-reg";
import {
  activityDays,
  defaultDay,
  formatDayLabel,
  suggestPlacements,
} from "@/lib/activity-week-grid";
import { CANDIDATES, P1_THEATRE_NOTE } from "@/lib/activity-week-planning";
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
  const [queryDate, setQueryDate] = useState(defaultDay());
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
    () => activitiesForDate(date, entries, placements),
    [entries, placements, date],
  );
  const unplaced = dayEntries.filter(
    (e) => !placements.some((p) => p.entryId === e.id && p.date === date),
  );
  const armed = entries.find((e) => e.id === armedId) ?? null;
  const dayRules = constraintLines(date);
  const dateInList = DAYS.some((d) => d.date === date);

  function runQuery(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
      setError("請揀日期");
      return;
    }
    setError(null);
    setDate(queryDate);
    setArmedId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-end gap-3">
        <a href={AW_REG_PATH} className="btn-primary">
          同事登記入口
        </a>
      </div>

      <section className="section-block space-y-3">
        <h2 className="section-title">某日有冇活動</h2>
        <form className="flex flex-wrap items-end gap-3" onSubmit={runQuery}>
          <label className="text-base font-medium text-[var(--brand-ink)]">
            日期
            <input
              type="date"
              className="field mt-1 min-w-[12rem] text-lg"
              value={queryDate}
              onChange={(e) => setQueryDate(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn-primary px-6 py-2.5 text-base">
            查詢
          </button>
        </form>
        <h3 className="font-display text-xl font-bold text-[var(--brand-ink)]">{formatDayLabel(date)}</h3>
        {dayEntries.length === 0 ? (
          <p className="text-lg font-semibold text-[var(--brand-ink)]">該日暫無活動</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--brand-line)] bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--brand-soft)] text-[var(--brand-ink)]">
                <tr>
                  {["活動", "節", "場地", "對象", "負責", "Hold"].map((label) => (
                    <th key={label} className="px-3 py-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dayEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-[var(--brand-line)] align-top">
                    <td className="px-3 py-2 font-medium">{entry.title}</td>
                    <td className="px-3 py-2">{entry.periods.length ? entry.periods.join("、") : "—"}</td>
                    <td className="px-3 py-2">{entry.venue || "—"}</td>
                    <td className="px-3 py-2">{entry.audience || "—"}</td>
                    <td className="px-3 py-2">{entry.owner || "—"}</td>
                    <td className="px-3 py-2">{entry.hold ? "是" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="section-block space-y-3">
        <h2 className="section-title">排程</h2>
        <label className="text-sm font-medium text-[var(--brand-ink)]">
          日子
          <select
            className="field mt-1"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setQueryDate(e.target.value);
              setArmedId(null);
            }}
          >
            {!dateInList ? <option value={date}>{formatDayLabel(date)}</option> : null}
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
        {dayRules.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-950">
            {dayRules.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {armed ? (
          <p className="text-sm font-medium text-[var(--brand-ink)]">排入中：{armed.title}</p>
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
        </div>
        {unplaced.length ? (
          <p className="text-sm font-medium text-[var(--brand-ink)]">
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

      <section className="section-block space-y-2">
        <h2 className="section-title">候選（未確認，唔排入時間表）</h2>
        <p className="text-sm text-[var(--brand-ink)]">{P1_THEATRE_NOTE}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--brand-ink)]">
          {CANDIDATES.map((item) => (
            <li key={item.title}>
              <span className="font-medium">{item.title}</span>
              <span className="text-[var(--brand-muted)]">
                {" "}
                · {item.audience} · {item.note}
              </span>
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
