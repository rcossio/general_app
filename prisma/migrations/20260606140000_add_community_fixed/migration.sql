-- AlterTable
ALTER TABLE "community_notices" ADD COLUMN "fixed_at" TIMESTAMP(3);
ALTER TABLE "community_notices" ADD COLUMN "fixed_by_user_id" TEXT;
ALTER TABLE "community_notices" ADD COLUMN "before_photo_url" TEXT;
ALTER TABLE "community_notices" ADD COLUMN "after_photo_url" TEXT;
