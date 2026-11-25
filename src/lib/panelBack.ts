// Where the panel's Back button goes: the page one level up inside the
// current sidebar section. (The browser's own Back goes to whatever page was
// open before, which after a trip to another section is that other section.)
// Pure so it can be tested without rendering anything.

const SECTION_LABELS: Record<string, string> = {
  bookings: "bookings",
  "custom-packages": "customized packages",
  leads: "leads",
  "leads-converted": "converted leads",
  "leads-cancelled": "cancelled leads",
  activities: "lead activities",
  trips: "trips",
  "trips-ongoing": "ongoing trips",
  "trips-upcoming": "upcoming trips",
  payments: "payments",
  invoices: "invoices",
  packages: "packages",
  destinations: "destinations",
  flights: "flights",
  hotels: "hotels",
  services: "services",
  blog: "blog",
  reviews: "reviews",
  faq: "FAQ",
  usps: "why choose us",
  "trust-logos": "trust logos",
  "service-categories": "service categories",
  team: "team",
  settings: "settings",
  permissions: "permissions",
  reports: "reports",
  performance: "performance",
  "call-export": "call export",
};

// Content (CMS) screens and reviews have no page for a single record, only a
// list and its edit screen, so "up" from an edit is the list itself.
const EDIT_GOES_TO_LIST = new Set(["cms", "reviews"]);

/** The page one level up from `pathname` and what to call it, or null on the dashboard. */
export function parentOf(pathname: string): { href: string; label: string } | null {
  const [root, ...rest] = pathname.split("/").filter(Boolean);
  if (!root || rest.length === 0) return null;

  let up: string[];
  if (rest[0] === "cms" && rest.length <= 2) {
    // /admin/cms/blog: "cms" is only a path prefix, not a page.
    up = [];
  } else if (rest[rest.length - 1] === "edit" && EDIT_GOES_TO_LIST.has(rest[0])) {
    up = rest.slice(0, -2);
  } else {
    up = rest.slice(0, -1);
  }

  const href = `/${[root, ...up].join("/")}`;
  if (up.length === 0) return { href, label: "Back to dashboard" };

  const last = up[up.length - 1];
  if (SECTION_LABELS[last]) return { href, label: `Back to ${SECTION_LABELS[last]}` };
  if (last === "invoice") return { href, label: "Back to invoice" };
  return { href, label: "Back to details" };
}
