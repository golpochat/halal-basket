-- CreateTable
CREATE TABLE "platform_currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange_rate" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_languages" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "native_name" TEXT NOT NULL,
    "is_rtl" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_languages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_currencies_code_key" ON "platform_currencies"("code");

-- CreateIndex
CREATE INDEX "platform_currencies_is_published_sort_order_idx" ON "platform_currencies"("is_published", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "platform_languages_code_key" ON "platform_languages"("code");

-- CreateIndex
CREATE INDEX "platform_languages_is_published_sort_order_idx" ON "platform_languages"("is_published", "sort_order");
