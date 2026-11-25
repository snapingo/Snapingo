"use client";

import { Plus, Tag, Trash2, X } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";
import SuggestInput from "@/components/admin/SuggestInput";
import OfferCard from "@/components/admin/customPackages/OfferCard";
import { formatRupees } from "@/lib/gst";
import { MAX_OFFERS, MAX_OFFER_HOTELS, offerDiscount } from "@/lib/offers";

// One offer as the form holds it: prices stay text while being typed.
export type OfferRow = {
  title: string;
  hotelCategory: string;
  hotels: string[];
  note: string;
  listPrice: string;
  finalPrice: string;
};

export const blankOffer = (): OfferRow => ({
  title: "",
  hotelCategory: "",
  hotels: [""],
  note: "",
  listPrice: "",
  finalPrice: "",
});

const inputClass =
  "w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-900";

// A price box: the rupee sign sits inside the field.
function PriceInput({
  label,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">₹</span>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid}
          className={`${inputClass} pl-8 ${invalid ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
        />
      </div>
    </div>
  );
}

/**
 * Hotel offers for the Accommodation section: a 3-star option, a 4-star
 * option, a 5-star option... Each is filled in on the left and shown on the
 * right as the card the customer will see. The discount is worked out from
 * the list and final price as they are typed.
 *
 * The rows live in the parent form (like the itinerary days) so they are part
 * of its saved draft; they travel in one hidden JSON field.
 */
export default function OffersEditor({
  rows,
  onChange,
  hotelCategories,
  hotelSuggestions,
}: {
  rows: OfferRow[];
  onChange: (rows: OfferRow[]) => void;
  hotelCategories: { value: string; label: string }[];
  hotelSuggestions: string[];
}) {
  const update = (index: number, patch: Partial<OfferRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const setHotel = (index: number, hotelIndex: number, value: string) =>
    update(index, { hotels: rows[index].hotels.map((h, i) => (i === hotelIndex ? value : h)) });

  const categoryOptions = [{ value: "", label: "Select hotel category" }, ...hotelCategories];
  const labelOf = (slug: string) => hotelCategories.find((c) => c.value === slug)?.label ?? "";
  const full = rows.length >= MAX_OFFERS;

  return (
    <div>
      <input type="hidden" name="offers" value={JSON.stringify(rows)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-extrabold text-ink-900">Hotel offers</h3>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([...rows, blankOffer()])}
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
            onClick={() => onChange([blankOffer()])}
            className="flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add offer
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {rows.map((row, index) => {
            const list = Number(row.listPrice) || 0;
            const final = Number(row.finalPrice) || 0;
            const { amount, percent } = offerDiscount(list, final);
            const priceProblem = list > 0 && final > 0 && final > list;
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
                          placeholder="Price for the whole group, breakfast included"
                          maxLength={200}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <PriceInput
                          label="Package list price"
                          value={row.listPrice}
                          onChange={(value) => update(index, { listPrice: value })}
                          placeholder="45000"
                        />
                        <PriceInput
                          label="Package final price"
                          value={row.finalPrice}
                          onChange={(value) => update(index, { finalPrice: value })}
                          placeholder="36900"
                          invalid={priceProblem}
                        />
                      </div>
                      <div className="mt-3 flex min-h-9 flex-wrap items-center gap-2 text-sm">
                        {priceProblem ? (
                          <p className="font-medium text-red-600">The final price can&apos;t be more than the list price.</p>
                        ) : percent > 0 ? (
                          <>
                            <span className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-bold text-white">{percent}% off</span>
                            <span className="font-medium text-emerald-700">The customer saves {formatRupees(amount)}.</span>
                          </>
                        ) : (
                          <p className="text-ink-500">Enter a list price above the final price to show a discount.</p>
                        )}
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
                      listPrice={list}
                      finalPrice={final}
                    />
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
