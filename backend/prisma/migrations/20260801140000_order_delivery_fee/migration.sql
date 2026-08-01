-- Order money breakdown: subtotal + HB delivery fee = total
ALTER TABLE "orders" ADD COLUMN "subtotal_amount" DECIMAL(12,2);
ALTER TABLE "orders" ADD COLUMN "delivery_fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "orders" SET "subtotal_amount" = "total_amount" WHERE "subtotal_amount" IS NULL;

ALTER TABLE "orders" ALTER COLUMN "subtotal_amount" SET NOT NULL;
