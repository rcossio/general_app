-- CreateTable
CREATE TABLE "community_notices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "note" VARCHAR(280),
    "photo_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "community_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_notices_user_id_idx" ON "community_notices"("user_id");

-- CreateIndex
CREATE INDEX "community_notices_status_idx" ON "community_notices"("status");

-- CreateIndex
CREATE INDEX "community_notices_created_at_idx" ON "community_notices"("created_at");

-- AddForeignKey
ALTER TABLE "community_notices" ADD CONSTRAINT "community_notices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
