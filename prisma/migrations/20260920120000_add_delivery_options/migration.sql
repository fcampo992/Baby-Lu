-- CreateTable: DeliveryOption
CREATE TABLE "DeliveryOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- AlterTable: Order — add deliveryOptionId column (nullable, no FK enforcement in SQLite with relationMode=prisma)
ALTER TABLE "Order" ADD COLUMN "deliveryOptionId" TEXT;
