import { describe, expect, it } from "vitest";
import {
  MAX_OFFERS,
  labelOffers,
  offerDiscount,
  offersWithGst,
  packageAmountText,
  parseOffers,
  starRating,
  validateOffers,
} from "@/lib/offers";

// A form row: prices as text, the way they are posted.
const row = (over: Record<string, unknown> = {}) => ({
  title: "",
  hotelCategory: "3-star",
  hotels: ["The Oberoi Cecil"],
  note: "",
  listPrice: "45000",
  finalPrice: "36900",
  ...over,
});

const lines = (...l: [string, number, number][]) => l.map(([label, count, rate]) => ({ label, count, rate }));

describe("offer discount", () => {
  it("works the percentage out from the two prices", () => {
    expect(offerDiscount(45000, 36900)).toEqual({ amount: 8100, percent: 18 });
    expect(offerDiscount(10000, 7500)).toEqual({ amount: 2500, percent: 25 });
  });

  it("shows no discount without a list price or when the price is not lower", () => {
    expect(offerDiscount(0, 36900)).toEqual({ amount: 0, percent: 0 });
    expect(offerDiscount(36900, 36900)).toEqual({ amount: 0, percent: 0 });
    expect(offerDiscount(30000, 36900)).toEqual({ amount: 0, percent: 0 });
  });

  it("never rounds a real discount down to nothing", () => {
    expect(offerDiscount(100000, 99900).percent).toBe(1);
  });
});

describe("offer pricing by traveller type", () => {
  it("prices the package as rates times travellers", () => {
    const [offer] = parseOffers([
      row({ finalPrice: "", priceLines: lines(["Adult", 3, 6500], ["Child with bed", 2, 4000], ["Infant", 1, 0]) }),
    ]);
    // 3 x 6,500 + 2 x 4,000 + 1 x 0
    expect(offer.finalPrice).toBe(27500);
    expect(offer.priceLines).toHaveLength(3);
  });

  it("works the price out itself rather than trusting the form's total", () => {
    const [offer] = parseOffers([row({ finalPrice: "99999", priceLines: lines(["Adult", 2, 5000]) })]);
    expect(offer.finalPrice).toBe(10000);
  });

  it("keeps the total of an offer saved without rates", () => {
    const [offer] = parseOffers([row()]);
    expect(offer.priceLines).toEqual([]);
    expect(offer.finalPrice).toBe(36900);
  });

  it("shows travellers unless the offer says not to", () => {
    expect(parseOffers([row()])[0].showTravellers).toBe(true);
    expect(parseOffers([row({ showTravellers: true })])[0].showTravellers).toBe(true);
    expect(parseOffers([row({ showTravellers: false })])[0].showTravellers).toBe(false);
    expect(parseOffers([row({ showTravellers: "false" })])[0].showTravellers).toBe(false);
  });
});

describe("list and final rates", () => {
  const withListRates = (...l: [string, number, number, number][]) =>
    l.map(([label, count, listRate, rate]) => ({ label, count, listRate, rate }));

  it("adds up the list price and the final price from each kind of traveller", () => {
    const [offer] = parseOffers([
      row({
        listPrice: "",
        finalPrice: "",
        priceLines: withListRates(["Adult", 3, 10000, 8000], ["Child with bed", 2, 7000, 6000]),
      }),
    ]);
    // List: 3 x 10,000 + 2 x 7,000. Final: 3 x 8,000 + 2 x 6,000.
    expect(offer.listPrice).toBe(44000);
    expect(offer.finalPrice).toBe(36000);
  });

  it("works the list price out from the rates rather than trusting the posted one", () => {
    const [offer] = parseOffers([row({ listPrice: "1", priceLines: withListRates(["Adult", 2, 9000, 7000]) })]);
    expect(offer.listPrice).toBe(18000);
  });

  it("keeps the posted list price for an offer with no list rates", () => {
    const [offer] = parseOffers([row({ listPrice: "45000", priceLines: lines(["Adult", 2, 5000]) })]);
    expect(offer.listPrice).toBe(45000);
    expect(offer.finalPrice).toBe(10000);
  });

  it("judges the discount from the rates", () => {
    // List 3 x 9,000 = 27,000 is below the final 3 x 10,000 = 30,000.
    expect(validateOffers([row({ listPrice: "", finalPrice: "", priceLines: withListRates(["Adult", 3, 9000, 10000]) })])).toBe(
      "Offer 1: the final price can't be more than the list price."
    );
    expect(validateOffers([row({ listPrice: "", finalPrice: "", priceLines: withListRates(["Adult", 3, 12000, 10000]) })])).toBeNull();
  });

  it("adds GST to the list rates too, so the printed rows and totals add up", () => {
    const [offer] = offersWithGst(
      [{ listPrice: 0, finalPrice: 0, priceLines: withListRates(["Adult", 2, 10000, 8000]) }],
      5
    );
    expect(offer.priceLines).toEqual(withListRates(["Adult", 2, 10500, 8400]));
    expect(offer.listPrice).toBe(21000);
    expect(offer.finalPrice).toBe(16800);
    expect(offerDiscount(offer.listPrice, offer.finalPrice)).toEqual({ amount: 4200, percent: 20 });
  });
});

describe("parseOffers", () => {
  it("cleans a row and turns prices into numbers", () => {
    const [offer] = parseOffers([row({ title: "  Hill stay ", hotels: [" A ", "", "B"] })]);
    expect(offer).toMatchObject({ title: "Hill stay", hotels: ["A", "B"], listPrice: 45000, finalPrice: 36900 });
  });

  it("drops blank rows and rows with no price to pay", () => {
    expect(parseOffers([row({ finalPrice: "" }), { title: "", hotels: [], listPrice: "", finalPrice: "" }])).toEqual([]);
  });

  it("keeps an offer with no list price", () => {
    expect(parseOffers([row({ listPrice: "" })])[0].listPrice).toBe(0);
  });

  it("holds at most the maximum number of offers", () => {
    expect(parseOffers(Array.from({ length: 15 }, () => row()))).toHaveLength(MAX_OFFERS);
  });

  it("ignores anything that is not a list", () => {
    expect(parseOffers(null)).toEqual([]);
    expect(parseOffers("x")).toEqual([]);
  });
});

describe("validateOffers", () => {
  it("accepts good offers and untouched blank rows", () => {
    expect(validateOffers([row(), { title: "", hotelCategory: "", hotels: [""], listPrice: "", finalPrice: "" }])).toBeNull();
    expect(validateOffers([])).toBeNull();
  });

  it("says which offer has a final price above its list price", () => {
    expect(validateOffers([row(), row({ listPrice: "30000", finalPrice: "36900" })])).toBe(
      "Offer 2: the final price can't be more than the list price."
    );
  });

  it("judges the final price from the rates, not the posted total", () => {
    // 3 x 15,000 = 45,000 against a 40,000 list price.
    expect(validateOffers([row({ listPrice: "40000", finalPrice: "1", priceLines: lines(["Adult", 3, 15000]) })])).toBe(
      "Offer 1: the final price can't be more than the list price."
    );
    expect(validateOffers([row({ listPrice: "50000", finalPrice: "", priceLines: lines(["Adult", 3, 15000]) })])).toBeNull();
  });

  it("asks for a rate and for something naming the offer", () => {
    expect(validateOffers([row({ finalPrice: "" })])).toBe("Offer 1: enter the rate per person.");
    expect(validateOffers([{ title: "", hotelCategory: "", hotels: [], listPrice: "", finalPrice: "5000" }])).toBe(
      "Offer 1: choose a hotel category or add a hotel."
    );
  });

  it("rejects more offers than allowed", () => {
    expect(validateOffers(Array.from({ length: MAX_OFFERS + 1 }, () => row()))).toMatch(/at most 10/);
  });
});

describe("labelOffers", () => {
  it("names each offer by its hotel category", () => {
    expect(
      labelOffers([
        { title: "Hill view", categoryLabel: "4 Star" },
        { title: "", categoryLabel: "5 Star" },
      ])
    ).toEqual(["4 Star", "5 Star"]);
  });

  it("falls back to the offer name, and tells repeated categories apart", () => {
    expect(labelOffers([{ title: "Budget", categoryLabel: "" }])).toEqual(["Budget"]);
    expect(
      labelOffers([
        { title: "Hill view", categoryLabel: "4 Star" },
        { title: "Lake view", categoryLabel: "4 Star" },
      ])
    ).toEqual(["4 Star - Hill view", "4 Star - Lake view"]);
  });
});

describe("packageAmountText", () => {
  it("shows the total, or the lowest offer when the package has no total of its own", () => {
    expect(packageAmountText(34125, [])).toBe("₹34,125");
    expect(packageAmountText(34125, [{ finalPrice: 20000 }])).toBe("₹34,125");
    expect(packageAmountText(0, [{ finalPrice: 50000 }, { finalPrice: 35000 }])).toBe("From ₹35,000");
    expect(packageAmountText(0, [])).toBe("₹0");
  });
});

describe("starRating", () => {
  it("reads the number of stars from a hotel category", () => {
    expect(starRating("5 Star")).toEqual({ stars: 5, rest: "" });
    expect(starRating("3 star")).toEqual({ stars: 3, rest: "" });
    expect(starRating("4-Star")).toEqual({ stars: 4, rest: "" });
    expect(starRating("4 Star - Hill view")).toEqual({ stars: 4, rest: "Hill view" });
  });

  it("is null for anything that is not a star category", () => {
    expect(starRating("Budget")).toBeNull();
    expect(starRating("Luxury")).toBeNull();
    expect(starRating("")).toBeNull();
    expect(starRating("10 Stars")).toBeNull();
  });
});

describe("offersWithGst", () => {
  it("adds GST to a single-total offer", () => {
    expect(offersWithGst([{ listPrice: 50000, finalPrice: 40000 }], 5)).toEqual([{ listPrice: 52500, finalPrice: 42000 }]);
  });

  it("rounds to whole rupees and leaves a missing list price at zero", () => {
    // 36,901 x 1.05 = 38,746.05
    expect(offersWithGst([{ listPrice: 0, finalPrice: 36901 }], 5)).toEqual([{ listPrice: 0, finalPrice: 38746 }]);
  });

  it("adds GST to each rate and prices the package from them, so the printed rows add up", () => {
    const [offer] = offersWithGst(
      [{ listPrice: 0, finalPrice: 0, priceLines: lines(["Adult", 3, 6501], ["Infant", 1, 0]) }],
      5
    );
    // 6,501 x 1.05 = 6,826.05 -> 6,826 each; 3 x 6,826 = 20,478.
    expect(offer.priceLines).toEqual(lines(["Adult", 3, 6826], ["Infant", 1, 0]));
    expect(offer.finalPrice).toBe(20478);
  });

  it("works the discount out from the prices the customer sees", () => {
    const [offer] = offersWithGst([{ listPrice: 50000, finalPrice: 40000 }], 5);
    expect(offerDiscount(offer.listPrice, offer.finalPrice)).toEqual({ amount: 10500, percent: 20 });
  });

  it("changes nothing at 0% GST", () => {
    expect(offersWithGst([{ listPrice: 100, finalPrice: 80 }], 0)).toEqual([{ listPrice: 100, finalPrice: 80 }]);
  });
});
