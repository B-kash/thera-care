-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'USER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
