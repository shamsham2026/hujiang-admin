import assert from "node:assert/strict";
import { access } from "node:fs/promises";

process.env.VERCEL = "1";
delete process.env.BLOB_READ_WRITE_TOKEN;

const { getExamStore } = await import("../src/lib/exam-store.ts");

const store = await getExamStore();
assert.ok(store.periods.length > 0, "source periods should render without blob");
assert.equal(store.schoolYear, "2026/27");
assert.ok(store.periods.some((period) => period.papers.length > 0));

await assert.rejects(access("data/exam-ticks.json"));
console.log("exam read checks ok", store.periods.length, store.periods.reduce((n, p) => n + p.papers.length, 0));
