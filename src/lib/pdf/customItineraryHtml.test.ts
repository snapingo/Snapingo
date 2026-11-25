import { describe, it, expect } from "vitest";
import {
  buildCustomItineraryHtml,
  type CustomItineraryContext,
  type CustomItineraryData,
} from "./customItineraryHtml";

function makeData(overrides: Partial<CustomItineraryData> = {}): CustomItineraryData {
  return {
    tripId: "SNP-2026-0042",
    customerName: "Asha Menon",
    customerPhone: "+91 90000 00000",
    customerEmail: "asha@example.com",
    destinationName: "Manali",
    startDate: new Date("2026-03-04T00:00:00Z"),
    endDate: new Date("2026-03-09T00:00:00Z"),
    durationNights: 5,
    durationDays: 6,
    adults: 2,
    children: 1,
    infants: 0,
    childAges: ["7"],
    rooms: 1,
    extraBeds: 1,
    extraMattresses: 0,
    roomCategoryLabel: "Deluxe",
    hotelCategoryLabel: "4 Star",
    vehicleName: "Innova Crysta",
    price: 60000,
    priceLines: [],
    offers: [],
    showTravellerCount: true,
    gstPercent: 5,
    gstAmount: 3000,
    totalAmount: 63000,
    inclusions: ["Accommodation", "Meals"],
    exclusions: ["Flight", "Visa"],
    days: [{ day: 1, date: new Date("2026-03-04T00:00:00Z"), title: "Arrival", desc: "Check in." }],
    stays: [
      {
        city: "Manali",
        nights: 5,
        days: 6,
        hotelName: "Snow Valley Resort",
        hotelCategoryLabel: "4 Star",
        roomCategoryLabel: "Deluxe",
        rooms: 1,
        extraBed: true,
        extraMattress: false,
      },
    ],
    ...overrides,
  };
}

const context: CustomItineraryContext = {
  blocks: [
    { key: "PDF_TERMS", title: "Terms & Conditions", body: "- Advance Amount is Non-Refundable." },
    { key: "PDF_ABOUT", title: "About Snapingo", body: "" },
  ],
  operationHead: { name: "Ashutosh Pandey", phone: "+91 87077 36609", email: "ops@example.com" },
  preparedBy: null,
};

describe("buildCustomItineraryHtml", () => {
  it("renders the trip's own identifying details", async () => {
    const html = await buildCustomItineraryHtml(makeData(), context);
    expect(html).toContain("SNP-2026-0042");
    expect(html).toContain("Asha Menon");
    expect(html).toContain("Snow Valley Resort");
    expect(html).toContain("Manali · 5 Nights / 6 Days");
    expect(html).toContain("Innova Crysta");
  });

  // Without a per-person breakup the customer sees the GST-inclusive total
  // alone, never the split.
  it("prints only the total, without the GST breakdown", async () => {
    const html = await buildCustomItineraryHtml(makeData(), context);
    expect(html).toContain("₹63,000");
    expect(html).not.toContain("₹60,000");
    expect(html).not.toContain("₹3,000");
    // Inlined images/fonts are base64, which can spell "GST" by chance.
    expect(html.replace(/data:[^")]+/g, "")).not.toMatch(/GST/);
  });

  // Staff enter rates before GST; the customer sees each rate with GST
  // already added and no separate GST line.
  it("prints the per-person breakup with GST included in each rate", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({
        priceLines: [
          { label: "Adult", count: 2, rate: 25000 },
          { label: "Child with bed", count: 1, rate: 10000 },
        ],
      }),
      context
    );
    expect(html).toContain("Price Breakup");
    expect(html).toContain("Adult &times; 2");
    expect(html).toContain("₹26,250");
    expect(html).toContain("₹52,500");
    expect(html).toContain("Child with bed &times; 1");
    expect(html).toContain("₹10,500");
    expect(html).toContain("₹63,000");
    expect(html).toContain("inclusive of GST");
    expect(html).not.toContain("GST (5%)");
    expect(html).not.toContain("₹60,000");
  });

  // Some customers are quoted per person without the group size on paper.
  it("leaves the number of travellers off when asked to", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({ showTravellerCount: false, priceLines: [{ label: "Adult", count: 2, rate: 25000 }] }),
      context
    );
    // Only the total: no per-person rate, no head count, no Amount column.
    expect(html).toContain("Total Price");
    expect(html).toContain("₹63,000");
    expect(html).not.toContain("₹26,250");
    expect(html).not.toContain("₹52,500");
    expect(html).not.toContain("Rate / Person");
    expect(html).not.toContain("per person");
    expect(html).not.toContain("&times; 2");
    expect(html).not.toContain("2 Adults");
    expect(html).not.toContain("Child Ages");
  });

  // Hotel offers print in the same single PDF, each as a card with the
  // discount worked out from its two prices.
  it("prints hotel offers with the discount worked out", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({
        offers: [
          { title: "Hill view", categoryLabel: "3 Star", hotels: ["Hotel A", "Hotel B"], note: "Breakfast included", listPrice: 45000, finalPrice: 36900, priceLines: [], showTravellers: true },
          { title: "", categoryLabel: "5 Star", hotels: ["Hotel C"], note: "", listPrice: 0, finalPrice: 80000, priceLines: [], showTravellers: true },
        ],
      }),
      context
    );
    expect(html).toContain("Hotel Offers");
    expect(html).toContain("3 Star");
    expect(html).toContain("Hill view");
    expect(html).toContain("Hotel A");
    expect(html).toContain("Breakfast included");
    // 45,000 -> 36,900 is 18% off, saving 8,100.
    expect(html).toContain("₹45,000");
    expect(html).toContain("₹36,900");
    expect(html).toContain("18%");
    // An offer without a list price shows its price and no discount.
    expect(html).toContain("₹80,000");
    expect(html.match(/class="offer-off"/g)).toHaveLength(1);
    expect(html.match(/class="offer-was"/g)).toHaveLength(1);
  });

  // The offers carry the package price, so there is no single total to show.
  it("shows each offer price instead of a total when there are offers", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({
        priceLines: [{ label: "Adult", count: 2, rate: 25000 }],
        offers: [
          { title: "", categoryLabel: "4 Star", hotels: ["Hotel A"], note: "", listPrice: 0, finalPrice: 35000, priceLines: [], showTravellers: true },
          { title: "", categoryLabel: "5 Star", hotels: ["Hotel B"], note: "", listPrice: 0, finalPrice: 50000, priceLines: [], showTravellers: true },
        ],
      }),
      context
    );
    // One price box per offer under the title...
    expect(html.match(/class="tier-label"/g)).toHaveLength(2);
    // "Package price" is written above each price.
    expect(html.match(/class="tier-caption">Package price/g)).toHaveLength(2);
    expect(html).toContain("₹35,000");
    expect(html).toContain("₹50,000");
    // ...and no total anywhere: not in the banner, not in a breakup.
    expect(html).not.toContain("Total Price");
    expect(html).not.toContain("Price Breakup");
    expect(html).not.toContain("Rate / Person");
    expect(html).not.toContain("₹63,000");
  });

  // A star category gets that many gold stars, in the price box and on its card.
  it("shows the star count in the price box and a single star on the card", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({
        offers: [
          { title: "", categoryLabel: "4 Star", hotels: ["Hotel A"], note: "", listPrice: 0, finalPrice: 35000, priceLines: [], showTravellers: true },
          { title: "", categoryLabel: "5 Star", hotels: ["Hotel B"], note: "", listPrice: 0, finalPrice: 50000, priceLines: [], showTravellers: true },
          { title: "", categoryLabel: "Budget", hotels: ["Hotel C"], note: "", listPrice: 0, finalPrice: 20000, priceLines: [], showTravellers: true },
        ],
      }),
      context
    );
    // The price boxes read "4 ★" and "5 ★" (one star each) and each card has a single star beside its name.
    // "Budget" has none.
    expect(html.match(/<polygon/g)).toHaveLength(2 + 2);
    expect(html).toContain('<span class="rating"><b>5</b>');
    expect(html).toContain('<span class="rating"><b>4</b>');
    expect(html).toContain("Budget");
  });

  // Each offer lists who is travelling and what each kind pays per person.
  it("lists each kind of traveller with its rate on an offer", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({
        offers: [
          {
            title: "",
            categoryLabel: "4 Star",
            hotels: ["Hotel A"],
            note: "",
            listPrice: 0,
            finalPrice: 27500,
            priceLines: [
              { label: "Adult", count: 3, rate: 6500 },
              { label: "Child with bed", count: 2, rate: 4000 },
              { label: "Infant", count: 1, rate: 0 },
            ],
            showTravellers: true,
          },
        ],
      }),
      context
    );
    expect(html).toContain("Adult &times; 3");
    expect(html).toContain("\u20B96,500 each");
    expect(html).toContain("Child with bed &times; 2");
    expect(html).toContain("\u20B94,000 each");
    // A free infant says so rather than printing a zero.
    expect(html).toContain("Infant &times; 1");
    expect(html).toContain("Free");
  });

  it("leaves the travellers and their rates off an offer set to hide them", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({
        offers: [
          {
            title: "", categoryLabel: "4 Star", hotels: ["Hotel A"], note: "", listPrice: 0, finalPrice: 36000,
            priceLines: [{ label: "Adult", count: 4, rate: 9000 }], showTravellers: false,
          },
          {
            title: "", categoryLabel: "5 Star", hotels: ["Hotel B"], note: "", listPrice: 0, finalPrice: 60000,
            priceLines: [{ label: "Adult", count: 4, rate: 15000 }], showTravellers: true,
          },
        ],
      }),
      context
    );
    // Only the second offer says who it is for.
    expect(html.match(/class="offer-lines"/g)).toHaveLength(1);
    expect(html).toContain("\u20B915,000 each");
    expect(html).not.toContain("\u20B99,000 each");
    // Both still show their package prices.
    expect(html).toContain("\u20B936,000");
    expect(html).toContain("\u20B960,000");
  });

  it("follows the offer, not the package, on whether to show the travellers", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({
        showTravellerCount: false,
        offers: [
          {
            title: "", categoryLabel: "4 Star", hotels: ["Hotel A"], note: "", listPrice: 0, finalPrice: 36000,
            priceLines: [{ label: "Adult", count: 4, rate: 9000 }], showTravellers: true,
          },
        ],
      }),
      context
    );
    expect(html).toContain("\u20B99,000 each");
  });

  it("shows no rows for an offer saved as a single total", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({
        offers: [{ title: "", categoryLabel: "4 Star", hotels: ["Hotel A"], note: "", listPrice: 0, finalPrice: 36000, priceLines: [], showTravellers: true }],
      }),
      context
    );
    expect(html).not.toContain('class="offer-lines"');
    expect(html).toContain("\u20B936,000");
  });

  it("still shows the total when there are no offers", async () => {
    const html = await buildCustomItineraryHtml(makeData({ offers: [] }), context);
    expect(html).toContain("Total Price");
    expect(html).toContain("₹63,000");
  });

  it("leaves the offers section out when there are none", async () => {
    const html = await buildCustomItineraryHtml(makeData({ offers: [] }), context);
    expect(html).not.toContain("Hotel Offers");
    expect(html).not.toContain('class="offers"');
  });

  it("escapes what staff typed into an offer", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({
        offers: [{ title: "<b>x</b>", categoryLabel: "", hotels: ["<script>alert(1)</script>"], note: "", listPrice: 0, finalPrice: 5000, priceLines: [], showTravellers: true }],
      }),
      context
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  // The quotation is a customer-facing document assembled by string
  // concatenation: an unescaped angle bracket in a hotel name would break the
  // markup, and a pasted <script> would run inside the rendering browser.
  it("escapes everything staff typed", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({
        customerName: '<script>alert("x")</script>',
        stays: [
          {
            city: "A & B",
            nights: 1,
            days: null,
            hotelName: 'The "Grand" <Hotel>',
            hotelCategoryLabel: null,
            roomCategoryLabel: null,
            rooms: 1,
            extraBed: false,
            extraMattress: false,
          },
        ],
      }),
      context
    );

    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("The &quot;Grand&quot; &lt;Hotel&gt;");
    expect(html).toContain("A &amp; B");
  });

  it("renders a content block's bullets and skips one with an empty body", async () => {
    const html = await buildCustomItineraryHtml(makeData(), context);
    expect(html).toContain("Advance Amount is Non-Refundable.");
    // The About block has no body, so its heading must not appear either.
    expect(html).not.toContain("About Snapingo");
  });

  it("omits the coordinator card when no operation head is configured", async () => {
    const html = await buildCustomItineraryHtml(makeData(), {
      ...context,
      operationHead: { name: "", phone: "", email: "" },
    });
    expect(html).not.toContain("Operation Head</p>");
  });

  // No hotels entered: like the website PDF, a "handpicked hotels" line
  // stands in for the table rather than an empty one.
  it("prints who prepared it under the operation head, or nothing when unnamed", async () => {
    const html = await buildCustomItineraryHtml(makeData(), {
      ...context,
      preparedBy: { name: "Riya Kapoor", role: "Travel Executive" },
    });
    expect(html).toContain("Prepared By");
    expect(html).toContain("Riya Kapoor");
    expect(html).toContain("Travel Executive");
    expect(html.indexOf("Prepared By")).toBeGreaterThan(html.indexOf("Ashutosh Pandey"));

    expect(await buildCustomItineraryHtml(makeData(), context)).not.toContain("Prepared By");
  });

  it("still produces a document when there are no stays or inclusions", async () => {
    const html = await buildCustomItineraryHtml(
      makeData({ stays: [], inclusions: [], exclusions: [] }),
      context
    );
    expect(html).toContain("<!doctype html>");
    expect(html).not.toContain('<table class="stays">');
    expect(html).toContain("Handpicked");
  });

  it("inlines the logo, watermarks and font so the renderer needs no network", async () => {
    const html = await buildCustomItineraryHtml(makeData(), context);
    expect(html).toContain("data:image/png;base64,");
    expect(html).toContain('class="wm-icon"');
    expect(html).toContain('class="wm-mountains"');
    expect(html).toContain("data:font/ttf;base64,");
  });
});
