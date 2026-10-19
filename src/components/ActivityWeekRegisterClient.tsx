"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { regWarnings, splitList } from "@/lib/activity-week-conflicts";
import { ACTIVITY_WEEK_SEED } from "@/lib/activity-week-seed";
import type { ConflictItem } from "@/lib/activity-week-types";

const PERIOD_OPTS = [
  ...ACTIVITY_WEEK_SEED.periods.map((p) => p.name),
  "全日",
  "頭三節",
];

const VENUE_OPTS = ACTIVITY_WEEK_SEED.venues.map((v) =>
  v.code ? `${v.code} ${v.name}` : v.name,
);

const EMPTY = {
  title: "",
  dateOrWindow: "",
  periods: "",
  venue: "",
  audience: "",
  owner: "",
  hold: false,
  notes: "",
  submitterName: "",
};

export function ActivityWeekRegisterClient() {
  const [form, setForm] = useState(EMPTY);
  const [agreed, setAgreed] = useState(false);
  const [known, setKnown] = useState<ConflictItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/activity-week/subs", { cache: "no-store" });
      const data = (await res.json()) as {
        seed?: ConflictItem[];
        submissions?: ConflictItem[];
      };
      const seed = (data.seed ?? []).map((item) => ({
        ...item,
        periods: item.periods ?? [],
        venue: item.venue ?? "",
      }));
      const submissions = (data.submissions ?? []).map((item) => ({
        ...item,
        periods: item.periods ?? [],
        venue: item.venue ?? "",
      }));
      setKnown([...seed, ...submissions]);
    } catch {
      setKnown(
        ACTIVITY_WEEK_SEED.seed.map((item) => ({
          id: item.id,
          title: item.title,
          dateOrWindow: item.dateOrWindow,
          periods: [...item.periods],
          venue: item.venue,
          hold: item.hold,
        })),
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const warnings = useMemo(
    () => regWarnings(form.dateOrWindow, known),
    [form.dateOrWindow, known],
  );
  const showWarnings =
    warnings.conflicts.length > 0 || warnings.hallFull || warnings.constraints.length > 0;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(null);
    if (!agreed) {
      setError("請先確認免責聲明");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/activity-week/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          dateOrWindow: form.dateOrWindow.trim(),
          periods: splitList(form.periods),
          venue: form.venue.trim(),
          audience: form.audience.trim(),
          owner: form.owner.trim(),
          hold: form.hold,
          notes: form.notes.trim(),
          submitterName: form.submitterName.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "提交失敗");
        return;
      }
      setForm(EMPTY);
      setAgreed(false);
      setDone("已提交，謝謝");
      await load();
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(form.dateOrWindow) ? form.dateOrWindow : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--brand-ink)] sm:text-3xl">
          2026/27年度各活動週活動登記表格
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          窗口：上學期 1/4–8｜下學期 6/16–7/8｜期考後 12/16–18、21
        </p>
      </div>
      <form className="section-block grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
        <label className="text-sm sm:col-span-2">
          <span className="text-[var(--brand-muted)]">活動名稱 *</span>
          <input
            className="field mt-1 w-full"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--brand-muted)]">擬定日期 *</span>
          <input
            className="field mt-1 w-full"
            type="date"
            value={dateValue}
            onChange={(e) => setForm((f) => ({ ...f, dateOrWindow: e.target.value }))}
          />
          <input
            className="field mt-1 w-full"
            placeholder="或文字：如 1/4–8、2026-01-05"
            value={form.dateOrWindow}
            onChange={(e) => setForm((f) => ({ ...f, dateOrWindow: e.target.value }))}
            required
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--brand-muted)]">節</span>
          <input
            className="field mt-1 w-full"
            list="aw-reg-period-opts"
            placeholder="第1節,第2節 或 全日"
            value={form.periods}
            onChange={(e) => setForm((f) => ({ ...f, periods: e.target.value }))}
          />
          <datalist id="aw-reg-period-opts">
            {PERIOD_OPTS.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </label>
        <label className="text-sm">
          <span className="text-[var(--brand-muted)]">場地</span>
          <input
            className="field mt-1 w-full"
            list="aw-reg-venue-opts"
            value={form.venue}
            onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
          />
          <datalist id="aw-reg-venue-opts">
            {VENUE_OPTS.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </label>
        <label className="text-sm">
          <span className="text-[var(--brand-muted)]">對象</span>
          <input
            className="field mt-1 w-full"
            value={form.audience}
            onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--brand-muted)]">負責老師 *</span>
          <input
            className="field mt-1 w-full"
            value={form.owner}
            onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
            required
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-[var(--brand-muted)]">提交人（可選）</span>
          <input
            className="field mt-1 w-full"
            value={form.submitterName}
            onChange={(e) => setForm((f) => ({ ...f, submitterName: e.target.value }))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--brand-accent)]"
            checked={form.hold}
            onChange={(e) => setForm((f) => ({ ...f, hold: e.target.checked }))}
          />
          Hold 場地／時段
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-[var(--brand-muted)]">備註</span>
          <textarea
            className="field mt-1 min-h-[72px] w-full"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>
        {showWarnings ? (
          <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:col-span-2">
            {warnings.conflicts.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {warnings.hallFull ? (
              <p className="font-semibold">該天禮堂已滿／已有安排，請另選一天</p>
            ) : null}
            {warnings.constraints.map((line) => (
              <p key={line} className="text-amber-900/80">
                提示：{line}
              </p>
            ))}
          </div>
        ) : null}
        <div className="space-y-2 rounded-xl border border-[var(--brand-line)] bg-[var(--brand-soft)] px-4 py-3 sm:col-span-2">
          <p className="text-sm font-medium text-[var(--brand-ink)]">
            最終活動時間由沈美玉主任安排及通知，謝謝。
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--brand-accent)]"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>本人已閱讀並同意上述安排說明</span>
          </label>
        </div>
        {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
        {done ? (
          <p className="text-sm font-medium text-emerald-700 sm:col-span-2">{done}</p>
        ) : null}
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={busy || !agreed}>
            {busy ? "提交中…" : "提交登記"}
          </button>
        </div>
      </form>
    </div>
  );
}
