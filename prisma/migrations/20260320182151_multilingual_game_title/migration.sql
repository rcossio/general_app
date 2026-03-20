/*
  Warnings:

  - Changed the type of `title` on the `games` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "games"
  ALTER COLUMN "title" TYPE JSONB USING jsonb_build_object('en', "title");
