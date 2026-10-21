import { SiteGate } from "@/components/SiteGate";
import { safeNextPath } from "@/lib/public-paths";
import { LoginContinue } from "./continue";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  return (
    <SiteGate>
      <LoginContinue next={safeNextPath(raw)} />
    </SiteGate>
  );
}
