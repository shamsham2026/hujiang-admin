"use client";

import { useCallback, useEffect, useMemo, useState, type FocusEvent, type FormEvent } from "react";
import { regWarnings, splitList } from "@/lib/activity-week-conflicts";
import {
  formatShownDate,
  registrationCalendars,
  type RegistrationCalendarMonth,
} from "@/lib/activity-week-grid";
import { revealFocusedField } from "@/lib/reveal-focused-field";
import { ACTIVITY_WEEK_SEED } from "@/lib/activity-week-seed";
import type { ConflictItem } from "@/lib/activity-week-types";

const DURATION_OPTS = [
  "30分鐘",
  "45分鐘",
  "60分鐘",
  "90分鐘",
  ...ACTIVITY_WEEK_SEED.periods.map((p) => p.name),
  "全日",
  "頭三節",
];

const VENUE_OPTS = ACTIVITY_WEEK_SEED.venues.map((v) =>
  v.code ? `${v.code} ${v.name}` : v.name,
);

const WEEKDAY_HEADS = ["日", "一", "二", "三", "四", "五", "六"] as const;
const REGISTRATION_CALENDARS: RegistrationCalendarMonth[] = registrationCalendars();

function singleDmyToIso(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shownConstraint(line: string): string {
  const splitAt = line.indexOf("：");
  if (splitAt < 0) return line;
  return `${formatShownDate(line.slice(0, splitAt))}${line.slice(splitAt)}`;
}

const EMPTY = {
  title: "",
  dateOrWindow: "",
  periods: "",
  venue: "",
  junior: false,
  senior: false,
  headcountOnly: false,
  headcount: "",
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
    () => regWarnings(form.dateOrWindow, known, form.venue, form.periods),
    [form.dateOrWindow, form.venue, form.periods, known],
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
    let audience = "";
    if (form.headcountOnly) {
      const count = Number(form.headcount);
      if (!Number.isFinite(count) || count < 1) {
        setError("請填人數");
        return;
      }
      audience = `${Math.round(count)}人`;
    } else {
      audience = [form.junior ? "初小" : "", form.senior ? "高小" : ""].filter(Boolean).join("、");
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
          audience,
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

  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(form.dateOrWindow)
    ? form.dateOrWindow
    : (singleDmyToIso(form.dateOrWindow) ?? "");
  const shownDate = /^\d{4}-\d{2}-\d{2}$/.test(form.dateOrWindow)
    ? formatShownDate(form.dateOrWindow)
    : form.dateOrWindow;

  return (
    <div className="space-y-6">
      <RegistrationCalendar
        selected={dateValue}
        onPick={(iso) => setForm((current) => ({ ...current, dateOrWindow: iso }))}
      />
    <form
        id="aw-reg-form"
        className="section-block grid min-w-0 max-w-full gap-3 sm:grid-cols-2"
        onSubmit={onSubmit}
        onFocus={(event: FocusEvent<HTMLFormElement>) => {
          const target = event.target;
          if (!(target instanceof HTMLElement) || target === event.currentTarget) return;
          if (!target.matches("input, textarea, select")) return;
          revealFocusedField(target);
        }}
      >
        <label className="text-sm sm:col-span-2">
          <span className="text-[var(--brand-muted)]">活動名稱 *</span>
          <input
            className="field mt-1 w-full"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </label>
        <div className="text-sm">
          <span className="text-[var(--brand-muted)]">擬定日期 *</span>
          <span className="relative mt-1 block">
            <input
              className="field w-full pr-12"
              aria-label="擬定日期"
              inputMode="text"
              placeholder="例如 16-12-2026，或 16-12-2026至21-12-2026"
              value={shownDate}
              onChange={(e) => {
                const typed = e.target.value;
                setForm((f) => ({ ...f, dateOrWindow: singleDmyToIso(typed) ?? typed }));
              }}
              required
            />
            <input
              className="absolute inset-y-0 right-0 w-11 cursor-pointer opacity-0"
              type="date"
              lang="en-GB"
              aria-label="選擇日期"
              value={dateValue}
              onChange={(e) => setForm((f) => ({ ...f, dateOrWindow: e.target.value }))}
            />
            <span
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--brand-muted)]"
              aria-hidden
            >
              選擇
            </span>
          </span>
        </div>
        <label className="text-sm">
          <span className="text-[var(--brand-muted)]">活動時長</span>
          <input
            className="field mt-1 w-full"
            list="aw-reg-duration-opts"
            placeholder="例如 45分鐘、第1節、第2節 或 全日"
            value={form.periods}
            onChange={(e) => setForm((f) => ({ ...f, periods: e.target.value }))}
          />
          <datalist id="aw-reg-duration-opts">
            {DURATION_OPTS.map((opt) => (
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
        <fieldset className="text-sm">
          <legend className="text-[var(--brand-muted)]">對象</legend>
          <div className="mt-1 space-y-1.5">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--brand-accent)]"
                checked={form.junior}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    junior: e.target.checked,
                    headcountOnly: e.target.checked ? false : f.headcountOnly,
                    headcount: e.target.checked ? "" : f.headcount,
                  }))
                }
              />
              初小
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--brand-accent)]"
                checked={form.senior}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    senior: e.target.checked,
                    headcountOnly: e.target.checked ? false : f.headcountOnly,
                    headcount: e.target.checked ? "" : f.headcount,
                  }))
                }
              />
              高小
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--brand-accent)]"
                checked={form.headcountOnly}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    headcountOnly: e.target.checked,
                    junior: e.target.checked ? false : f.junior,
                    senior: e.target.checked ? false : f.senior,
                    headcount: e.target.checked ? f.headcount : "",
                  }))
                }
              />
              只需指定人數
            </label>
            {form.headcountOnly ? (
              <label className="block pt-1">
                <span className="text-[var(--brand-muted)]">人數</span>
                <input
                  className="field mt-1 w-full"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={form.headcount}
                  onChange={(e) => setForm((f) => ({ ...f, headcount: e.target.value }))}
                  required
                />
              </label>
            ) : null}
          </div>
        </fieldset>
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
                提示：{shownConstraint(line)}
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

function RegistrationCalendar({
  selected,
  onPick,
}: {
  selected: string;
  onPick: (iso: string) => void;
}) {
  const groups: { title: string; months: RegistrationCalendarMonth[] }[] = [];
  for (const month of REGISTRATION_CALENDARS) {
    const last = groups[groups.length - 1];
    if (last?.title === month.group) last.months.push(month);
    else groups.push({ title: month.group, months: [month] });
  }
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <section key={group.title} className="min-w-0">
          <h2 className="mb-1 text-sm font-semibold leading-snug text-[var(--brand-ink)]">{group.title}</h2>
          <div className="grid grid-cols-2 gap-2">
            {group.months.map((month) => (
              <div
                key={`${month.year}-${month.month}`}
                className="min-w-0 rounded-xl border border-[var(--brand-line)] bg-white p-2 shadow-sm"
              >
                <p className="text-[11px] text-[var(--brand-muted)]">
                  {`${month.year}年${month.month}月`}
                </p>
                <div className="mt-1 grid grid-cols-7 gap-0.5 text-center">
                  {WEEKDAY_HEADS.map((name) => (
                    <div key={name} className="text-[10px] leading-4 text-[var(--brand-muted)]">
                      {name}
                    </div>
                  ))}
                  {month.weeks.flatMap((week, weekIndex) =>
                    week.map((day, weekday) =>
                      day ? (
                        <button
                          key={day.date}
                          type="button"
                          aria-label={day.label}
                          aria-pressed={selected === day.date}
                          onClick={() => onPick(day.date)}
                          className={`rounded-md py-1 text-xs font-semibold leading-none ${
                            selected === day.date
                              ? "bg-[var(--brand-accent)] text-white"
                              : "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                          }`}
                        >
                          {Number(day.date.slice(8, 10))}
                        </button>
                      ) : (
                        <div
                          key={`${month.year}-${month.month}-${weekIndex}-${weekday}`}
                          aria-hidden
                          className="py-1"
                        />
                      ),
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
