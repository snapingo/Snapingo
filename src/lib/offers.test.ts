import { describe, expect, it } from "vitest";
import { MAX_OFFERS, labelOffers, offerDiscount, packageAmountText, parseOffers, starRating, validateOffers } from "@/lib/offers";

const row = (over: Record<string, unknown> = {}) => ({
  title: "",
  hotelCategory: "3-star",
  hotels: ["The Oberoi Cecil"],
  note: "",
  listPrice: "45000",
  finalPrice: "36900",
  ...over,
});

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

  it("asks for a final price and for something naming the offer", () => {
    expect(validateOffers([row({ finalPrice: "" })])).toBe("Offer 1: enter the final price.");
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
