import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function DutyPage() {
  return (
    <AppShell current="/duty">
      <h1 className="font-display text-3xl font-bold">當值</h1>
      <p className="mt-2 text-[var(--brand-muted)]">
        MVP 佔位。當值崗位查閱稍後接 board／校本當值表。
      </p>
      <Link className="btn-secondary mt-6 inline-block" href="/">
        回總平台
      </Link>
    </AppShell>
  );
}
