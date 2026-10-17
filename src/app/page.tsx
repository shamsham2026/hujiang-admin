import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BrandMark } from "@/components/BrandMark";
import { HubDecor } from "@/components/HubDecor";
import { COVER_BASE } from "@/lib/types";

const MODULES = [
  {
    href: "/timetable",
    title: "有效課表查詢",
    desc: "按日查閱 lessons ⊕ swaps 後的有效安排",
    ready: true,
  },
  {
    href: "/exam-papers",
    title: "試卷處理",
    desc: "簽批→覆核→印刷→鎖存 checklist，即刻剔",
    ready: true,
  },
  {
    href: `${COVER_BASE}/lookup`,
    title: "調課／代課安排",
    desc: "外連 hujiang-cover 查找與安排",
    ready: true,
    external: true,
  },
  {
    href: "/locks",
    title: "鎖定／特別活動",
    desc: "觀課鎖定與校曆摘要（即將）",
    ready: false,
  },
  {
    href: "/duty",
    title: "當值",
    desc: "當值崗位查閱（即將）",
    ready: false,
  },
  {
    href: "/records",
    title: "紀錄／統計",
    desc: "代課／調課紀錄摘要（即將）",
    ready: false,
  },
  {
    href: "/accounts",
    title: "帳號",
    desc: "多 Account 管理（MVP 佔位）",
    ready: false,
  },
];

export default function HomePage() {
  return (
    <AppShell current="/">
      <section className="hero-brand mb-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <BrandMark size="lg" showTagline />
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--brand-muted)]">
            一站式總平台：各模組獨立連結，方便書籤與同事共同操作。課表真相來自
            cover；試卷進度在本平台即刻剔選。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/timetable" className="btn-primary">
              查有效課表
            </Link>
            <Link href="/exam-papers" className="btn-secondary">
              開試卷清單
            </Link>
          </div>
        </div>
        <HubDecor />
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-bold text-[var(--brand-ink)]">
          功能入口
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const inner = (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-[var(--brand-ink)]">
                    {m.title}
                    {m.external ? " ↗" : ""}
                  </h3>
                  <span
                    className={`text-[10px] uppercase tracking-wide ${
                      m.ready
                        ? "text-[var(--brand-accent)]"
                        : "text-[var(--brand-muted)]"
                    }`}
                  >
                    {m.ready ? "可用" : "即將"}
                  </span>
                </div>
                <p className="text-sm text-[var(--brand-muted)]">{m.desc}</p>
              </>
            );
            if (m.external) {
              return (
                <a
                  key={m.href}
                  href={m.href}
                  className="hub-card"
                  target="_blank"
                  rel="noreferrer"
                >
                  {inner}
                </a>
              );
            }
            return (
              <Link key={m.href} href={m.href} className="hub-card">
                {inner}
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
