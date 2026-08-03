-- CreateTable
CREATE TABLE "customer_favourites" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_favourites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_favourites_customer_id_created_at_idx" ON "customer_favourites"("customer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_favourites_customer_id_product_id_key" ON "customer_favourites"("customer_id", "product_id");

-- AddForeignKey
ALTER TABLE "customer_favourites" ADD CONSTRAINT "customer_favourites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_favourites" ADD CONSTRAINT "customer_favourites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
