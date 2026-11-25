"use client";

import { Plus, Tag, Trash2, X } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import SuggestInput from "@/components/admin/SuggestInput";
import OfferCard from "@/components/admin/customPackages/OfferCard";
import { formatRupees } from "@/lib/gst";
import { MAX_OFFERS, MAX_OFFER_HOTELS, offersWithGst } from "@/lib/offers";
import { MAX_PRICE_LINES, rateWithGst } from "@/lib/priceLines";

// One kind of traveller in an offer's price: how many, the rate each pays
// (final) and the rate before the offer (list). `custom`: staff picked
// "Other" and type the name themselves.
export type OfferPriceRow = { label: string; count: string; rate: string; listRate: string; custom?: boolean };

// One offer as the form holds it: prices stay text while being typed.
export type OfferRow = {
  title: string;
  hotelCategory: string;
  hotels: string[];
  note: string;
  priceRows: OfferPriceRow[];
  // Whether the PDF shows who is travelling and the rate for each.
  showTravellers: boolean;
};

/** The package's own travellers, which a new offer's price rows start from. */
export type PackageTravellers = { adults: number; children: number; infants: number };

export const blankOffer = (travellers: PackageTravellers, showTravellers = true): OfferRow => {
  const rows: OfferPriceRow[] = [
    { label: "Adult", count: String(travellers.adults), rate: "", listRate: "" },
    { label: "Child", count: String(travellers.children), rate: "", listRate: "" },
    { label: "Infant", count: String(travellers.infants), rate: "", listRate: "" },
  ].filter((r) => Number(r.count) > 0);
  return {
    title: "",
    hotelCategory: "",
    hotels: [""],
    note: "",
    priceRows: rows.length > 0 ? rows : [{ label: "Adult", count: "1", rate: "", listRate: "" }],
    showTravellers,
  };
};

const inputClass =
  "w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-900";

// The usual ways a quote is split per person, as on the package's own Pricing.
const TRAVELLER_TYPES = ["Adult", "Extra adult", "Child", "Child with bed", "Child without bed", "Infant"];
const OTHER_TYPE = "__other__";
const travellerTypeOptions = [
  ...TRAVELLER_TYPES.map((t) => ({ value: t, label: t })),
  { value: OTHER_TYPE, label: "Other" },
];
// Traveller type, travellers, list rate, final rate, final with GST, remove.
const PRICE_ROW_GRID = "grid grid-cols-[minmax(0,1fr)_92px_148px_148px_128px_32px] items-center gap-x-6 gap-y-3";

/**
 * Hotel offers for the Accommodation section: a 3-star option, a 4-star
 * option, a 5-star option... Each is filled in on the left and shown on the
 * right as the card the customer will see.
 *
 * An offer is priced like the package: a row per kind of traveller with how
 * many, the list rate and the final rate per person (before GST). The package
 * list price and final price are those added up, and the discount is worked
 * out from the two as they are typed.
 *
 * The rows live in the parent form (like the itinerary days) so they are part
 * of its saved draft; they travel in one hidden JSON field.
 */
export default function OffersEditor({
  rows,
  onChange,
  hotelCategories,
  hotelSuggestions,
  gstPercent,
  packageTravellers,
  showTravellers,
}: {
  rows: OfferRow[];
  onChange: (rows: OfferRow[]) => void;
  hotelCategories: { value: string; label: string }[];
  hotelSuggestions: string[];
  // Prices are entered before GST; the customer sees them with it added.
  gstPercent: number;
  // The package's own Travellers, which a new offer's price rows start from.
  packageTravellers: PackageTravellers;
  // A new offer starts with the package's own choice about showing the group
  // size on the PDF (its Yes/No under Pricing); each offer can then differ.
  showTravellers: boolean;
}) {
  const update = (index: number, patch: Partial<OfferRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const setHotel = (index: number, hotelIndex: number, value: string) =>
    update(index, { hotels: rows[index].hotels.map((h, i) => (i === hotelIndex ? value : h)) });
  const updatePriceRow = (index: number, priceIndex: number, patch: Partial<OfferPriceRow>) =>
    update(index, { priceRows: rows[index].priceRows.map((p, i) => (i === priceIndex ? { ...p, ...patch } : p)) });

  const categoryOptions = [{ value: "", label: "Select hotel category" }, ...hotelCategories];
  const labelOf = (slug: string) => hotelCategories.find((c) => c.value === slug)?.label ?? "";
  const full = rows.length >= MAX_OFFERS;
  const addOffer = () => onChange([...rows, blankOffer(packageTravellers, showTravellers)]);

  // The rows as numbers, and the list and final prices they add up to.
  const linesOf = (row: OfferRow) =>
    row.priceRows.map((p) => ({
      label: p.label,
      count: Number(p.count) || 0,
      rate: Number(p.rate) || 0,
      listRate: Number(p.listRate) || 0,
    }));
  const totalsOf = (row: OfferRow) => {
    const lines = linesOf(row);
    return {
      lines,
      list: lines.reduce((sum, l) => sum + l.count * l.listRate, 0),
      final: lines.reduce((sum, l) => sum + l.count * l.rate, 0),
    };
  };

  // What is posted.
  const toPosted = (row: OfferRow) => {
    const { lines, list, final } = totalsOf(row);
    return {
      title: row.title,
      hotelCategory: row.hotelCategory,
      hotels: row.hotels,
      note: row.note,
      listPrice: String(list),
      finalPrice: String(final),
      priceLines: lines,
      showTravellers: row.showTravellers,
    };
  };

  return (
    <div>
      <input type="hidden" name="offers" value={JSON.stringify(rows.map(toPosted))} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-extrabold text-ink-900">Hotel offers</h3>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={addOffer}
            disabled={full}
            title={full ? `At most ${MAX_OFFERS} offers` : undefined}
            className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add offer
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-300 bg-ink-50/50 px-6 py-10 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink-500 ring-1 ring-ink-200">
            <Tag className="h-5 w-5" aria-hidden />
          </span>
          <p className="max-w-sm text-sm text-ink-600">No offers on this package yet. Add one for each hotel category you want to offer.</p>
          <button
            type="button"
            onClick={addOffer}
            className="flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add offer
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {rows.map((row, index) => {
            const { lines, list, final } = totalsOf(row);
            const priceProblem = list > 0 && final > 0 && final > list;
            // What the customer will see: each rate and price with GST added.
            const [shown] = offersWithGst([{ listPrice: list, finalPrice: final, priceLines: lines }], gstPercent);
            const name = [labelOf(row.hotelCategory), row.title.trim()].filter(Boolean).join(" · ");

            return (
              <section key={index} className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <p className="truncate font-heading text-base font-bold text-ink-900">
                      Offer {index + 1}
                      {name && <span className="font-medium text-ink-500"> - {name}</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(rows.filter((_, i) => i !== index))}
                    className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
                  <div className="space-y-6">
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>Hotel category</label>
                          <CustomSelect
                            value={row.hotelCategory}
                            onChange={(value) => update(index, { hotelCategory: value })}
                            placeholder="Select hotel category"
                            options={categoryOptions}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Offer name (optional)</label>
                          <input
                            value={row.title}
                            onChange={(e) => update(index, { title: e.target.value })}
                            placeholder="Mountain view stay"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Hotels in this offer</label>
                        <div className="space-y-2">
                          {row.hotels.map((hotel, hotelIndex) => (
                            <div key={hotelIndex} className="flex items-center gap-2">
                              <SuggestInput
                                value={hotel}
                                onChange={(value) => setHotel(index, hotelIndex, value)}
                                suggestions={hotelSuggestions}
                                placeholder="Hotel name"
                                className={inputClass}
                              />
                              {row.hotels.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => update(index, { hotels: row.hotels.filter((_, i) => i !== hotelIndex) })}
                                  aria-label="Remove hotel"
                                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {row.hotels.length < MAX_OFFER_HOTELS && (
                          <button
                            type="button"
                            onClick={() => update(index, { hotels: [...row.hotels, ""] })}
                            className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
                          >
                            <Plus className="h-4 w-4" />
                            Add hotel
                          </button>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>Note (optional)</label>
                        <input
                          value={row.note}
                          onChange={(e) => update(index, { note: e.target.value })}
                          placeholder="Breakfast included"
                          maxLength={200}
                          className={inputClass}
                        />
                      </div>
                    </div>

                  </div>

                  <div className="lg:self-start">
                    <p className="mb-2 text-sm font-semibold text-ink-700">Preview</p>
                    <OfferCard
                      categoryLabel={labelOf(row.hotelCategory)}
                      title={row.title.trim()}
                      hotels={row.hotels}
                      note={row.note.trim()}
                      listPrice={shown.listPrice}
                      finalPrice={shown.finalPrice}
                      priceLines={shown.priceLines ?? []}
                      showTravellers={row.showTravellers}
                    />
                  </div>
                </div>

                {/* Full width, under both columns. */}
                <div className="mt-8">
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-900">Per-person price</p>
                        {/* One header row and fixed columns, as on the package's Pricing. */}
                        <div className="overflow-x-auto rounded-xl border border-ink-200">
                          <div className="min-w-[820px]">
                            <div className={`${PRICE_ROW_GRID} border-b border-ink-200 bg-ink-50/60 px-4 py-3 text-[15px] font-bold text-ink-900`}>
                              <span>Traveller type</span>
                              <span>Travellers</span>
                              <span>List rate</span>
                              <span>Final rate</span>
                              <span className="text-right">With GST</span>
                              <span aria-hidden />
                            </div>
                            <div>
                              {row.priceRows.map((p, priceIndex) => {
                                const rate = Number(p.rate) || 0;
                                const amount = (Number(p.count) || 0) * rateWithGst(rate, gstPercent);
                                return (
                                  <div key={priceIndex} className={`${PRICE_ROW_GRID} px-4 py-3`}>
                                    <div className="min-w-0">
                                      {p.custom ? (
                                        <input
                                          value={p.label}
                                          onChange={(e) => updatePriceRow(index, priceIndex, { label: e.target.value })}
                                          // Emptied: back to the list.
                                          onBlur={() => !p.label.trim() && updatePriceRow(index, priceIndex, { custom: false, label: "" })}
                                          autoFocus={!p.label}
                                          placeholder="Type traveller type"
                                          aria-label="Traveller type"
                                          className={inputClass}
                                        />
                                      ) : (
                                        <CustomSelect
                                          value={p.label}
                                          onChange={(v) =>
                                            updatePriceRow(index, priceIndex, v === OTHER_TYPE ? { custom: true, label: "" } : { label: v })
                                          }
                                          placeholder="Select type"
                                          options={travellerTypeOptions}
                                        />
                                      )}
                                    </div>
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.count}
                                      onChange={(e) => updatePriceRow(index, priceIndex, { count: e.target.value })}
                                      aria-label="Number of travellers"
                                      className={inputClass}
                                    />
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.listRate}
                                      onChange={(e) => updatePriceRow(index, priceIndex, { listRate: e.target.value })}
                                      placeholder="0"
                                      aria-label="List rate per person"
                                      className={inputClass}
                                    />
                                    <input
                                      type="number"
                                      min={0}
                                      value={p.rate}
                                      onChange={(e) => updatePriceRow(index, priceIndex, { rate: e.target.value })}
                                      placeholder="0"
                                      aria-label="Final rate per person"
                                      aria-invalid={Number(p.listRate) > 0 && rate > Number(p.listRate)}
                                      className={inputClass}
                                    />
                                    <div className="flex flex-col justify-center whitespace-nowrap text-right leading-tight">
                                      <span className="text-sm font-semibold text-ink-900">{formatRupees(amount)}</span>
                                      {Number(p.count) > 1 && rate > 0 && (
                                        <span className="mt-0.5 text-[11px] text-ink-500">{formatRupees(rateWithGst(rate, gstPercent))} / person</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => update(index, { priceRows: row.priceRows.filter((_, i) => i !== priceIndex) })}
                                      aria-label="Remove row"
                                      className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                            {row.priceRows.length < MAX_PRICE_LINES && (
                              <button
                                type="button"
                                onClick={() =>
                                  update(index, { priceRows: [...row.priceRows, { label: "", count: "1", rate: "", listRate: "" }] })
                                }
                                className="flex w-full items-center gap-1.5 px-4 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50/50 hover:text-brand-700"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add traveller type
                              </button>
                            )}
                            {/* The package totals, as the customer will see them. */}
                            <div className="border-t border-ink-200 bg-ink-50/60">
                              <div className={`${PRICE_ROW_GRID} px-4 py-2.5`}>
                                <span className="text-sm font-semibold text-ink-700">Package list price</span>
                                <span aria-hidden />
                                <span aria-hidden />
                                <span aria-hidden />
                                <span
                                  className={`text-right text-sm font-semibold ${
                                    shown.listPrice > shown.finalPrice ? "text-ink-400 line-through" : "text-ink-900"
                                  }`}
                                >
                                  {shown.listPrice > 0 ? formatRupees(shown.listPrice) : "-"}
                                </span>
                                <span aria-hidden />
                              </div>
                              <div className={`${PRICE_ROW_GRID} px-4 py-3`}>
                                <span className="text-sm font-bold text-ink-900">Package final price</span>
                                <span aria-hidden />
                                <span aria-hidden />
                                <span aria-hidden />
                                <span className="text-right font-heading text-base font-bold text-brand-600">
                                  {formatRupees(shown.finalPrice)}
                                </span>
                                <span aria-hidden />
                              </div>
                            </div>
                          </div>
                        </div>
                        {priceProblem && (
                          <p className="mt-3 text-sm font-medium text-red-600">The final price can&apos;t be more than the list price.</p>
                        )}
                      </div>

                      {/* The divider sits on a wrapper: on the fieldset itself the
                          browser draws its border through the legend. */}
                      <div>
                        <fieldset>
                          <legend className="text-sm font-medium text-ink-900">Show number of travellers on the itinerary?</legend>
                          <div className="mt-2 inline-flex rounded-lg border border-ink-200 p-0.5">
                            {[
                              { value: true, label: "Show" },
                              { value: false, label: "Hide" },
                            ].map((opt) => (
                              <button
                                key={opt.label}
                                type="button"
                                aria-pressed={row.showTravellers === opt.value}
                                onClick={() => update(index, { showTravellers: opt.value })}
                                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                                  row.showTravellers === opt.value ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      </div>
                    </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
