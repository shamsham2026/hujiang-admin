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
    <ActivityShell title="活動週登記">
      <ActivityWeekRegisterClient />
    </ActivityShell>
  );
}
