import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { COVER_BASE } from "@/lib/types";

export default function LocksPage() {
  return (
    <AppShell current="/locks">
      <h1 className="font-display text-3xl font-bold">鎖定／特別活動</h1>
      <p className="mt-2 text-[var(--brand-muted)]">
        MVP 佔位。稍後對齊 board 的 locked／calendar；觀課鎖定實際安排仍在
        cover。
      </p>
      <p className="mt-6">
        <a className="btn-secondary" href={COVER_BASE} target="_blank" rel="noreferrer">
          開啟 cover ↗
        </a>{" "}
        <Link className="btn-secondary ml-2" href="/">
          回總平台
        </Link>
      </p>
    </AppShell>
  );
}
