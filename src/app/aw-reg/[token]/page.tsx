import { notFound } from "next/navigation";
import { ActivityShell } from "@/components/ActivityShell";
import { ActivityWeekRegisterClient } from "@/components/ActivityWeekRegisterClient";
import { AW_REG_TOKEN } from "@/lib/activity-week-reg";

export const dynamic = "force-dynamic";

export default async function ActivityWeekRegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (token !== AW_REG_TOKEN) notFound();
  return (
    <ActivityShell title="2026/27年度各活動週活動登記表格" titleBelowLogo>
      <ActivityWeekRegisterClient />
    </ActivityShell>
  );
}
