-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failed_login_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "delivery_calendar_area_name_is_active_idx" ON "delivery_calendar"("area_name", "is_active");

-- CreateIndex
CREATE INDEX "order_fulfillments_driver_id_delivery_date_idx" ON "order_fulfillments"("driver_id", "delivery_date");

-- CreateIndex
CREATE INDEX "order_fulfillments_shop_id_status_idx" ON "order_fulfillments"("shop_id", "status");

-- CreateIndex
CREATE INDEX "order_fulfillments_delivery_date_idx" ON "order_fulfillments"("delivery_date");

-- CreateIndex
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "shop_products_shop_id_is_in_stock_is_visible_idx" ON "shop_products"("shop_id", "is_in_stock", "is_visible");
