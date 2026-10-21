import assert from "node:assert/strict";
import test from "node:test";
import { isPublicPath, safeNextPath } from "./public-paths.ts";
import { expectedPassword, gateTokenFor, tokenMatches } from "./site-gate.ts";

test("anonymous visitors can open only the registration form and its APIs", () => {
  assert.equal(isPublicPath("/aw-reg/smy-aw-2627", "GET"), true);
  assert.equal(isPublicPath("/aw-reg/smy-aw-2627", "HEAD"), true);
  assert.equal(isPublicPath("/api/activity-week/submit", "POST"), true);
  assert.equal(isPublicPath("/api/activity-week/subs", "GET"), true);
  assert.equal(isPublicPath("/api/gate/login", "POST"), true);
  assert.equal(isPublicPath("/api/gate/status", "GET"), true);
  assert.equal(isPublicPath("/login", "GET"), true);
  assert.equal(isPublicPath("/brand/crest.png", "GET"), true);

  for (const path of [
    "/",
    "/accounts",
    "/timetable",
    "/exam-papers",
    "/activity-week",
    "/locks",
    "/duty",
    "/records",
    "/api/exam-papers",
  ]) {
    assert.equal(isPublicPath(path, "GET"), false, path);
  }

  assert.equal(isPublicPath("/api/activity-week/subs", "POST"), false);
  assert.equal(isPublicPath("/api/activity-week/subs", "DELETE"), false);
  assert.equal(isPublicPath("/api/activity-week/submit", "GET"), false);
  assert.equal(isPublicPath("/aw-reg/smy-aw-2627", "POST"), false);
});

test("next paths stay on this site", () => {
  assert.equal(safeNextPath("/accounts"), "/accounts");
  assert.equal(safeNextPath("/timetable?date=2026-10-21"), "/timetable?date=2026-10-21");
  assert.equal(safeNextPath("https://evil.example"), "/");
  assert.equal(safeNextPath("//evil.example"), "/");
  assert.equal(safeNextPath("/login?next=/accounts"), "/");
  assert.equal(safeNextPath(undefined), "/");
});

test("a forged gate cookie does not authorize", async () => {
  const previous = process.env.SITE_GATE_PASSWORD;
  const vercel = process.env.VERCEL;
  delete process.env.VERCEL;
  process.env.SITE_GATE_PASSWORD = "test-only-secret";
  try {
    assert.equal(expectedPassword(), "test-only-secret");
    assert.equal(await tokenMatches("1"), false);
    assert.equal(await tokenMatches(undefined), false);
    assert.equal(await tokenMatches(await gateTokenFor("wrong")), false);
    assert.equal(await tokenMatches(await gateTokenFor("test-only-secret")), true);
  } finally {
    if (previous === undefined) delete process.env.SITE_GATE_PASSWORD;
    else process.env.SITE_GATE_PASSWORD = previous;
    if (vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercel;
  }
});

test("vercel without a password secret authorizes nobody", async () => {
  const previous = process.env.SITE_GATE_PASSWORD;
  const vercel = process.env.VERCEL;
  delete process.env.SITE_GATE_PASSWORD;
  process.env.VERCEL = "1";
  try {
    assert.equal(expectedPassword(), "");
    assert.equal(await tokenMatches(await gateTokenFor("saps2884")), false);
  } finally {
    if (previous === undefined) delete process.env.SITE_GATE_PASSWORD;
    else process.env.SITE_GATE_PASSWORD = previous;
    if (vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercel;
  }
});
