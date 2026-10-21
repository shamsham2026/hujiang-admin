"use client";

import { useEffect } from "react";

export function LoginContinue({ next }: { next: string }) {
  useEffect(() => {
    window.location.replace(next);
  }, [next]);
  return <p className="text-sm text-[var(--brand-muted)]">已進入，正在返回…</p>;
}
