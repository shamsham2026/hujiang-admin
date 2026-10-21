import { ActivityShell } from "@/components/ActivityShell";
import { ActivityWeekClient } from "@/components/ActivityWeekClient";
import { SiteGate } from "@/components/SiteGate";
import { AW_REG_TITLE } from "@/lib/activity-week-reg";

export const dynamic = "force-dynamic";

export default function ActivityWeekPage() {
  return (
    <ActivityShell title={AW_REG_TITLE} titleBelowLogo>
      <SiteGate>
        <ActivityWeekClient />
      </SiteGate>
    </ActivityShell>
  );
}
