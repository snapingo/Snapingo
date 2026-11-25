// Reordering the days of an itinerary. A day's number is its position in the
// list ("Day 3"), and so is its date: Day 1 is the trip's first date, Day 2
// the next, and so on. So when a day is dragged elsewhere its title and
// description go with it, but the dates stay with the positions - moving the
// content of Day 2 to Day 3 makes it Day 3's date.

export type OrderedRow = { date: string };

/**
 * Moves the row at `from` into insertion slot `slot` (0 = before the first row,
 * rows.length = after the last), the way a drop line between rows is read.
 * Returns the same array when nothing would change.
 */
export function moveDay<T extends OrderedRow>(rows: T[], from: number, slot: number): T[] {
  if (from < 0 || from >= rows.length || slot < 0 || slot > rows.length) return rows;
  // Removing the row first shifts every later slot up by one.
  const to = slot > from ? slot - 1 : slot;
  if (to === from) return rows;

  const next = [...rows];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  // Dates belong to positions, not to the content that was moved.
  return next.map((row, i) => ({ ...row, date: rows[i].date }));
}

/** One step up or down (for the keyboard); stays put at either end. */
export function nudgeDay<T extends OrderedRow>(rows: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= rows.length) return rows;
  // Moving down by one is dropping into the slot after the next row.
  return moveDay(rows, index, direction === 1 ? target + 1 : target);
}
