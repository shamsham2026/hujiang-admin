import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActivityShell } from "@/components/ActivityShell";
import { ActivityWeekRegisterClient } from "@/components/ActivityWeekRegisterClient";
import { AW_REG_TITLE, AW_REG_TOKEN } from "@/lib/activity-week-reg";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: AW_REG_TITLE,
};

export default async function ActivityWeekRegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (token !== AW_REG_TOKEN) notFound();
  return (
    <ActivityShell title={AW_REG_TITLE} titleBelowLogo>
      <ActivityWeekRegisterClient />
    </ActivityShell>
  );
}
