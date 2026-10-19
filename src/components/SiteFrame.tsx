import Image from "next/image";
import Link from "next/link";
import { SiteGate } from "./SiteGate";

export function SiteFrame({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="site-shell flex min-h-screen flex-col">
      <SiteGate>
        <header className="sticky top-0 z-50 border-b border-[var(--brand-line)] bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex min-h-[4.25rem] w-full max-w-6xl items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4">
            <a
              href="https://hujiang-admin.vercel.app"
              className="shrink-0 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-[var(--brand-line)] hover:ring-[var(--brand-accent)]"
              aria-label="回行政管理平台"
              title="回行政管理平台"
            >
              <Image
                src="/brand/crest.png"
                alt="滬江小學校徽"
                width={56}
                height={56}
                className="rounded-full"
                priority
              />
            </a>
            {title ? (
              <h1 className="font-display min-w-0 flex-1 text-base font-bold leading-snug tracking-tight text-[var(--brand-ink)] sm:text-xl">
                {title}
              </h1>
            ) : null}
          </div>
        </header>
        <main className="site-main relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-8 pt-6">
          {children}
        </main>
        <footer className="site-footer relative z-10 border-t border-[var(--brand-line)] py-6 text-center text-xs text-[var(--brand-muted)]">
          <p className="mb-3">
            <Link
              href="/"
              className="text-sm font-medium text-[var(--brand-ink)] underline-offset-2 hover:underline"
            >
              回平台
            </Link>
          </p>
          <p>
            設計及製作：
            <a
              href="mailto:mysham@sap.edu.hk"
              className="text-[var(--brand-ink)] underline-offset-2 hover:underline"
            >
              沈美玉主任
            </a>
          </p>
          <p className="mt-1">
            <a
              href="https://www.sap.edu.hk/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--brand-ink)] underline-offset-2 hover:underline"
            >
              滬江小學
            </a>{" "}
            2026
          </p>
        </footer>
      </SiteGate>
    </div>
  );
}
