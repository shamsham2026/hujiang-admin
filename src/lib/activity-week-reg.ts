/**
 * 同事活動週登記入口（全年公開、免密碼）。
 * seed 入面的 windows 係活動週日子，唔係登記開關。
 * 唔好改 token，現場連結已經派咗。
 */
export const AW_REG_TOKEN = "smy-aw-2627";
export const AW_REG_PATH = "/aw-reg/smy-aw-2627";

/** 登記頁頂欄標題。窗口日子唔放頂欄。 */
export const AW_REG_TITLE = "2026/27年度滬江小學活動週活動安排登記表";

/** 表單說明，唔係頂欄。 */
export const AW_REG_WINDOW_LINES = [
  "上學期期考後 16-12-2026至21-12-2026，4-1-2027至7-1-2027",
  "下學期期考後16-6-2027至9-7-2027結業禮",
] as const;
