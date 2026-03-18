-- AlterTable
ALTER TABLE "tracker_entries" ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "workout_routines" ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "tracker_entries_is_public_created_at_idx" ON "tracker_entries"("is_public", "created_at");

-- CreateIndex
CREATE INDEX "workout_routines_is_public_created_at_idx" ON "workout_routines"("is_public", "created_at");
