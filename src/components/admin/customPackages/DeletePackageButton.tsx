"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCustomPackageAction } from "@/lib/actions/customPackages";
import ConfirmModal from "@/components/admin/ConfirmModal";

/**
 * Deletes the package being viewed, then moves to one that still exists: the
 * trip's next package, or the list when there is none. (Staying on a deleted
 * package's page would just 404 on refresh.)
 */
export default function DeletePackageButton({
  packageId,
  label,
  tripId,
  goToHref,
}: {
  packageId: string;
  // e.g. "Package 2 (Jaipur)".
  label: string;
  tripId: string;
  goToHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
      <ConfirmModal
        open={open}
        message={`Delete ${label} from trip ${tripId}? The trip's other packages are not affected.`}
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deleteCustomPackageAction(packageId);
            router.push(goToHref);
            router.refresh();
          })
        }
      />
    </>
  );
}
