-- Drop the orphaned game_locations.recurring column.
-- It exists in the DB but not in the Prisma schema (a removed feature whose
-- drop migration was never created), so every `migrate diff` wanted to remove
-- it. No code references it; all 27 rows are the default (false). Reconciles
-- the DB with the schema.

ALTER TABLE "game_locations" DROP COLUMN "recurring";
