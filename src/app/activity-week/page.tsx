import { ActivityWeekClient } from "@/components/ActivityWeekClient";
import { SiteFrame } from "@/components/SiteFrame";

export const dynamic = "force-dynamic";

export default function ActivityWeekPage() {
  return (
    <SiteFrame title="活動週">
      <ActivityWeekClient />
    </SiteFrame>
  );
}
