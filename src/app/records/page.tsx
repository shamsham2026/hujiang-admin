import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { COVER_BASE } from "@/lib/types";

export default function RecordsPage() {
  return (
    <AppShell current="/records">
      <h1 className="font-display text-3xl font-bold">紀錄／統計</h1>
      <p className="mt-2 text-[var(--brand-muted)]">
        MVP 佔位。代課／調課紀錄優先讀 board records／swaps；完整統計見 cover。
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <a
          className="btn-secondary"
          href={`${COVER_BASE}/records`}
          target="_blank"
          rel="noreferrer"
        >
          cover 紀錄 ↗
        </a>
        <a
          className="btn-secondary"
          href={`${COVER_BASE}/stats`}
          target="_blank"
          rel="noreferrer"
        >
          cover 統計 ↗
        </a>
        <Link className="btn-secondary" href="/">
          回總平台
        </Link>
      </div>
    </AppShell>
  );
}
