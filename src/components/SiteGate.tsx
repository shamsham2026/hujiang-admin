"use client";

import { useEffect, useState } from "react";

export function SiteGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gate/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { ok?: boolean }) => {
        if (!cancelled) setState(data.ok ? "in" : "out");
      })
      .catch(() => {
        if (!cancelled) setState("out");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/gate/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setErr("密碼錯誤");
        setBusy(false);
        return;
      }
      setState("in");
      setPassword("");
    } catch {
      setErr("無法登入");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--brand-muted)]">
        …
      </div>
    );
  }

  if (state === "out") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-sm flex-col justify-center px-4">
        <h1 className="font-display text-xl font-bold text-[var(--brand-ink)]">
          進入
        </h1>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-[var(--brand-ink)]">
              密碼
            </span>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-[var(--brand-line)] bg-white px-3 py-2.5 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </label>
          {err ? <p className="text-sm text-rose-700">{err}</p> : null}
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={busy || !password}
          >
            {busy ? "…" : "進入"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
