-- AlterTable
ALTER TABLE "game_locations" ADD COLUMN     "revokes" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'location';
