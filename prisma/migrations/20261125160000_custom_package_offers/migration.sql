-- Hotel offers on a quotation (a 3-star, a 4-star, a 5-star option...), kept
-- as JSON like the price breakup. Nullable, so every existing quotation is
-- unchanged and simply has no offers.

-- AlterTable
ALTER TABLE "CustomPackage" ADD COLUMN "offers" JSONB;
