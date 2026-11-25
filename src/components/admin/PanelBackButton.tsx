"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { parentOf } from "@/lib/panelBack";

/**
 * Back to the page one level up inside the current section (see
 * src/lib/panelBack.ts), shown at the top of every panel page except the
 * dashboard.
 */
export default function PanelBackButton() {
  const parent = parentOf(usePathname());
  if (!parent) return null;

  return (
    <Link
      href={parent.href}
      className="print-hide mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-brand-600"
    >
      <ArrowLeft className="h-4 w-4" />
      {parent.label}
    </Link>
  );
}
