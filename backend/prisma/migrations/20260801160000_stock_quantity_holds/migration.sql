-- Soft stock: quantities + checkout holds

CREATE TYPE "StockHoldStatus" AS ENUM ('active', 'consumed', 'released');

ALTER TABLE "shop_products" ADD COLUMN "stock_quantity" INTEGER NOT NULL DEFAULT 0;

UPDATE "shop_products"
SET "stock_quantity" = CASE WHEN "is_in_stock" THEN 100 ELSE 0 END;

CREATE TABLE "stock_holds" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "StockHoldStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_holds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_hold_lines" (
    "id" TEXT NOT NULL,
    "hold_id" TEXT NOT NULL,
    "shop_product_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "stock_hold_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_holds_customer_id_status_idx" ON "stock_holds"("customer_id", "status");
CREATE INDEX "stock_holds_expires_at_idx" ON "stock_holds"("expires_at");
CREATE INDEX "stock_hold_lines_shop_product_id_idx" ON "stock_hold_lines"("shop_product_id");
CREATE INDEX "stock_hold_lines_hold_id_idx" ON "stock_hold_lines"("hold_id");

ALTER TABLE "stock_holds" ADD CONSTRAINT "stock_holds_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_hold_lines" ADD CONSTRAINT "stock_hold_lines_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "stock_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_hold_lines" ADD CONSTRAINT "stock_hold_lines_shop_product_id_fkey" FOREIGN KEY ("shop_product_id") REFERENCES "shop_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_hold_lines" ADD CONSTRAINT "stock_hold_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
