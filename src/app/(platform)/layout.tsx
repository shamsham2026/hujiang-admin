import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, tokenMatches } from "@/lib/site-gate";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  if (!(await tokenMatches(jar.get(GATE_COOKIE)?.value))) {
    redirect("/login");
  }
  return children;
}
