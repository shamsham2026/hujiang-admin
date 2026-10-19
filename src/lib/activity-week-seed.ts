import type { SeedActivity } from "./activity-week-seed-types";

export type { SeedActivity };

export type PeriodTemplate = {
  name: string;
  start: string;
  end: string;
  minutes: number;
  note?: string;
};

/** Built-in catalogue. Revisions live in the store, not in this file. */
export const ACTIVITY_WEEK_SEED: {
  periods: PeriodTemplate[];
  venues: { code: string | null; name: string }[];
  constraints: { date: string; rule: string }[];
  windows: {
    上學期活動週: { start: string; end: string };
    下學期活動週: { start: string; end: string };
    期考後時間表: { dates: string[]; note: string };
  };
  seed: SeedActivity[];
} = {
  periods: [
    { name: "班主任節", start: "08:10", end: "08:35", minutes: 25 },
    { name: "第1節", start: "08:35", end: "09:15", minutes: 40 },
    { name: "第1小息", start: "09:15", end: "09:35", minutes: 20 },
    { name: "第2節", start: "09:35", end: "10:05", minutes: 30 },
    { name: "第3節", start: "10:05", end: "10:35", minutes: 30 },
    { name: "第2小息", start: "10:35", end: "10:55", minutes: 20 },
    { name: "第4節", start: "10:55", end: "11:25", minutes: 30 },
    {
      name: "第5節",
      start: "11:25",
      end: "12:00",
      minutes: 35,
      note: "11:55準備放學",
    },
  ],
  venues: [
    { code: "H", name: "禮堂" },
    { code: "C", name: "有蓋操場" },
    { code: "B", name: "籃球場" },
    { code: "E", name: "飲食區" },
    { code: "106", name: "106室" },
    { code: null, name: "課室（沒註明＝課室）" },
  ],
  constraints: [
    {
      date: "2026-06-14/15",
      rule: "TSA（小三小六）；其他級唔返學；唔排全校活動",
    },
    { date: "2026-07-02", rule: "畢業禮總綵排；禮堂／相關場地優先" },
    { date: "2026-07-09", rule: "小一至小五結業禮；唔排活動週活動" },
    { date: "2026-06-17", rule: "禮堂全日封鎖（年份暫2026）" },
    { date: "2026-06-22", rule: "禮堂全日＝小五生涯規劃" },
  ],
  windows: {
    上學期活動週: { start: "2026-01-04", end: "2026-01-08" },
    下學期活動週: { start: "2026-06-16", end: "2026-07-08" },
    期考後時間表: {
      dates: ["2026-12-16", "2026-12-17", "2026-12-18", "2026-12-21"],
      note: "核卷為主；可加插少量活動",
    },
  },
  seed: [
    {
      id: "sem1-p2-classroom",
      title: "課室活動",
      dateOrWindow: "2026-01-04/2026-01-08",
      periods: ["第1節"],
      venue: "課室",
      audience: "小二各班",
      owner: "各班班主任",
      hold: false,
      notes: "缺：主題、物資",
      track: "上學期活動週",
      builtin: true,
    },
    {
      id: "sem1-p5-gas",
      title: "煤氣講座",
      dateOrWindow: "2026-01-05",
      periods: [],
      venue: "408室",
      audience: "小五",
      owner: "蕭",
      hold: true,
      notes: "缺：實際節數／時段",
      track: "上學期活動週",
      builtin: true,
    },
    {
      id: "postexam-p4-riliji",
      title: "日曆奇",
      dateOrWindow: "2026-12-17",
      periods: [],
      venue: "",
      audience: "小四全級",
      owner: "",
      hold: false,
      notes: "缺：負責老師、時長、場地、時段、物資／形式、外聘／申請",
      track: "期考後時間表",
      builtin: true,
    },
    {
      id: "postexam-p1p2-antidrug",
      title: "禁毒活動",
      dateOrWindow: "2026-12-18",
      periods: ["全日"],
      venue: "禮堂",
      audience: "小一至小二",
      owner: "",
      hold: true,
      notes: "缺：負責老師、主辦／機構、物資／形式、申請／外聘",
      track: "期考後時間表",
      builtin: true,
    },
    {
      id: "postexam-recorder",
      title: "木笛",
      dateOrWindow: "2026-12-21",
      periods: ["頭三節"],
      venue: "禮堂",
      audience: "",
      owner: "忻",
      hold: true,
      notes: "缺：對象級別／班別、物資",
      track: "期考後時間表",
      builtin: true,
    },
    {
      id: "postexam-stem",
      title: "STEM 講座",
      dateOrWindow: "2026-12-21",
      periods: ["第4節", "第5節"],
      venue: "禮堂",
      audience: "",
      owner: "蕭",
      hold: true,
      notes: "缺：對象級別／班別、內容細節",
      track: "期考後時間表",
      builtin: true,
    },
    {
      id: "sem2-hall-block-0617",
      title: "禮堂全日不用／封鎖",
      dateOrWindow: "2026-06-17",
      periods: ["全日"],
      venue: "禮堂",
      audience: "",
      owner: "",
      hold: true,
      notes: "缺：年份確認（暫2026）、封鎖原因／佔用方",
      track: "下學期活動週｜場地封鎖",
      builtin: true,
    },
    {
      id: "sem2-p5-career",
      title: "生涯規劃活動",
      dateOrWindow: "2026-06-22",
      periods: ["全日"],
      venue: "禮堂",
      audience: "小五",
      owner: "",
      hold: true,
      notes: "缺：負責老師、機構／主辦、物資／形式、申請／外聘",
      track: "下學期活動週",
      builtin: true,
    },
    {
      id: "sem2-flag-p3p4",
      title: "升旗訓練",
      dateOrWindow: "2026-06-16/2026-07-08",
      periods: ["一節／班"],
      venue: "",
      audience: "小三及小四各班",
      owner: "",
      hold: false,
      notes: "缺：負責老師、場地、邊日邊班時間表、物資",
      track: "下學期活動週",
      builtin: true,
    },
  ],
};
