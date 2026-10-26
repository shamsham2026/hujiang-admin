import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "./BrandMark";

const NAV = [
  { href: "/", label: "總平台" },
  { href: "/timetable", label: "有效課表" },
  { href: "/activity-week", label: "活動週" },
  { href: "/exam-papers", label: "試卷處理" },
  {
    href: "https://hujiang-cover.vercel.app/lookup",
    label: "調課／代課",
    external: true,
  },
];

export function AppShell({
  children,
  current,
}: {
  children: React.ReactNode;
  current?: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="site-header border-b border-[var(--brand-line)] bg-[var(--brand-panel)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="relative z-10 no-underline">
            <BrandMark size="sm" />
          </Link>
          <nav className="relative z-10 flex flex-wrap gap-1 text-sm">
            {NAV.map((item) => {
              const active = current === item.href;
              const className = `rounded-md px-3 py-1.5 transition ${
                active
                  ? "bg-[var(--brand-accent)] text-white"
                  : "text-[var(--brand-ink)] hover:bg-[var(--brand-soft)]"
              }`;
              if (item.external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={className}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.label} ↗
                  </a>
                );
              }
              return (
                <Link key={item.href} href={item.href} className={className}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {/* Soft crest watermark — decorative only */}
        <Image
          src="/brand/crest-sm.png"
          alt=""
          width={88}
          height={88}
          className="header-crest-watermark"
          aria-hidden="true"
        />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
