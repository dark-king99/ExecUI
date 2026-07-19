/*
  Warnings:

  - You are about to drop the column `contactId` on the `RolePermission` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_contactId_fkey";

-- AlterTable
ALTER TABLE "RolePermission" DROP COLUMN "contactId";
