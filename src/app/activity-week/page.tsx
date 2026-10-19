import { ActivityShell } from "@/components/ActivityShell";
import { ActivityWeekClient } from "@/components/ActivityWeekClient";
import { SiteGate } from "@/components/SiteGate";

export const dynamic = "force-dynamic";

export default function ActivityWeekPage() {
  return (
    <ActivityShell title="活動週">
      <SiteGate>
        <ActivityWeekClient />
      </SiteGate>
    </ActivityShell>
  );
}
