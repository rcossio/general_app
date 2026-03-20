/*
  Warnings:

  - Changed the type of `name` on the `game_locations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "game_locations"
  ALTER COLUMN "name" TYPE JSONB USING jsonb_build_object('en', "name");
