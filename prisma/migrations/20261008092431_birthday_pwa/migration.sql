-- AlterEnum
ALTER TYPE "RewardType" ADD VALUE 'BIRTHDAY_CHAI';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "birthdate" TIMESTAMP(3);
