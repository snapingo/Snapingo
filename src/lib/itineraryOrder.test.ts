import { describe, expect, it } from "vitest";
import { moveDay, nudgeDay } from "@/lib/itineraryOrder";

const days = [
  { date: "2026-11-04", title: "A" },
  { date: "2026-11-05", title: "B" },
  { date: "2026-11-06", title: "C" },
  { date: "2026-11-07", title: "D" },
];
const titles = (rows: { title: string }[]) => rows.map((r) => r.title).join("");
const dates = (rows: { date: string }[]) => rows.map((r) => r.date);

describe("moving itinerary days", () => {
  it("moves Day 2's content to Day 3", () => {
    // Dropped between C and D: slot 3.
    expect(titles(moveDay(days, 1, 3))).toBe("ACBD");
  });

  it("moves a day up, to the very top and to the very end", () => {
    expect(titles(moveDay(days, 2, 0))).toBe("CABD");
    expect(titles(moveDay(days, 0, 4))).toBe("BCDA");
    expect(titles(moveDay(days, 3, 1))).toBe("ADBC");
  });

  it("keeps each date with its position, not with the moved content", () => {
    const moved = moveDay(days, 1, 3);
    expect(dates(moved)).toEqual(dates(days));
    expect(moved[2]).toEqual({ date: "2026-11-06", title: "B" });
  });

  it("does nothing when dropped where it already is", () => {
    expect(moveDay(days, 1, 1)).toBe(days);
    expect(moveDay(days, 1, 2)).toBe(days);
  });

  it("ignores an impossible move", () => {
    expect(moveDay(days, -1, 2)).toBe(days);
    expect(moveDay(days, 4, 0)).toBe(days);
    expect(moveDay(days, 1, 9)).toBe(days);
  });

  it("does not change the original list", () => {
    const copy = days.map((d) => ({ ...d }));
    moveDay(days, 1, 3);
    expect(days).toEqual(copy);
  });

  it("nudges one step with the keyboard and stops at the ends", () => {
    expect(titles(nudgeDay(days, 1, 1))).toBe("ACBD");
    expect(titles(nudgeDay(days, 1, -1))).toBe("BACD");
    expect(nudgeDay(days, 0, -1)).toBe(days);
    expect(nudgeDay(days, 3, 1)).toBe(days);
  });
});
