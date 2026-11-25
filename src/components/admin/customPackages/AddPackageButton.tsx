"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";

/**
 * "Add package": another package for the same customer on the same Trip ID.
 * A small prompt asks how to start it - with this package's details filled
 * in, or empty. Styled like the panel's other confirm popups.
 */
export default function AddPackageButton({
  basePath,
  packageId,
  tripId,
  destinationName,
  count,
  max,
}: {
  basePath: string;
  packageId: string;
  tripId: string;
  destinationName: string;
  count: number;
  max: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const full = count >= max;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const start = (mode: "copy" | "blank") => {
    setOpen(false);
    router.push(`${basePath}/custom-packages/new?tripOf=${packageId}&mode=${mode}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={full}
        title={full ? `A trip can have at most ${max} packages` : undefined}
        className="flex items-center gap-1.5 rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink-200 disabled:hover:text-ink-700"
      >
        <Plus className="h-4 w-4" />
        Add package
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-ink-950/60 p-4 pt-[18vh]"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Add package"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-heading text-2xl font-bold text-ink-900">Add package</h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-400 transition hover:bg-ink-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-3 text-base leading-relaxed text-ink-600">
                Fill the new package with the details of <span className="font-semibold text-ink-900">{destinationName}</span>, or
                start it empty?
              </p>
              <div className="mt-7 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => start("copy")}
                  className="rounded-full bg-brand-600 px-6 py-4 text-base font-semibold text-white shadow-brand transition hover:bg-brand-700"
                >
                  Fill with this package&apos;s data
                </button>
                <button
                  type="button"
                  onClick={() => start("blank")}
                  className="rounded-full border border-ink-200 px-6 py-4 text-base font-semibold text-ink-700 transition hover:border-brand-400 hover:text-brand-600"
                >
                  Start empty
                </button>
              </div>
              <p className="mt-5 text-center text-sm text-ink-500">
                Trip {tripId} · package {count + 1} of {max}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
