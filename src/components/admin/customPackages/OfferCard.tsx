import { Star } from "lucide-react";
import { formatRupees } from "@/lib/gst";
import { offerDiscount, starRating } from "@/lib/offers";
import type { OfferLine } from "@/lib/offers";

/**
 * One hotel offer as a clean pricing card: the stay and its hotels on top,
 * then the price - the list price struck through, the price to pay, and what
 * the customer saves - and, when shown, who the price is for and what each
 * kind of traveller pays. The discount is a small tag beside the title.
 *
 * Used live beside the offer form and on the package's detail page; the PDF
 * draws the same card in plain HTML (src/lib/pdf/customItineraryHtml.ts).
 * With nothing filled in yet it shows quiet placeholders instead of zeros.
 */
export default function OfferCard({
  categoryLabel,
  title,
  hotels,
  note,
  listPrice,
  finalPrice,
  priceLines = [],
  showTravellers = true,
}: {
  categoryLabel: string;
  title: string;
  hotels: string[];
  note: string;
  listPrice: number;
  finalPrice: number;
  // Who is travelling and each kind's rate per person (as the customer sees it).
  priceLines?: OfferLine[];
  // The offer can leave the group size off, and then nothing that would give
  // it away (head count, per-person rates) is shown.
  showTravellers?: boolean;
}) {
  const { percent } = offerDiscount(listPrice, finalPrice);
  const heading = categoryLabel || title;
  const subheading = categoryLabel && title ? title : "";
  const filledHotels = hotels.map((h) => h.trim()).filter(Boolean);
  const rating = starRating(categoryLabel);
  const rows = showTravellers ? priceLines.filter((l) => l.count > 0) : [];

  return (
    <article className="flex h-full flex-col rounded-xl border border-ink-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className={`flex items-center gap-1.5 font-heading text-lg font-bold leading-snug ${heading ? "text-ink-900" : "text-ink-300"}`}
            >
              {rating && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" strokeWidth={1.5} aria-hidden />}
              {heading || "Hotel category"}
            </h3>
            {subheading && <p className="mt-0.5 text-sm text-ink-500">{subheading}</p>}
          </div>
          {percent > 0 && (
            <span className="shrink-0 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-bold text-white">{percent}% off</span>
          )}
        </div>

        <ul className="mt-4 space-y-2">
          {filledHotels.length > 0 ? (
            filledHotels.map((hotel, i) => (
              <li key={`${hotel}-${i}`} className="flex items-start gap-3 text-sm text-ink-800">
                <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-800" aria-hidden />
                <span className="min-w-0 break-words">{hotel}</span>
              </li>
            ))
          ) : (
            <li className="text-sm text-ink-300">The hotels you add will show here.</li>
          )}
        </ul>
        {note && <p className="mt-3 text-sm leading-relaxed text-ink-500">{note}</p>}
      </div>

      <div className="mt-auto border-t border-ink-100 bg-ink-50/70 px-5 py-4">
        {listPrice > finalPrice && finalPrice > 0 && (
          <p className="text-sm text-ink-400 line-through">{formatRupees(listPrice)}</p>
        )}
        <p className={`font-heading text-3xl font-bold ${finalPrice > 0 ? "text-ink-900" : "text-ink-300"}`}>
          {finalPrice > 0 ? formatRupees(finalPrice) : "Final price"}
        </p>
        {rows.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-ink-600">
            {rows.map((line, i) => (
              <li key={`${line.label}-${i}`} className="flex items-baseline justify-between gap-3">
                <span>
                  {line.label} × {line.count}
                </span>
                <span className="font-semibold text-ink-900">
                  {line.rate > 0 ? `${formatRupees(line.rate)} each` : "Free"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
