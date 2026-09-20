-- CreateTable: VariantOption (talles y colores globales configurables)
CREATE TABLE "VariantOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex: VariantOption unique [type, value]
CREATE UNIQUE INDEX "VariantOption_type_value_key" ON "VariantOption"("type", "value");

-- CreateTable: ProductVariant (combinación talle+color con stock propio por producto)
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex: ProductVariant unique [productId, size, color]
CREATE UNIQUE INDEX "ProductVariant_productId_size_color_key" ON "ProductVariant"("productId", "size", "color");

-- AlterTable: OrderItem — agregar columna variantId opcional
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
