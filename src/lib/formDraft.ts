// Browser-side storage for half-filled forms in the admin and staff panels, so
// leaving a screen (to look something up elsewhere) and coming back never
// costs what was typed. Per browser tab (sessionStorage) and per page URL;
// nothing reaches the server and it is dropped on submit.
//
// The quotation form keeps its own, richer draft and opts out with
// `data-no-draft` on its <form>.

const PREFIX = "snapingo:form-draft:";
// A draft nobody came back to within half a working day is stale.
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type FieldSnapshot = { n: string; t: string; v: string; c?: boolean };

export type PageDraft = {
  savedAt: number;
  // Native fields, grouped by the form they belong to.
  forms: Record<string, FieldSnapshot[]>;
  // Custom dropdowns (CustomSelect), which hold their value in React state.
  selects: Record<string, string>;
};

export const DRAFT_RESTORED_EVENT = "snapingo:draft-restored";

export function currentPageKey(): string {
  return window.location.pathname + window.location.search;
}

export function isPanelPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/staff");
}

export function readPageDraft(pageKey: string): PageDraft | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + pageKey);
    if (!raw) return null;
    const draft = JSON.parse(raw) as PageDraft;
    if (!draft || Date.now() - draft.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(PREFIX + pageKey);
      return null;
    }
    return { savedAt: draft.savedAt, forms: draft.forms ?? {}, selects: draft.selects ?? {} };
  } catch {
    return null;
  }
}

function writePageDraft(pageKey: string, draft: PageDraft) {
  try {
    sessionStorage.setItem(PREFIX + pageKey, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Storage full or blocked: the form still works, it just isn't kept.
  }
}

export function clearPageDraft(pageKey: string) {
  try {
    sessionStorage.removeItem(PREFIX + pageKey);
  } catch {}
}

export function saveFormSnapshot(pageKey: string, formKey: string, fields: FieldSnapshot[]) {
  const draft = readPageDraft(pageKey) ?? { savedAt: Date.now(), forms: {}, selects: {} };
  draft.forms[formKey] = fields;
  writePageDraft(pageKey, draft);
}

export function saveSelectValue(pageKey: string, selectKey: string, value: string) {
  const draft = readPageDraft(pageKey) ?? { savedAt: Date.now(), forms: {}, selects: {} };
  draft.selects[selectKey] = value;
  writePageDraft(pageKey, draft);
}

// ---- DOM helpers -----------------------------------------------------------

const SKIPPED_INPUT_TYPES = new Set(["hidden", "password", "file", "submit", "button", "reset", "image"]);

export type DraftField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export function draftFields(form: HTMLFormElement): DraftField[] {
  return Array.from(form.elements).filter((el): el is DraftField => {
    if (el instanceof HTMLInputElement) return !SKIPPED_INPUT_TYPES.has(el.type) && !el.hasAttribute("data-no-draft");
    return (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) && !el.hasAttribute("data-no-draft");
  });
}

/** Whether a form is one whose contents should be kept. */
export function isDraftableForm(form: HTMLFormElement): boolean {
  if (form.closest("[data-no-draft], aside, nav")) return false;
  return draftFields(form).length > 0;
}

/**
 * A key that identifies a form across page visits: its id when it has one,
 * otherwise the names of its fields; forms that would still collide (two
 * identical forms on one page) are told apart by their order.
 */
export function formKeyOf(form: HTMLFormElement): string {
  const base = form.id ? `#${form.id}` : draftFields(form).map((f) => f.name).join("|");
  const twins = Array.from(document.forms).filter(
    (other) => isDraftableForm(other) && (other.id ? `#${other.id}` : draftFields(other).map((f) => f.name).join("|")) === base
  );
  return `${base}@${Math.max(0, twins.indexOf(form))}`;
}

export function snapshotForm(form: HTMLFormElement): FieldSnapshot[] {
  return draftFields(form).map((el) => ({
    n: el.name,
    t: el.type,
    v: el.value,
    ...(el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") ? { c: el.checked } : {}),
  }));
}

// React tracks an input's value itself, so assigning `el.value` is ignored by
// controlled inputs. Going through the prototype's setter and then firing the
// events a real edit fires is what makes React see the change.
function setValueLikeAUser(el: DraftField, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Puts saved values back into a form. Returns how many fields changed. */
export function applySnapshot(form: HTMLFormElement, snapshot: FieldSnapshot[]): number {
  const fields = draftFields(form);
  let changed = 0;
  snapshot.forEach((snap, i) => {
    const el = fields[i];
    // Same position, same name and type, or the form has changed shape since
    // (rows added or removed) and the value would land in the wrong field.
    if (!el || el.name !== snap.n || el.type !== snap.t) return;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      if (snap.c !== undefined && el.checked !== snap.c && (el.type === "checkbox" || snap.c)) {
        el.click();
        changed++;
      }
      return;
    }
    if (el.value !== snap.v) {
      setValueLikeAUser(el, snap.v);
      changed++;
    }
  });
  return changed;
}
