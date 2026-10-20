import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSlot, parseTraining } from "./bot/parse.ts";
import { upcomingOccurrences } from "./bot/scheduler.ts";
import { formatWhen, zonedDate, zonedParts } from "./time.ts";

test("Варшава: літній і зимовий час", () => {
  assert.equal(zonedDate(2026, 10, 24, 19, 0).toISOString(), "2026-10-24T17:00:00.000Z");
  assert.equal(zonedDate(2026, 10, 25, 19, 0).toISOString(), "2026-10-25T18:00:00.000Z");
  assert.equal(zonedDate(2027, 1, 12, 19, 0).toISOString(), "2027-01-12T18:00:00.000Z");
});

test("formatWhen пише день тижня українською", () => {
  assert.equal(formatWhen(new Date("2026-10-20T17:00:00Z")), "вт, 20.10 о 19:00");
  assert.equal(zonedParts(new Date("2026-10-25T22:30:00Z")).weekday, 7);
});

test("parseTraining", () => {
  const now = new Date("2026-10-20T10:00:00Z");
  const ok = parseTraining("24.10 19:00 Hala Sportowa", now);
  assert.ok(!("error" in ok));
  assert.equal(ok.startsAt.toISOString(), "2026-10-24T17:00:00.000Z");
  assert.equal(ok.place, "Hala Sportowa");

  const nextYear = parseTraining("10.01 18.30", now);
  assert.ok(!("error" in nextYear));
  assert.equal(nextYear.startsAt.toISOString(), "2027-01-10T17:30:00.000Z");
  assert.equal(nextYear.place, "");

  assert.ok("error" in parseTraining("31.02 19:00", now));
  assert.ok("error" in parseTraining("24.10 25:00", now));
  assert.ok("error" in parseTraining("завтра", now));
  assert.ok("error" in parseTraining("20.10 11:00", now));
});

test("parseSlot", () => {
  assert.deepEqual(parseSlot("вт 19:00 Hala"), { weekday: 2, hour: 19, minute: 0, place: "Hala" });
  assert.deepEqual(parseSlot("Четвер 20.30"), { weekday: 4, hour: 20, minute: 30, place: "" });
  assert.ok("error" in parseSlot("xx 19:00"));
});

test("upcomingOccurrences", () => {
  const now = new Date("2026-10-20T10:00:00Z");
  const slots = [
    { weekday: 2, hour: 19, minute: 0, place: "A" },
    { weekday: 4, hour: 19, minute: 0, place: "B" },
  ];
  const list = upcomingOccurrences(slots, now, 8).map((o) => o.startsAt.toISOString());
  assert.deepEqual(list, [
    "2026-10-20T17:00:00.000Z",
    "2026-10-22T17:00:00.000Z",
    "2026-10-27T18:00:00.000Z",
  ]);
});
