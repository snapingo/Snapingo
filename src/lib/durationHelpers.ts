// Package duration is stored twice on purpose: `durationNights`/`durationDays`
// are what the form's two dropdowns write and what any future filtering
// should read, while `duration` stays the single display string every public
// component already renders ("5 Nights / 6 Days"). The display string is
// always derived from the numbers via formatDuration on save, so the two can
// never drift apart - the text field staff used to type by hand is gone.

export type Duration = { nights: number; days: number };

// Upper bound for the dropdowns. Generous rather than tight: the longest
// package currently in the database is 20 nights, and an option list this
// small costs nothing to render.
export const MAX_DURATION_NIGHTS = 30;

export const nightOptions = Array.from({ length: MAX_DURATION_NIGHTS + 1 }, (_, n) => ({
  value: String(n),
  label: n === 1 ? "1 Night" : `${n} Nights`,
}));

export const dayOptions = Array.from({ length: MAX_DURATION_NIGHTS + 1 }, (_, i) => {
  const d = i + 1;
  return { value: String(d), label: d === 1 ? "1 Day" : `${d} Days` };
});

export function formatDuration({ nights, days }: Duration): string {
  const n = nights === 1 ? "1 Night" : `${nights} Nights`;
  const d = days === 1 ? "1 Day" : `${days} Days`;
  return `${n} / ${d}`;
}

/**
 * Reads a legacy free-text duration back into numbers so the 148 packages
 * written before the dropdowns existed can be edited without staff having to
 * re-pick their duration. Handles both the long form the seed data uses
 * ("5 Nights / 6 Days") and the terse form a few rows were typed in ("3N/4D").
 * Returns null when neither shape matches, which the form treats as "nothing
 * preselected" rather than guessing wrong.
 */
export function parseDuration(value: string): Duration | null {
  const match = /(\d+)\s*(?:nights?|n)\b[^\d]*(\d+)\s*(?:days?|d)\b/i.exec(value);
  if (!match) return null;

  const nights = Number(match[1]);
  const days = Number(match[2]);
  if (!Number.isFinite(nights) || !Number.isFinite(days)) return null;

  return { nights, days };
}

/**
 * A trip's days and nights go together: N nights is N + 1 days. Choosing one
 * in the form sets the other, so a combination like "15 Nights / 8 Days"
 * can't be built by hand.
 */
export const daysForNights = (nights: number): number => nights + 1;

/** Whole nights between two yyyy-mm-dd dates, or null when either is missing, reversed or too long. */
export function nightsBetween(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const diff = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
  return Number.isFinite(diff) && diff >= 0 && diff <= MAX_DURATION_NIGHTS ? diff : null;
}
export const nightsForDays = (days: number): number => Math.max(0, days - 1);
