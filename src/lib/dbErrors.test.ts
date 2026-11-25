import { describe, expect, it } from "vitest";
import { RETRY_DELAYS_MS, isTransientDbError } from "@/lib/dbErrors";

describe("transient database errors", () => {
  it("retries a dropped or unreachable connection", () => {
    expect(isTransientDbError(new Error("Connection terminated unexpectedly"))).toBe(true);
    expect(isTransientDbError(new Error("Can't reach database server at aws-0.pooler.supabase.com"))).toBe(true);
    expect(isTransientDbError(new Error("read ECONNRESET"))).toBe(true);
    expect(isTransientDbError(Object.assign(new Error("x"), { code: "P1001" }))).toBe(true);
    expect(isTransientDbError(Object.assign(new Error("x"), { code: "P1008" }))).toBe(true);
  });

  it("looks at the cause too", () => {
    expect(isTransientDbError(new Error("query failed", { cause: new Error("Connection terminated") }))).toBe(true);
  });

  it("never retries a real error", () => {
    expect(isTransientDbError(new Error("Unique constraint failed on the fields: (`tripId`)"))).toBe(false);
    expect(isTransientDbError(Object.assign(new Error("x"), { code: "P2002" }))).toBe(false);
    expect(isTransientDbError(new Error("The column `CustomPackage.offers` does not exist"))).toBe(false);
    expect(isTransientDbError(null)).toBe(false);
  });

  it("backs off between attempts", () => {
    expect(RETRY_DELAYS_MS.length).toBe(2);
    expect(RETRY_DELAYS_MS[1]).toBeGreaterThan(RETRY_DELAYS_MS[0]);
  });
});
