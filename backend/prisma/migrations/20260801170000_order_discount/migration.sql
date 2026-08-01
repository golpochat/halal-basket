-- Persist coupon discount on orders for reporting / confirmation UI

ALTER TABLE "orders" ADD COLUMN "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "coupon_code" TEXT;
