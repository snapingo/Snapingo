"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  DRAFT_RESTORED_EVENT,
  applySnapshot,
  clearPageDraft,
  formKeyOf,
  isDraftableForm,
  readPageDraft,
  saveFormSnapshot,
  snapshotForm,
} from "@/lib/formDraft";

/**
 * Keeps whatever has been typed into the panel's forms while the user is away
 * on another screen, and puts it back when they return - so a half-filled
 * booking, lead edit or CMS form is never lost to a sidebar click.
 *
 *  - Saves on every edit a person makes, per page URL, in this tab only.
 *  - Restores shortly after a page mounts (forms render a moment after the
 *    route changes), skipping any form the user has already started editing.
 *  - Drops the page's draft on submit, so a saved form never comes back with
 *    its old values.
 *  - Shows a small notice with "Discard" so restored values are never a
 *    surprise (an abandoned edit would otherwise look like saved data).
 *
 * Forms that keep their own draft opt out with `data-no-draft`.
 */
export default function FormDraftKeeper() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const pageKey = search ? `${pathname}?${search}` : pathname;
  const [restored, setRestored] = useState<string | null>(null);
  const touched = useRef(new Set<string>());

  useEffect(() => {
    touched.current = new Set();
    // Forms are saved as they are edited; a restore notice belongs to the
    // page it was shown on.
    const reset = window.setTimeout(() => setRestored(null), 0);

    const onEdit = (event: Event) => {
      // Only real edits - the restore below fires synthetic events.
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      const form = event.target.closest("form");
      if (!form || !isDraftableForm(form)) return;
      const key = formKeyOf(form);
      touched.current.add(key);
      saveFormSnapshot(pageKey, key, snapshotForm(form));
    };
    // Submitting is the moment the draft stops being "unsaved".
    const onSubmit = () => clearPageDraft(pageKey);
    const onSelectRestored = () => setRestored(pageKey);

    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener(DRAFT_RESTORED_EVENT, onSelectRestored);

    const draft = readPageDraft(pageKey);
    const done = new Set<string>();
    const restoreForms = () => {
      if (!draft) return;
      for (const form of Array.from(document.forms)) {
        if (!isDraftableForm(form)) continue;
        const key = formKeyOf(form);
        const snapshot = draft.forms[key];
        if (!snapshot || done.has(key) || touched.current.has(key)) continue;
        done.add(key);
        if (applySnapshot(form, snapshot) > 0) setRestored(pageKey);
      }
    };
    // The route's forms (and anything inside modals or lazy sections) mount
    // at slightly different moments; try a few times, once per form.
    const timers = [0, 150, 500, 1200].map((ms) => window.setTimeout(restoreForms, ms));

    return () => {
      window.clearTimeout(reset);
      timers.forEach(window.clearTimeout);
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener(DRAFT_RESTORED_EVENT, onSelectRestored);
    };
  }, [pageKey]);

  if (restored !== pageKey) return null;

  return (
    <div
      role="status"
      className="print-hide fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-gold-400 bg-white px-4 py-3 text-sm text-ink-900 shadow-lg"
    >
      <p>Unsaved changes restored.</p>
      <button
        type="button"
        onClick={() => {
          clearPageDraft(pageKey);
          window.location.reload();
        }}
        className="font-semibold text-ink-700 underline underline-offset-2 hover:text-red-600"
      >
        Discard
      </button>
      <button
        type="button"
        onClick={() => setRestored(null)}
        aria-label="Dismiss"
        className="text-ink-400 hover:text-ink-700"
      >
        ✕
      </button>
    </div>
  );
}
