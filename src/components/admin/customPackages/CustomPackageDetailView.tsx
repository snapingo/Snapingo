import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, CalendarPlus, Download, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { canUseStaffFeature, getSession } from "@/lib/dal";
import { canEditCustomPackage } from "@/lib/customPackageAccess";
import RestoreButton from "@/components/admin/RestoreButton";
import AddPackageButton from "@/components/admin/customPackages/AddPackageButton";
import DeletePackageButton from "@/components/admin/customPackages/DeletePackageButton";
import OfferCard from "@/components/admin/customPackages/OfferCard";
import { offersWithGst, packageAmountText, parseOffers } from "@/lib/offers";
import { MAX_PACKAGES_PER_TRIP, packageLabel } from "@/lib/tripPackages";
import { restoreCustomPackageAction } from "@/lib/actions/customPackages";
import { formatRupees } from "@/lib/gst";
import { parsePriceLines, priceLineAmount } from "@/lib/priceLines";
import { getMasterList } from "@/lib/masterData";
import { getEffectiveExclusions, resolveInclusions } from "@/lib/inclusionHelpers";
import { isEmailConfigured } from "@/lib/email";
import SendEmailPanel from "@/components/admin/SendEmailPanel";
import { sendItineraryEmailAction } from "@/lib/actions/email";

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// One section of the single page card - sections are split by dividers
// rather than each sitting in a card of its own.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-6">
      <h2 className="font-heading text-xl font-extrabold text-ink-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function CustomPackageDetailView({
  basePath,
  id,
}: {
  basePath: string;
  id: string;
}) {
  const [quotation, inclusionOptions, roomOptions, hotelOptions, canBook] = await Promise.all([
    db.customPackage.findUnique({
      where: { id },
      include: {
        days: { orderBy: { day: "asc" } },
        stays: { orderBy: { order: "asc" } },
        createdBy: { select: { name: true } },
        deletedBy: { select: { name: true } },
        lead: { select: { id: true } },
      },
    }),
    getMasterList("PACKAGE_INCLUSION"),
    getMasterList("ROOM_CATEGORY"),
    getMasterList("HOTEL_CATEGORY"),
    canUseStaffFeature("bookings"),
  ]);

  const session = await getSession();
  // A "deleted" quotation is only archived: gone for staff, but the admin can
  // still open it from the Deleted view to check it before restoring.
  if (!quotation || (quotation.deletedAt && session?.role !== "ADMIN")) notFound();
  const canEdit = canEditCustomPackage(session, quotation.createdById);

  // A booking made from this quotation shares its Trip ID, so once it exists
  // the Convert button becomes a link to it.
  const booking = canBook
    ? await db.booking.findUnique({ where: { tripId: quotation.tripId }, select: { id: true } })
    : null;

  // Every live package on this Trip ID (this one included), in order.
  const tripPackages = await db.customPackage.findMany({
    where: { tripId: quotation.tripId, deletedAt: null },
    orderBy: { packageNumber: "asc" },
    select: { id: true, packageNumber: true, destinationName: true, totalAmount: true, gstPercent: true, offers: true },
  });
  const canAddToTrip = canEdit && !quotation.deletedAt;

  const roomLabels = new Map(roomOptions.map((o) => [o.value, o.label]));
  const hotelLabels = new Map(hotelOptions.map((o) => [o.value, o.label]));

  const inclusions = resolveInclusions(
    quotation.inclusions,
    inclusionOptions,
    quotation.customInclusions
  );
  const exclusions = getEffectiveExclusions(quotation.exclusions, quotation.inclusions, inclusionOptions);
  const priceLines = parsePriceLines(quotation.priceLines);
  // As the customer sees them: with GST added.
  const offers = offersWithGst(parseOffers(quotation.offers), quotation.gstPercent);

  const facts: [string, string][] = [
    ["Customer", quotation.customerName],
    ["Phone", quotation.customerPhone ?? "N/A"],
    ["Email", quotation.customerEmail ?? "N/A"],
    [
      "Trip type",
      quotation.tripType === "international" ? "International" : quotation.tripType === "domestic" ? "Domestic" : "N/A",
    ],
    ["Destination", quotation.destinationName],
    [
      "Travel dates",
      quotation.startDate
        ? `${fmtDate(quotation.startDate)}${quotation.endDate ? ` – ${fmtDate(quotation.endDate)}` : ""}`
        : "N/A",
    ],
    ["Duration", `${quotation.durationNights} Nights / ${quotation.durationDays} Days`],
    [
      "Travellers",
      [
        `${quotation.adults} Adults`,
        quotation.children ? `${quotation.children} Children` : "",
        quotation.infants ? `${quotation.infants} Infants` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "Rooms",
      [
        `${quotation.rooms} Rooms`,
        quotation.extraBeds ? `${quotation.extraBeds} extra bed(s)` : "",
        quotation.extraMattresses ? `${quotation.extraMattresses} extra mattress(es)` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "Hotel / room category",
      [
        quotation.hotelCategory ? hotelLabels.get(quotation.hotelCategory) : "",
        quotation.roomCategoryOther || (quotation.roomCategory ? roomLabels.get(quotation.roomCategory) : ""),
      ]
        .filter(Boolean)
        .join(" · ") || "N/A",
    ],
    ["Vehicle", quotation.vehicleName ?? "N/A"],
    ["Created by", `${quotation.createdBy.name} · ${fmtDate(quotation.createdAt)}`],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">
            {quotation.destinationName}
          </h1>
          <p className="mt-1 font-mono text-sm font-semibold text-brand-600">{quotation.tripId}</p>
        </div>
        {quotation.deletedAt ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-red-600">
              Deleted {fmtDate(quotation.deletedAt)}
              {quotation.deletedBy ? ` by ${quotation.deletedBy.name}` : ""}
            </p>
            <RestoreButton
              id={quotation.id}
              action={restoreCustomPackageAction}
              confirmText={`Restore quotation ${quotation.tripId} for ${quotation.customerName}? It will show in the lists again.`}
            />
          </div>
        ) : (
        <div className="flex flex-wrap items-center gap-3">
          {/* A plain link, not a fetch: the browser downloads the streamed PDF
              straight to disk, which is what staff then attach in WhatsApp. */}
          <a
            href={`/api/admin/custom-packages/${quotation.id}/pdf`}
            className="flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700"
          >
            <Download className="h-4 w-4" />
            Download Itinerary PDF
          </a>
          {/* Someone else's quotation is view-and-download only. */}
          {canEdit && (
            <Link
              href={`${basePath}/custom-packages/${quotation.id}/edit`}
              className="flex items-center gap-1.5 rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-brand-400 hover:text-brand-600"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          )}
          {canAddToTrip && (
            <AddPackageButton
              basePath={basePath}
              packageId={quotation.id}
              tripId={quotation.tripId}
              destinationName={quotation.destinationName}
              count={tripPackages.length}
              max={MAX_PACKAGES_PER_TRIP}
            />
          )}
          {/* Once a trip has more than one package, each can be removed from
              here; the page then moves on to another package of the trip.
              (A trip's only package is deleted from the list.) */}
          {canAddToTrip && tripPackages.length > 1 && (
            <DeletePackageButton
              packageId={quotation.id}
              label={`${packageLabel(tripPackages.findIndex((p) => p.id === quotation.id) + 1)} (${quotation.destinationName})`}
              tripId={quotation.tripId}
              goToHref={`${basePath}/custom-packages/${
                (tripPackages.find((p) => p.id !== quotation.id) ?? quotation).id
              }`}
            />
          )}
          {canBook &&
            (booking ? (
              <Link
                href={`${basePath}/bookings/${booking.id}`}
                className="flex items-center gap-1.5 rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-brand-400 hover:text-brand-600"
              >
                <CalendarCheck className="h-4 w-4" />
                View Booking
              </Link>
            ) : (
              <Link
                href={`${basePath}/bookings/new?customPackageId=${quotation.id}`}
                className="flex items-center gap-1.5 rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-brand-400 hover:text-brand-600"
              >
                <CalendarPlus className="h-4 w-4" />
                Convert to Booking
              </Link>
            ))}
        </div>
        )}
      </div>

      {/* The trip's other packages (Manali, Shimla, Goa...): one tap between them. */}
      {tripPackages.length > 1 && (
        <nav aria-label="Packages on this trip" className="mt-5">
          <p className="mb-2 px-1 text-xs font-semibold text-ink-500">
            {tripPackages.length} packages on this trip
            <span className="text-ink-400"> · up to {MAX_PACKAGES_PER_TRIP}</span>
          </p>
          <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {tripPackages.map((p, index) => {
              const current = p.id === quotation.id;
              return (
                <Link
                  key={p.id}
                  href={`${basePath}/custom-packages/${p.id}`}
                  aria-current={current ? "page" : undefined}
                  className={`group flex min-w-44 shrink-0 items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                    current
                      ? "border-brand-300 bg-white shadow-sm ring-1 ring-brand-200"
                      : "border-transparent bg-ink-100/60 hover:border-ink-200 hover:bg-white"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                      current ? "bg-brand-600 text-white" : "bg-white text-ink-600 group-hover:bg-ink-100"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${current ? "text-ink-900" : "text-ink-700"}`}>
                      {p.destinationName}
                    </span>
                    <span className="block text-xs text-ink-500">{packageAmountText(p.totalAmount, offersWithGst(parseOffers(p.offers), p.gstPercent))}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <div className="mt-6 divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white shadow-sm">
        <Section title="Trip details">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">{label}</dt>
                <dd className="mt-0.5 text-sm text-ink-900">{value || "N/A"}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {quotation.stays.length > 0 && (
          <Section title="Accommodation">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs font-bold uppercase tracking-wide text-ink-500">
                    <th className="py-2 pr-3">City</th>
                    <th className="py-2 pr-3">Hotel</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Room</th>
                    <th className="py-2 pr-3">Rooms</th>
                    <th className="py-2">Extras</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.stays.map((stay) => (
                    <tr key={stay.id} className="border-b border-ink-50 last:border-0">
                      <td className="py-2 pr-3 text-ink-700">
                        {[
                          stay.city,
                          [stay.nights ? `${stay.nights}N` : "", stay.days ? `${stay.days}D` : ""].filter(Boolean).join(" / "),
                        ]
                          .filter(Boolean)
                          .join(" · ") || "N/A"}
                      </td>
                      <td className="py-2 pr-3 font-semibold text-ink-900">{stay.hotelName}</td>
                      <td className="py-2 pr-3 text-ink-700">
                        {stay.hotelCategory ? hotelLabels.get(stay.hotelCategory) ?? "N/A" : "N/A"}
                      </td>
                      <td className="py-2 pr-3 text-ink-700">
                        {stay.roomCategory ? roomLabels.get(stay.roomCategory) ?? "N/A" : "N/A"}
                      </td>
                      <td className="py-2 pr-3 text-ink-700">{stay.rooms}</td>
                      <td className="py-2 text-ink-700">
                        {[stay.extraBed ? "Extra bed" : "", stay.extraMattress ? "Extra mattress" : ""]
                          .filter(Boolean)
                          .join(", ") || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {offers.length > 0 && (
          <Section title="Hotel offers">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {offers.map((offer, i) => (
                <OfferCard
                  key={i}
                  categoryLabel={offer.hotelCategory ? hotelLabels.get(offer.hotelCategory) ?? "" : ""}
                  title={offer.title}
                  hotels={offer.hotels}
                  note={offer.note}
                  listPrice={offer.listPrice}
                  finalPrice={offer.finalPrice}
                  priceLines={offer.priceLines}
                  showTravellers={offer.showTravellers}
                />
              ))}
            </div>
          </Section>
        )}

        <Section title="Itinerary">
          <ol className="space-y-4">
            {quotation.days.map((day) => (
              <li key={day.id} className="border-l-2 border-brand-200 pl-4">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-600">
                  Day {day.day}
                  {day.date && <span className="ml-2 text-ink-500">{fmtDate(day.date)}</span>}
                </p>
                <p className="mt-0.5 font-semibold text-ink-900">{day.title}</p>
                {day.desc && <p className="mt-1 text-sm text-ink-700">{day.desc}</p>}
              </li>
            ))}
          </ol>
        </Section>

        <div className="grid grid-cols-1 divide-y divide-ink-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <Section title="Inclusions">
            <ul className="space-y-1 text-sm text-ink-800">
              {inclusions.map((i, idx) => (
                <li key={`${i.value}-${idx}`}>• {i.label}</li>
              ))}
              {inclusions.length === 0 && <li className="text-ink-500">None selected.</li>}
            </ul>
          </Section>

          <Section title="Exclusions (automatic)">
            <ul className="space-y-1 text-sm text-ink-800">
              {exclusions.map((e, idx) => (
                <li key={`${e}-${idx}`}>• {e}</li>
              ))}
              {exclusions.length === 0 && <li className="text-ink-500">Nothing excluded.</li>}
            </ul>
          </Section>
        </div>

        <Section title="Pricing">
          {quotation.totalAmount === 0 && offers.length > 0 ? (
            <p className="max-w-md text-sm text-ink-500">
              This package is priced through its hotel offers above: each offer carries the package price, so there is no
              single total.
            </p>
          ) : (
          <dl className="max-w-md space-y-2 text-sm">
            {priceLines.map((line, i) => (
              <div key={i} className="flex justify-between gap-4">
                <dt className="text-ink-500">
                  {line.label} × {line.count} @ {formatRupees(line.rate)}
                </dt>
                <dd className="whitespace-nowrap text-ink-900">{formatRupees(priceLineAmount(line))}</dd>
              </div>
            ))}
            <div className={`flex justify-between ${priceLines.length ? "border-t border-ink-100 pt-2" : ""}`}>
              <dt className="text-ink-500">Package price</dt>
              <dd className="text-ink-900">{formatRupees(quotation.price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">GST ({quotation.gstPercent}%)</dt>
              <dd className="text-ink-900">{formatRupees(quotation.gstAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2 font-bold">
              <dt className="text-ink-900">Total</dt>
              <dd className="text-brand-600">{formatRupees(quotation.totalAmount)}</dd>
            </div>
          </dl>
          )}
        </Section>

        {quotation.notes && (
          <Section title="Internal notes">
            <p className="whitespace-pre-line text-sm text-ink-700">{quotation.notes}</p>
          </Section>
        )}

        <div className="p-6">
          <SendEmailPanel
            bare
            action={sendItineraryEmailAction.bind(null, quotation.id)}
            defaultTo={quotation.customerEmail ?? ""}
            label="Email itinerary to customer"
            disabledReason={
              isEmailConfigured() ? undefined : "Email isn't connected yet. Ask an admin to set it up."
            }
          />
        </div>
      </div>
    </div>
  );
}
