import { describe, expect, it } from "vitest";
import {
  MAX_PACKAGES_PER_TRIP,
  canAddPackage,
  nextPackageNumber,
  packageLabel,
  packagePositions,
} from "@/lib/tripPackages";

describe("trip packages", () => {
  it("allows up to ten packages on one trip", () => {
    expect(MAX_PACKAGES_PER_TRIP).toBe(10);
    expect(canAddPackage(1)).toBe(true);
    expect(canAddPackage(9)).toBe(true);
    expect(canAddPackage(10)).toBe(false);
    expect(canAddPackage(11)).toBe(false);
  });

  it("numbers the next package after the highest ever used", () => {
    expect(nextPackageNumber([])).toBe(1);
    expect(nextPackageNumber([1])).toBe(2);
    expect(nextPackageNumber([1, 2, 3])).toBe(4);
    // A deleted package 2 leaves a gap that is never refilled.
    expect(nextPackageNumber([1, 3])).toBe(4);
  });

  it("labels a package", () => {
    expect(packageLabel(3)).toBe("Package 3");
  });

  // Staff see 1, 2, 3 among the packages that still exist, whatever slot
  // numbers the database holds.
  it("numbers the visible packages without gaps", () => {
    const positions = packagePositions([
      { id: "a", tripId: "T1", packageNumber: 1 },
      { id: "d", tripId: "T1", packageNumber: 4 },
      { id: "x", tripId: "T2", packageNumber: 3 },
    ]);
    expect(positions.get("a")).toBe(1);
    expect(positions.get("d")).toBe(2);
    // Each trip counts on its own.
    expect(positions.get("x")).toBe(1);
  });
});
