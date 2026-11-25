-- One Trip ID can now carry several packages for the same customer (up to 10,
-- enforced in the app). Every existing quotation becomes package 1 of its own
-- trip, so nothing existing changes.

-- AlterTable
ALTER TABLE "CustomPackage" ADD COLUMN "packageNumber" INTEGER NOT NULL DEFAULT 1;

-- Trip ID alone is no longer unique; Trip ID + package number is.
DROP INDEX "CustomPackage_tripId_key";

-- CreateIndex
CREATE UNIQUE INDEX "CustomPackage_tripId_packageNumber_key" ON "CustomPackage"("tripId", "packageNumber");

-- CreateIndex
CREATE INDEX "CustomPackage_tripId_idx" ON "CustomPackage"("tripId");
