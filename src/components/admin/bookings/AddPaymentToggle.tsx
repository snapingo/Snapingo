"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

/**
 * The Record Payment form, tucked behind a small "Add payment" button once a
 * booking is fully paid (nothing left to collect, so the form would just be in
 * the way). While money is still due the form is always shown.
 */
export default function AddPaymentToggle({
  settled,
  paymentCount,
  note,
  children,
}: {
  settled: boolean;
  // The form closes again by itself once a payment has been recorded.
  paymentCount: number;
  // Shown on the left of the button's row, e.g. "Fully paid".
  note: ReactNode;
  children: ReactNode;
}) {
  const [openAtCount, setOpenAtCount] = useState<number | null>(null);

  if (!settled) return <>{children}</>;

  const open = openAtCount === paymentCount;
  return (
    <div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <p className="text-sm font-semibold text-emerald-600">{note}</p>
        {open ? (
          <button
            type="button"
            onClick={() => setOpenAtCount(null)}
            className="shrink-0 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-ink-300"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpenAtCount(paymentCount)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-brand-400 hover:text-brand-600"
          >
            <Plus className="h-4 w-4" />
            Add payment
          </button>
        )}
      </div>
      {open && children}
    </div>
  );
}
