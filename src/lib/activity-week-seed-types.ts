export type SeedActivity = {
  id: string;
  title: string;
  dateOrWindow: string;
  periods: string[];
  venue: string;
  audience: string;
  owner: string;
  /** PDF 表格「科任、活動時長」入面嘅科任老師。 */
  subjectTeachers: string;
  hold: boolean;
  notes: string;
  track: string;
  builtin: true;
};
