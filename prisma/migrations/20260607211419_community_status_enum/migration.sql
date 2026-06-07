-- Convert community_notices.status from text to a Prisma enum, PRESERVING data
-- (cast open->open, fixed->fixed). Hand-written with ALTER ... USING instead of
-- Prisma's default drop+add, which would reset existing statuses to the default.

CREATE TYPE "CommunityNoticeStatus" AS ENUM ('open', 'fixed');

ALTER TABLE "community_notices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "community_notices"
  ALTER COLUMN "status" TYPE "CommunityNoticeStatus" USING ("status"::"CommunityNoticeStatus");
ALTER TABLE "community_notices" ALTER COLUMN "status" SET DEFAULT 'open';
