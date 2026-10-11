-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('OFFLINE', 'ONLINE');

-- AlterEnum
ALTER TYPE "PurchaseType" ADD VALUE 'COMBO';

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "chai_qty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maggie_qty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "payment_mode" "PaymentMode" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "transaction_ref" TEXT;
