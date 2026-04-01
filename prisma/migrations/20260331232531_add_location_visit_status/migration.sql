-- AlterTable
ALTER TABLE "location_visits" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'open';

-- Set existing visits to 'closed' (they were fully completed in the old system)
UPDATE "location_visits" SET "status" = 'closed';
