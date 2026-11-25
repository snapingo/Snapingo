"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { PanelNavSection } from "@/components/admin/PanelShell";

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Each sidebar section remembers the last page the user was on inside it
// (list filters, an open record, a half-filled edit screen), so leaving to
// look something up elsewhere and clicking the section again lands back where
// they were instead of on its list. Per browser tab (sessionStorage): it
// survives a reload but a fresh tab starts clean, and nothing is shared
// between users of a computer once the tab is closed.
const lastPageKey = (rootHref: string, itemHref: string) => `snapingo:last-page:${rootHref}:${itemHref}`;

function readLastPage(rootHref: string, itemHref: string): string | null {
  try {
    const value = sessionStorage.getItem(lastPageKey(rootHref, itemHref));
    // Only ever a path inside this item - never an arbitrary stored URL.
    return value && (value === itemHref || value.startsWith(`${itemHref}/`) || value.startsWith(`${itemHref}?`))
      ? value
      : null;
  } catch {
    return null;
  }
}

export default function PanelNav({
  sections,
  rootHref,
  onNavigate,
}: {
  sections: PanelNavSection[];
  rootHref: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();

  // Record the current page under the sidebar item it belongs to - the one
  // with the most specific matching link.
  useEffect(() => {
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));
    const owner = hrefs
      .filter((href) => isActive(pathname, href, href === rootHref))
      .sort((a, b) => b.length - a.length)[0];
    if (!owner) return;
    try {
      sessionStorage.setItem(lastPageKey(rootHref, owner), search ? `${pathname}?${search}` : pathname);
    } catch {
      // Storage blocked: the sidebar just behaves as a plain link.
    }
  }, [pathname, search, sections, rootHref]);

  // Clicking a section you're already inside goes to its list (the way back
  // out of a record); clicking it from anywhere else returns to where you
  // left it. Modified clicks (new tab/window) keep the plain link.
  const goTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    onNavigate?.();
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (isActive(pathname, href, href === rootHref)) return;
    const last = readLastPage(rootHref, href);
    if (last && last !== href) {
      e.preventDefault();
      router.push(last);
    }
  };
  // Sections start expanded; only sections with a heading get a toggle at all.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <nav className="flex-1 space-y-4 px-3 py-5">
      {sections.map((section, i) => {
        const key = section.heading ?? String(i);
        const isCollapsed = Boolean(section.heading) && collapsed[key];
        return (
          <div key={key}>
            {section.heading && (
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
                aria-expanded={!isCollapsed}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-ink-700 transition hover:bg-ink-50 hover:text-ink-900"
              >
                <span>{section.heading}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                />
              </button>
            )}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const active = isActive(pathname, item.href, item.href === rootHref);
                      // A link outside any section (Dashboard) sits level with
                      // the section headings, so it takes their size and style.
                      if (!section.heading) {
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={(e) => goTo(e, item.href)}
                            aria-current={active ? "page" : undefined}
                            className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wider transition ${
                              active ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-50 hover:text-ink-900"
                            }`}
                          >
                            {item.label}
                          </Link>
                        );
                      }
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={(e) => goTo(e, item.href)}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                            active ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-50 hover:text-brand-700"
                          }`}
                        >
                          <span className={`h-4.5 w-4.5 ${active ? "text-brand-600" : "text-ink-400"}`}>{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          {Boolean(item.badge) && (
                            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}
