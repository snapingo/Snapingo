import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MAX_PACKAGES_PER_TRIP, canAddPackage } from "@/lib/tripPackages";
import { getSession } from "@/lib/dal";
import { canAccessLead } from "@/lib/leads";
import { canEditCustomPackage } from "@/lib/customPackageAccess";
import { getActiveMasterList } from "@/lib/masterData";
import { getGstPercent } from "@/lib/settings";
import { getSuggestionSets } from "@/lib/suggestions";
import CustomPackageForm, { type CustomPackageDefaults } from "@/components/admin/customPackages/CustomPackageForm";
import { parseDuration } from "@/lib/durationHelpers";
import { getContentBlocks } from "@/lib/contentBlocks";
import { currentPreparer, defaultsFromQuotation, loadQuotation, toDateInput } from "@/lib/customPackageDefaults";

type LeadRow = NonNullable<Awaited<ReturnType<typeof loadLead>>>;

function loadLead(id: string) {
  return db.lead.findUnique({
    where: { id },
    include: {
      // The lead's most recent quotation the user may edit is the one its
      // Edit screen opens.
      customPackages: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, createdById: true } },
    },
  });
}

/**
 * A lead's own details as the quotation form's starting values, so a
 * quotation raised from a lead starts with everything the customer already
 * told us instead of a blank form.
 */
function defaultsFromLead(lead: LeadRow): CustomPackageDefaults {
  // Leads from the flight form store "round-trip"/"one-way" here - only the
  // two values the quotation form offers are carried over.
  const tripType =
    lead.tripType === "domestic" || lead.tripType === "international" ? lead.tripType : undefined;

  // Both dates known: the duration follows from them, as it does in the form.
  // Otherwise fall back to whatever duration text the enquiry carried.
  let duration: { nights: number; days: number } | null = null;
  if (lead.startDate && lead.endDate) {
    const nights = Math.round((lead.endDate.getTime() - lead.startDate.getTime()) / 86_400_000);
    if (nights >= 0) duration = { nights, days: nights + 1 };
  }
  duration ??= lead.days ? parseDuration(lead.days) : null;

  return {
    leadId: lead.id,
    customerName: lead.name ?? undefined,
    customerPhone: lead.phone ?? undefined,
    customerEmail: lead.email ?? undefined,
    tripType,
    destinationName: lead.destinationName ?? lead.packageTitle ?? undefined,
    startDate: toDateInput(lead.startDate),
    endDate: toDateInput(lead.endDate),
    durationNights: duration?.nights,
    durationDays: duration?.days,
    adults: lead.adults ?? undefined,
    children: lead.children ?? undefined,
    infants: lead.infants ?? undefined,
    childAges: lead.childAges,
    rooms: lead.rooms ?? undefined,
    extraBeds: lead.extraBeds ?? undefined,
    extraMattresses: lead.extraMattresses ?? undefined,
    roomCategory: lead.roomCategory ?? undefined,
    hotelCategory: lead.hotelCategory ?? undefined,
    notes: lead.message ?? undefined,
  };
}

export default async function CustomPackageFormPage({
  isNew: isNewProp = false,
  customPackageId: customPackageIdProp,
  leadId,
  editLeadId,
  tripOfId,
  tripMode,
}: {
  isNew?: boolean;
  customPackageId?: string;
  // "New quotation" from a lead: a fresh quotation, pre-filled from the lead.
  leadId?: string;
  // A lead's Edit screen: opens the lead's latest quotation if it has one,
  // otherwise a new one pre-filled from the lead. Saving also updates the
  // lead's own details and returns to the lead.
  editLeadId?: string;
  // "Add package": another package on this package's Trip ID. `tripMode`
  // "copy" starts from its contents, anything else from the customer alone.
  tripOfId?: string;
  tripMode?: string;
}) {
  const sourceLeadId = editLeadId ?? leadId;
  const [suggestions, inclusions, roomCategories, hotelCategories, gstPercent, lead] = await Promise.all([
    getSuggestionSets(["destinationName", "hotelName", "city", "vehicleName"] as const),
    getActiveMasterList("PACKAGE_INCLUSION"),
    getActiveMasterList("ROOM_CATEGORY"),
    getActiveMasterList("HOTEL_CATEGORY"),
    getGstPercent(),
    sourceLeadId ? loadLead(sourceLeadId) : null,
  ]);

  // Staff can only raise a quotation from a lead assigned to them.
  const session = await getSession();
  if (sourceLeadId && (!lead || !(await canAccessLead(session, sourceLeadId)))) notFound();

  // A lead's Edit screen opens the latest quotation this user may edit; one
  // only a colleague may change is skipped, so they start their own instead.
  const customPackageId = editLeadId
    ? lead?.customPackages.find((q) => canEditCustomPackage(session, q.createdById))?.id
    : customPackageIdProp;
  const isNew = editLeadId ? !customPackageId : isNewProp;

  const quotation = customPackageId ? await loadQuotation(customPackageId) : null;

  if (customPackageId && !quotation) notFound();

  // The package this one is being added alongside, and whether its trip has
  // room for another.
  const tripSource = tripOfId && isNew ? await loadQuotation(tripOfId) : null;
  if (tripOfId && isNew && !tripSource) notFound();
  const tripBase = session?.role === "ADMIN" ? "/admin" : "/staff";
  if (tripSource) {
    if (!canEditCustomPackage(session, tripSource.createdById)) {
      redirect(`${tripBase}/custom-packages/${tripSource.id}`);
    }
    const live = await db.customPackage.count({ where: { tripId: tripSource.tripId, deletedAt: null } });
    if (!canAddPackage(live)) {
      return (
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">Add Package</h1>
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Trip {tripSource.tripId} already has {MAX_PACKAGES_PER_TRIP} packages, the most one trip can hold.
          </p>
          <Link
            href={`${tripBase}/custom-packages/${tripSource.id}`}
            className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Back to the package
          </Link>
        </div>
      );
    }
  }
  // Someone else's quotation is view-only: send them back to its detail page.
  if (quotation && !canEditCustomPackage(session, quotation.createdById)) {
    redirect(`${session?.role === "ADMIN" ? "/admin" : "/staff"}/custom-packages/${quotation.id}`);
  }

  // A new quotation starts from the standard PDF sections (passed separately,
  // below); an existing one carries its own.
  const [standardContentBlocks, quotationDefaults, preparer] = await Promise.all([
    getContentBlocks(),
    quotation ? defaultsFromQuotation(quotation) : null,
    currentPreparer(),
  ]);
  const toEditable = (list: { key: string; title: string; body: string }[]) =>
    list.map((b) => ({ key: b.key, title: b.title, body: b.body }));

  const heading = editLeadId
    ? `Edit Lead${lead?.name ? `: ${lead.name}` : ""}`
    : tripSource
      ? `Add Package to ${tripSource.tripId}`
      : isNew
        ? "New Customized Package"
        : `Edit ${quotation?.tripId}`;

  // Starting values for an extra package on a trip: a copy of the source
  // package's contents, or just the customer. Either way it is a new package
  // (no id) on that trip, for the same customer and lead.
  const mode = tripMode === "copy" ? "copy" : "blank";
  const tripDefaults: CustomPackageDefaults | undefined = tripSource
    ? mode === "copy"
      ? {
          ...(await defaultsFromQuotation(tripSource)),
          id: undefined,
          tripOfId: tripSource.id,
          tripOfMode: mode,
        }
      : {
          tripOfId: tripSource.id,
          tripOfMode: mode,
          leadId: tripSource.leadId ?? undefined,
          customerName: tripSource.customerName,
          customerPhone: tripSource.customerPhone ?? undefined,
          customerEmail: tripSource.customerEmail ?? undefined,
        }
    : undefined;

  // A quotation nobody has signed yet (every new one, and older ones saved
  // before this existed) starts as prepared by whoever is signed in now.
  const baseDefaults = tripDefaults ?? quotationDefaults ?? (lead ? defaultsFromLead(lead) : undefined);
  const defaults = baseDefaults?.preparedByName
    ? baseDefaults
    : { ...baseDefaults, ...preparer };

  const toOptions = (list: { value: string; label: string; freeText: boolean }[]) =>
    list.map((o) => ({ value: o.value, label: o.label, freeText: o.freeText }));

  return (
    <div>
      <CustomPackageForm
        header={
          <>
            <h1 className="font-heading text-2xl font-bold text-ink-900">{heading}</h1>
            {editLeadId && quotation && (
              <p className="mt-1 font-mono text-sm font-semibold text-brand-600">{quotation.tripId}</p>
            )}
            {tripSource && (
              <p className="mt-1 text-sm text-ink-500">
                {mode === "copy"
                  ? `Filled in from ${tripSource.destinationName} - change whatever differs.`
                  : "A fresh package for the same customer."}
              </p>
            )}
          </>
        }
        isNew={isNew}
        returnToLead={Boolean(editLeadId)}
        destinationSuggestions={suggestions.destinationName}
        hotelSuggestions={suggestions.hotelName}
        citySuggestions={suggestions.city}
        vehicleSuggestions={suggestions.vehicleName}
        inclusionOptions={toOptions(inclusions)}
        roomCategories={toOptions(roomCategories)}
        hotelCategories={toOptions(hotelCategories)}
        gstPercent={gstPercent}
        standardContentBlocks={toEditable(standardContentBlocks)}
        defaults={defaults}
      />
    </div>
  );
}
