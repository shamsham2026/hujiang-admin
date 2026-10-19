/** Shared activity-week records. Seed stays in code; edits and placements persist. */

export type ActivitySource = "seed" | "platform";

export type ActivityRevision = {
  title: string;
  dateOrWindow: string;
  periods: string[];
  venue: string;
  audience: string;
  owner: string;
  hold: boolean;
  notes: string;
  track: string;
  updatedAt: string;
};

export type ActivitySubmission = {
  id: string;
  title: string;
  dateOrWindow: string;
  periods: string[];
  venue: string;
  audience: string;
  owner: string;
  hold: boolean;
  notes: string;
  track?: string;
  submittedAt: string;
  submitterName?: string;
};

export type ActivityPlacement = {
  id: string;
  entryId: string;
  date: string;
  classCode: string;
  period: string;
  updatedAt: string;
};

export type ActivityEntry = {
  id: string;
  title: string;
  dateOrWindow: string;
  periods: string[];
  venue: string;
  audience: string;
  owner: string;
  hold: boolean;
  notes: string;
  track: string;
  builtin: boolean;
  source: ActivitySource;
  revised: boolean;
  submittedAt?: string;
  submitterName?: string;
};

export type ConflictItem = {
  id: string;
  title: string;
  dateOrWindow: string;
  periods: string[];
  venue: string;
  hold?: boolean;
};
