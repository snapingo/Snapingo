// One Trip ID can carry several packages for the same customer - say a Manali
// option, a Shimla option and a Goa option - each with its own itinerary and
// PDF. Pure helpers only; the database side lives in the server action.

/** The most packages one Trip ID may hold. */
export const MAX_PACKAGES_PER_TRIP = 10;

/** Whether a trip already holding `count` live packages may take another. */
export function canAddPackage(count: number): boolean {
  return count < MAX_PACKAGES_PER_TRIP;
}

/**
 * The slot a new package takes: one past the highest number ever used on the
 * trip. Archived packages count too, so deleting package 2 never lets the next
 * one reuse "2" and be mistaken for it.
 */
export function nextPackageNumber(existingNumbers: number[]): number {
  return existingNumbers.reduce((highest, n) => (n > highest ? n : highest), 0) + 1;
}

/** "Package 2" - only worth showing once a trip has more than one. */
export function packageLabel(position: number): string {
  return `Package ${position}`;
}

/**
 * The number staff see for each package: its place among the trip's packages
 * that still exist (1, 2, 3...), so deleting one never leaves a gap or makes
 * the next one start at "4". The stored `packageNumber` only keeps slots
 * unique and ordered; it is never shown.
 *
 * `rows` are live packages of any number of trips; each trip is ranked on its
 * own.
 */
export function packagePositions(
  rows: { id: string; tripId: string; packageNumber: number }[]
): Map<string, number> {
  const byTrip = new Map<string, { id: string; packageNumber: number }[]>();
  for (const row of rows) {
    const list = byTrip.get(row.tripId) ?? [];
    list.push(row);
    byTrip.set(row.tripId, list);
  }
  const positions = new Map<string, number>();
  for (const list of byTrip.values()) {
    list.sort((a, b) => a.packageNumber - b.packageNumber);
    list.forEach((row, index) => positions.set(row.id, index + 1));
  }
  return positions;
}
