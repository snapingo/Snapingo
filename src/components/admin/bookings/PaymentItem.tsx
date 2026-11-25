"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import FormSelect from "@/components/admin/FormSelect";
import { usePaymentEditing } from "@/components/admin/bookings/PaymentEditContext";

const inputClass =
  "w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

/**
 * One recorded payment. "Edit" swaps it for a small form so a wrong amount,
 * mode or received date can be corrected in place.
 */
export default function PaymentItem({
  amount,
  mode,
  notes,
  paidAtLabel,
  paidAtInput,
  recordedBy,
  modes,
  canEdit,
  action,
}: {
  amount: number;
  mode: string;
  notes: string | null;
  paidAtLabel: string;
  paidAtInput: string;
  recordedBy: string;
  modes: string[];
  canEdit: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditingLocal] = useState(false);
  const { setEditing: setPanelEditing } = usePaymentEditing();
  const setEditing = (v: boolean) => {
    setEditingLocal(v);
    setPanelEditing(v);
  };

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await action(formData);
          setEditing(false);
        }}
        className="space-y-2.5 rounded-xl bg-ink-50/60 p-3"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <input name="amount" type="number" min={1} required defaultValue={amount} placeholder="Amount ₹" className={inputClass} />
          <FormSelect name="mode" options={modes.includes(mode) ? modes : [mode, ...modes]} defaultValue={mode} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-500" htmlFor="paidAt-edit">
            Payment received date
          </label>
          <input id="paidAt-edit" name="paidAt" type="date" required defaultValue={paidAtInput} className={inputClass} />
        </div>
        <input name="notes" defaultValue={notes ?? ""} placeholder="Notes (optional)" className={inputClass} />
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex-1 rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-brand-400"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-xl bg-ink-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink-900">₹{amount.toLocaleString("en-IN")}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-ink-500">Received {paidAtLabel}</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit payment"
              className="rounded-full p-1 text-ink-500 transition hover:bg-white hover:text-brand-600"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-0.5 text-xs text-ink-500">
        {mode} · recorded by {recordedBy}
      </p>
      {notes && <p className="mt-1 text-xs text-ink-700">{notes}</p>}
    </div>
  );
}
