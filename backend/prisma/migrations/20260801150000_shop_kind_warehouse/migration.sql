-- CreateEnum
CREATE TYPE "ShopKind" AS ENUM ('shop', 'warehouse');

-- AlterTable
ALTER TABLE "shops" ADD COLUMN "kind" "ShopKind" NOT NULL DEFAULT 'shop';

-- CreateIndex
CREATE INDEX "shops_kind_is_active_idx" ON "shops"("kind", "is_active");
