import { describe, it, expect } from "vitest";
import { MAX_DURATION_NIGHTS, dayOptions, daysForNights, formatDuration, nightOptions, nightsBetween, nightsForDays, parseDuration } from "./durationHelpers";

describe("parseDuration", () => {
  it("reads the long form the seeded packages use", () => {
    expect(parseDuration("5 Nights / 6 Days")).toEqual({ nights: 5, days: 6 });
  });

  it("reads the terse form a few legacy rows were typed in", () => {
    expect(parseDuration("3N/4D")).toEqual({ nights: 3, days: 4 });
  });

  it("handles singular wording", () => {
    expect(parseDuration("1 Night / 2 Days")).toEqual({ nights: 1, days: 2 });
  });

  it("is case insensitive", () => {
    expect(parseDuration("7 NIGHTS / 8 DAYS")).toEqual({ nights: 7, days: 8 });
  });

  it("reads two-digit durations", () => {
    expect(parseDuration("20 Nights / 21 Days")).toEqual({ nights: 20, days: 21 });
  });

  // Returning null rather than a guess is what lets the seed script report
  // the row and leave it for staff instead of writing a wrong duration.
  it("returns null when the shape doesn't match", () => {
    expect(parseDuration("A week in Goa")).toBeNull();
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("5 Nights")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("pluralises each half independently", () => {
    expect(formatDuration({ nights: 1, days: 2 })).toBe("1 Night / 2 Days");
    expect(formatDuration({ nights: 0, days: 1 })).toBe("0 Nights / 1 Day");
    expect(formatDuration({ nights: 5, days: 6 })).toBe("5 Nights / 6 Days");
  });

  it("round-trips through parseDuration", () => {
    const value = { nights: 4, days: 5 };
    expect(parseDuration(formatDuration(value))).toEqual(value);
  });
});

describe("dropdown options", () => {
  it("offers nights from 0 and days from 1", () => {
    expect(nightOptions[0]).toEqual({ value: "0", label: "0 Nights" });
    expect(dayOptions[0]).toEqual({ value: "1", label: "1 Day" });
  });

  it("stays within the range the validation schema accepts", () => {
    expect(Number(nightOptions[nightOptions.length - 1].value)).toBeLessThanOrEqual(30);
    expect(Number(dayOptions[dayOptions.length - 1].value)).toBeLessThanOrEqual(31);
  });
});

describe("days and nights stay together", () => {
  it("is one more day than nights", () => {
    expect(daysForNights(15)).toBe(16);
    expect(daysForNights(0)).toBe(1);
    expect(nightsForDays(8)).toBe(7);
  });

  it("never goes below zero nights", () => {
    expect(nightsForDays(1)).toBe(0);
    expect(nightsForDays(0)).toBe(0);
  });

  it("always lands on an option the dropdowns offer", () => {
    for (const n of nightOptions.map((o) => Number(o.value))) {
      expect(dayOptions.map((o) => Number(o.value))).toContain(daysForNights(n));
    }
    expect(daysForNights(MAX_DURATION_NIGHTS)).toBe(MAX_DURATION_NIGHTS + 1);
  });
});

describe("nightsBetween", () => {
  it("counts the nights between two dates", () => {
    expect(nightsBetween("2026-11-12", "2026-11-20")).toBe(8);
    expect(nightsBetween("2026-11-12", "2026-11-12")).toBe(0);
  });

  it("is null for missing, reversed or too long ranges", () => {
    expect(nightsBetween("", "2026-11-20")).toBeNull();
    expect(nightsBetween("2026-11-20", "2026-11-12")).toBeNull();
    expect(nightsBetween("2026-01-01", "2026-12-31")).toBeNull();
  });
});
