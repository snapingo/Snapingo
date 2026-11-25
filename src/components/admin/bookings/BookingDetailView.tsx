import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import DeleteBookingButton from "@/components/admin/bookings/DeleteBookingButton";
import { addPaymentAction, restoreBookingAction, updatePaymentAction } from "@/lib/actions/bookings";
import PaymentItem from "@/components/admin/bookings/PaymentItem";
import AddPaymentToggle from "@/components/admin/bookings/AddPaymentToggle";
import { HideWhileEditing, PaymentEditProvider } from "@/components/admin/bookings/PaymentEditContext";
import { getSession } from "@/lib/dal";
import RestoreButton from "@/components/admin/RestoreButton";
import { formatBalance } from "@/lib/money";
import { isPrivateBlobConfigured } from "@/lib/blob";
import VoucherPanel from "@/components/admin/bookings/VoucherPanel";
import FormSelect from "@/components/admin/FormSelect";

const PAYMENT_MODES = ["UPI", "Cash", "Bank Transfer", "Card", "Cheque"];

const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Payment dates are calendar days entered by staff: always shown and edited in
// IST so a day never shifts depending on the server's timezone.
const fmtPayDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const payDateInput = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default async function BookingDetailView({ bookingId, basePath = "/admin" }: { bookingId: string; basePath?: string }) {
  const [booking, session] = await Promise.all([
    db.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: { orderBy: { paidAt: "desc" }, include: { recordedBy: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        deletedBy: { select: { name: true } },
        vouchers: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } },
      },
    }),
    getSession(),
  ]);
  // A "deleted" booking is only archived: gone for staff, but the admin can
  // still open it from the Deleted view to check it before restoring.
  if (!booking || (booking.deletedAt && session?.role !== "ADMIN")) notFound();
  const archived = Boolean(booking.deletedAt);

  const paid = booking.payments.reduce((sum, p) => sum + p.amount, 0);
  const grandTotal = booking.totalAmount + booking.taxAmount;
  const balance = grandTotal - paid;
  const balanceDisplay = formatBalance(balance);

  return (
    <div>
      <Link href={`${basePath}/bookings`} className="flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" />
        Back to bookings
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink-900">{booking.travelerName}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {booking.phone} · Booked by {booking.createdBy.name} on {fmtDate(booking.createdAt)}
          </p>
        </div>
        {booking.deletedAt ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-red-600">
              Deleted {fmtDate(booking.deletedAt)}
              {booking.deletedBy ? ` by ${booking.deletedBy.name}` : ""}
              {booking.deletedTripId ? ` · Trip ${booking.deletedTripId}` : ""}
            </p>
            <RestoreButton
              id={booking.id}
              action={restoreBookingAction}
              confirmText={`Restore the booking for ${booking.travelerName}? It will show in the lists again, with its payments.`}
            />
          </div>
        ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`${basePath}/bookings/${booking.id}/invoice`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-brand-400 hover:text-brand-600"
          >
            <Receipt className="h-4 w-4" />
            View Invoice
          </Link>
          <Link
            href={`${basePath}/bookings/${booking.id}/edit`}
            className="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-brand-400 hover:text-brand-600"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <DeleteBookingButton bookingId={booking.id} basePath={basePath} />
        </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="font-heading text-base font-bold text-ink-900">Trip Details</h2>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">Name</dt>
              <dd className="mt-0.5 text-sm text-ink-900">{booking.travelerName}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">Phone Number</dt>
              <dd className="mt-0.5 text-sm text-ink-900">{booking.phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">Email</dt>
              <dd className="mt-0.5 text-sm text-ink-900">{booking.email || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">Destination</dt>
              <dd className="mt-0.5 text-sm text-ink-900">{booking.destinationName || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">Travel dates</dt>
              <dd className="mt-0.5 text-sm text-ink-900">
                {booking.travelStartDate ? fmtDate(booking.travelStartDate) : "N/A"}
                {booking.travelEndDate ? ` – ${fmtDate(booking.travelEndDate)}` : ""}
              </dd>
            </div>
          </dl>
          {booking.notes && (
            <div className="mt-5 border-t border-ink-100 pt-4">
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">Notes</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-900">{booking.notes}</dd>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-ink-100 pt-5 sm:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Package Amount</p>
              <p className="mt-1 font-heading text-lg font-bold text-ink-900">₹{booking.totalAmount.toLocaleString("en-IN")}</p>
            </div>
            {booking.taxAmount > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-500">GST / Tax</p>
                <p className="mt-1 font-heading text-lg font-bold text-ink-900">₹{booking.taxAmount.toLocaleString("en-IN")}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Paid</p>
              <p className="mt-1 font-heading text-lg font-bold text-emerald-600">₹{paid.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">{balanceDisplay.label}</p>
              <p className={`mt-1 font-heading text-lg font-bold ${balanceDisplay.className}`}>{balanceDisplay.amount}</p>
            </div>
          </div>
        </div>

        <PaymentEditProvider>
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="font-heading text-base font-bold text-ink-900">Payments</h2>
          <div className="mt-4 space-y-3">
            {booking.payments.map((p) => (
              <PaymentItem
                key={p.id}
                amount={p.amount}
                mode={p.mode}
                notes={p.notes}
                paidAtLabel={fmtPayDate(p.paidAt)}
                paidAtInput={payDateInput(p.paidAt)}
                recordedBy={p.recordedBy.name}
                modes={PAYMENT_MODES}
                canEdit={!archived}
                action={updatePaymentAction.bind(null, p.id)}
              />
            ))}
            {booking.payments.length === 0 && <p className="text-sm text-ink-500">No payments recorded yet.</p>}
          </div>

          {/* Nothing left to collect: the form hides behind "Add payment" (see
              AddPaymentToggle). A wrong amount is fixed with the pencil on
              the payment itself. */}
          {/* An archived booking is read-only until it's restored. */}
          {!archived && (
          <HideWhileEditing>
          <AddPaymentToggle
            settled={balance <= 0 && booking.payments.length > 0}
            paymentCount={booking.payments.length}
            note={balance === 0 ? "Fully paid - no balance due." : "Fully paid (received is more than the total)."}
          >
          <form action={addPaymentAction.bind(null, booking.id)} className="mt-4 space-y-2.5 border-t border-ink-100 pt-4">
            <div className="grid grid-cols-2 gap-2.5">
              <input
                name="amount"
                type="number"
                min={1}
                required
                placeholder="Amount ₹"
                className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <FormSelect name="mode" options={PAYMENT_MODES} defaultValue="UPI" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-500" htmlFor="paidAt">
                Payment received date
              </label>
              <input
                id="paidAt"
                name="paidAt"
                type="date"
                required
                defaultValue={payDateInput(new Date())}
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <input
              name="notes"
              placeholder="Notes (optional)"
              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Record Payment
            </button>
          </form>
          </AddPaymentToggle>
          </HideWhileEditing>
          )}
        </div>
        </PaymentEditProvider>
      </div>

      <div className="mt-6">
        <VoucherPanel
          bookingId={booking.id}
          uploadsEnabled={!archived && isPrivateBlobConfigured()}
          vouchers={booking.vouchers.map((v) => ({
            id: v.id,
            label: v.label,
            fileName: v.fileName,
            size: v.size,
            uploadedBy: v.uploadedBy.name,
            createdAt: fmtDate(v.createdAt),
          }))}
        />
      </div>
    </div>
  );
}
