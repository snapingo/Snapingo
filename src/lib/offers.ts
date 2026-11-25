// Hotel offers on a quotation: alternatives such as a 3-star, a 4-star and a
// 5-star stay, each with the hotels in it and a price. The customer sees a
// list price, the price they actually pay and the discount between the two.
//
// An offer is priced the way the package itself is: for each kind of traveller
// (Adult, Child with bed, Infant...) a list rate and a final rate per person,
// and the package list and final prices are those rates times the number
// travelling (src/lib/priceLines.ts). The discount is never typed or stored -
// it is worked out from the list price and the final price wherever it is
// shown, so it cannot disagree with them.
//
// Offers are alternatives to choose from. They never feed the package price.
// Staff enter every price before GST; the customer is shown it with GST
// already added and no separate GST line (offersWithGst), and what is stored
// stays as entered.

import { MAX_PRICE_LINES, rateWithGst, type PriceLine } from "@/lib/priceLines";

// One kind of traveller in an offer: how many, the rate each pays (final) and
// the rate before the offer (list; 0 or absent = none).
export type OfferLine = PriceLine & { listRate?: number };

export type Offer = {
  // Optional name for the offer ("Mountain view stay").
  title: string;
  // MasterOption.value slug of the hotel category (HOTEL_CATEGORY list), or "".
  hotelCategory: string;
  hotels: string[];
  // One short line under the hotels, e.g. what the price covers.
  note: string;
  // Before the offer: the list rates below times the travellers. 0 means "no
  // list price": only the final price is shown. (An offer saved without
  // rates keeps the single total that was entered.)
  listPrice: number;
  // The package price: the final rates below times the travellers. (An offer
  // saved without rates keeps the single total that was entered.)
  finalPrice: number;
  // Who is travelling and what each kind pays per person, before GST.
  priceLines: OfferLine[];
  // Whether the PDF shows who is travelling and the rate for each.
  showTravellers: boolean;
};

export const MAX_OFFERS = 10;
export const MAX_OFFER_HOTELS = 10;

const toInt = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};

const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

/** Rows of who is travelling; one with no name or nobody in it is not part of the offer. */
function parseOfferLines(value: unknown): OfferLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      return {
        label: text(r.label, 80),
        count: Math.min(toInt(r.count), 99),
        rate: toInt(r.rate),
        listRate: toInt(r.listRate),
      };
    })
    .filter((l) => l.label && l.count > 0)
    .slice(0, MAX_PRICE_LINES);
}

const linesTotal = (lines: OfferLine[], key: "rate" | "listRate") =>
  lines.reduce((sum, l) => sum + l.count * (l[key] ?? 0), 0);

/**
 * Cleans rows from the form or the database. An offer needs a price to pay
 * and something that says what it is for (a category, a hotel or a name);
 * a row left empty is the form's blank starting row, not part of the quote.
 *
 * The price to pay is worked out here from the rates and head counts, never
 * taken on trust from the form, so it can't disagree with them.
 */
export function parseOffers(value: unknown): Offer[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const priceLines = parseOfferLines(r.priceLines);
      const byRates = linesTotal(priceLines, "rate");
      const listByRates = linesTotal(priceLines, "listRate");
      return {
        title: text(r.title, 80),
        hotelCategory: text(r.hotelCategory, 120),
        hotels: (Array.isArray(r.hotels) ? r.hotels : [])
          .map((h) => text(h, 200))
          .filter(Boolean)
          .slice(0, MAX_OFFER_HOTELS),
        note: text(r.note, 200),
        listPrice: listByRates > 0 ? listByRates : toInt(r.listPrice),
        finalPrice: byRates > 0 ? byRates : toInt(r.finalPrice),
        priceLines,
        // Shown unless explicitly turned off.
        showTravellers: !(r.showTravellers === false || r.showTravellers === "false"),
      };
    })
    .filter((o) => o.finalPrice > 0 && (o.title || o.hotelCategory || o.hotels.length > 0))
    .slice(0, MAX_OFFERS);
}

/**
 * What is wrong with the offers as entered, in words for the person filling
 * the form, or null when they are fine. Judged on the raw rows so a mistake is
 * reported rather than silently dropped by parseOffers.
 */
export function validateOffers(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_OFFERS) return `A package can have at most ${MAX_OFFERS} offers.`;

  const rows = value as Record<string, unknown>[];
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i] ?? {};
    const lines = parseOfferLines(r.priceLines);
    const listByRates = linesTotal(lines, "listRate");
    const byRates = linesTotal(lines, "rate");
    const list = listByRates > 0 ? listByRates : toInt(r.listPrice);
    const final = byRates > 0 ? byRates : toInt(r.finalPrice);
    const named = Boolean(text(r.title, 80) || text(r.hotelCategory, 120) || (Array.isArray(r.hotels) && r.hotels.some((h) => text(h, 200))));
    const touched = named || list > 0 || final > 0;
    if (!touched) continue; // an untouched blank row

    const label = `Offer ${i + 1}`;
    if (final <= 0) return `${label}: enter the rate per person.`;
    if (!named) return `${label}: choose a hotel category or add a hotel.`;
    if (list > 0 && list < final) return `${label}: the final price can't be more than the list price.`;
  }
  return null;
}

/** What the customer saves, in rupees and whole percent. */
export function offerDiscount(listPrice: number, finalPrice: number): { amount: number; percent: number } {
  if (listPrice <= 0 || finalPrice <= 0 || listPrice <= finalPrice) return { amount: 0, percent: 0 };
  const amount = listPrice - finalPrice;
  // A real discount never reads as "0% off".
  return { amount, percent: Math.max(1, Math.round((amount / listPrice) * 100)) };
}

/**
 * What each offer is called when its price is listed on its own ("4 Star",
 * "5 Star"): the hotel category, or the offer's name when it has none. Two
 * offers that would read the same are told apart by their names.
 */
export function labelOffers(offers: { title: string; categoryLabel: string }[]): string[] {
  const base = offers.map((o) => o.categoryLabel || o.title || "Package");
  return offers.map((o, i) => {
    const repeated = base.filter((label) => label === base[i]).length > 1;
    return repeated && o.title && o.title !== base[i] ? `${base[i]} - ${o.title}` : base[i];
  });
}

/**
 * The amount to show for a package in a list. A package priced only through
 * its offers has no single total (it is stored as 0), so it shows the lowest
 * offer price instead of "₹0".
 */
export function packageAmountText(totalAmount: number, offers: { finalPrice: number }[]): string {
  if (totalAmount > 0 || offers.length === 0) return `₹${totalAmount.toLocaleString("en-IN")}`;
  const lowest = Math.min(...offers.map((o) => o.finalPrice));
  return `From ₹${lowest.toLocaleString("en-IN")}`;
}

/**
 * A hotel category such as "5 Star" read as a star rating: how many stars,
 * and whatever else the label says ("4 Star - Hill view" -> 4, "Hill view").
 * Null for a label that is not a star category ("Budget").
 */
export function starRating(label: string): { stars: number; rest: string } | null {
  const match = /^\s*([1-7])\s*[- ]?\s*stars?\b[\s\-–:·]*(.*)$/i.exec(label);
  return match ? { stars: Number(match[1]), rest: match[2].trim() } : null;
}

type WithPrices = { listPrice: number; finalPrice: number; priceLines?: OfferLine[] };

/**
 * The offers as the customer sees them: every price with GST added (rounded to
 * whole rupees). Rates get GST one by one, like the package's own per-person
 * rates, and the package price is those rates times the travellers - so what
 * is printed adds up exactly. A price of 0 - "no list price" - stays 0. The
 * discount worked out from these is the discount the customer can check
 * against the prices on the page.
 */
export function offersWithGst<T extends WithPrices>(offers: T[], gstPercent: number): T[] {
  return offers.map((o) => {
    const lines: OfferLine[] = (o.priceLines ?? []).map((l) => ({
      ...l,
      rate: rateWithGst(l.rate, gstPercent),
      ...(l.listRate ? { listRate: rateWithGst(l.listRate, gstPercent) } : {}),
    }));
    const byRates = linesTotal(lines, "rate");
    const listByRates = linesTotal(lines, "listRate");
    return {
      ...o,
      ...(byRates > 0 ? { priceLines: lines } : {}),
      listPrice: listByRates > 0 ? listByRates : o.listPrice > 0 ? rateWithGst(o.listPrice, gstPercent) : 0,
      finalPrice: byRates > 0 ? byRates : rateWithGst(o.finalPrice, gstPercent),
    };
  });
}
