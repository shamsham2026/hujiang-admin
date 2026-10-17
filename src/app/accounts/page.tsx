import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function AccountsPage() {
  return (
    <AppShell current="/accounts">
      <h1 className="font-display text-3xl font-bold">帳號</h1>
      <p className="mt-2 max-w-2xl text-[var(--brand-muted)]">
        MVP 僅佔位。現階段試卷模組以「操作者顯示名稱」記錄剔選；正式多
        Account（Owner 建立／停用、模組授權）稍後補上。詳見 README。
      </p>
      <div className="mt-6 overflow-hidden rounded-xl border border-[var(--brand-line)] bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--brand-soft)] text-[var(--brand-muted)]">
            <tr>
              <th className="px-3 py-2 text-left font-medium">顯示名稱</th>
              <th className="px-3 py-2 text-left font-medium">角色</th>
              <th className="px-3 py-2 text-left font-medium">狀態</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[var(--brand-line)]">
              <td className="px-3 py-2">Owner（佔位）</td>
              <td className="px-3 py-2">owner</td>
              <td className="px-3 py-2">active</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Link className="btn-secondary mt-6 inline-block" href="/">
        回總平台
      </Link>
    </AppShell>
  );
}
