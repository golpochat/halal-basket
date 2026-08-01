-- Featured categories for homepage / sidebar Popular strip
CREATE TABLE "featured_categories" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "featured_categories_category_id_key" ON "featured_categories"("category_id");

CREATE INDEX "featured_categories_is_active_sort_order_idx" ON "featured_categories"("is_active", "sort_order");
