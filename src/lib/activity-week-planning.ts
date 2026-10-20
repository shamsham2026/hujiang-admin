/** Narrative from activity-week-known-2026.md that is not a placed booking. */

export const CALENDAR_RULE = "活動週已知項目唔寫入 Google Calendar。";

export const DUTY_REFERENCE =
  "值崗參考（唔排活動）：早到 7:30–8:15 為 C1／C2／E／B；7:45–8:15 為梯間。小息值崗為 B1／B2／C1／C2／E／一樓。7/9 樣表上的教師名同 P.4–5 運動服只屬結業禮當日。";

export const CANDIDATES: { title: string; audience: string; note: string }[] = [
  {
    title: "紅白演義《尋回魔法的聲音》（語常會）",
    audience: "小一至小六",
    note: "2026-09-29～2027-06-30；最多 3 場。未確認，唔申請，唔排入時間表。",
  },
  {
    title: "遊劇場《親戚朋友齊拜年》",
    audience: "小一至小六",
    note: "已報過。未確認，唔排入時間表。",
  },
  {
    title: "Jumbokids《節日專賣店》",
    audience: "小一至小三",
    note: "已報過。未確認，唔排入時間表。",
  },
];

export const P1_THEATRE_NOTE =
  "小一劇場候選（約 100 人、用禮堂）：齊拜年／魔法聲音／Jumbokids。已排除科學館、太空館、消防局（2026-11-03 OLE 已去）。未確認，唔當已排。";

export function dayHints(date: string): string[] {
  const hints: string[] = [];
  if (date >= "2026-01-04" && date <= "2026-01-08") {
    hints.push(
      "凍周：小一考試適應（閱讀、寫作、GE、聆聽、數學、人文，共 12 節）唔屬活動週，主責考試流程。",
    );
  }
  if (
    date === "2026-12-16" ||
    date === "2026-12-17" ||
    date === "2026-12-18" ||
    date === "2026-12-21"
  ) {
    hints.push("期考後以核卷為主，只加插少量活動。");
  }
  if (date === "2026-07-02") {
    hints.push("畢業禮總綵排：禮堂優先，其他活動避開禮堂。");
  }
  return hints;
}
