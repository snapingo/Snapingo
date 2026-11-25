import { describe, expect, it } from "vitest";
import { parentOf } from "@/lib/panelBack";

describe("panel back button", () => {
  it("has nothing to go back to on the dashboard", () => {
    expect(parentOf("/admin")).toBeNull();
    expect(parentOf("/staff")).toBeNull();
  });

  it("takes a section's first page back to the dashboard", () => {
    expect(parentOf("/admin/bookings")).toEqual({ href: "/admin", label: "Back to dashboard" });
    expect(parentOf("/staff/leads")).toEqual({ href: "/staff", label: "Back to dashboard" });
  });

  it("takes a record back to its list and an edit back to its record", () => {
    expect(parentOf("/admin/bookings/abc123")).toEqual({ href: "/admin/bookings", label: "Back to bookings" });
    expect(parentOf("/admin/bookings/abc123/edit")).toEqual({ href: "/admin/bookings/abc123", label: "Back to details" });
    expect(parentOf("/staff/custom-packages/new")).toEqual({
      href: "/staff/custom-packages",
      label: "Back to customized packages",
    });
  });

  it("goes invoice edit -> invoice -> booking", () => {
    expect(parentOf("/admin/bookings/abc/invoice/edit")).toEqual({
      href: "/admin/bookings/abc/invoice",
      label: "Back to invoice",
    });
    expect(parentOf("/admin/bookings/abc/invoice")).toEqual({ href: "/admin/bookings/abc", label: "Back to details" });
  });

  it("never points at a page that doesn't exist", () => {
    // Content screens have no record page and no /cms page.
    expect(parentOf("/admin/cms/blog")).toEqual({ href: "/admin", label: "Back to dashboard" });
    expect(parentOf("/admin/cms/blog/new")).toEqual({ href: "/admin/cms/blog", label: "Back to blog" });
    expect(parentOf("/admin/cms/blog/xyz/edit")).toEqual({ href: "/admin/cms/blog", label: "Back to blog" });
    expect(parentOf("/admin/cms/destinations/goa/edit")).toEqual({
      href: "/admin/cms/destinations",
      label: "Back to destinations",
    });
    expect(parentOf("/admin/reviews/abc/edit")).toEqual({ href: "/admin/reviews", label: "Back to reviews" });
  });
});
