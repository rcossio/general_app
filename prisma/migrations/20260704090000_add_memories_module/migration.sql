-- CreateTable
CREATE TABLE "memorial_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "slug" TEXT NOT NULL,
    "facebook" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memorial_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorial_posts" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location_label" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memorial_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memorial_profiles_slug_key" ON "memorial_profiles"("slug");

-- CreateIndex
CREATE INDEX "memorial_profiles_user_id_idx" ON "memorial_profiles"("user_id");

-- CreateIndex
CREATE INDEX "memorial_posts_profile_id_idx" ON "memorial_posts"("profile_id");

-- AddForeignKey
ALTER TABLE "memorial_profiles" ADD CONSTRAINT "memorial_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_posts" ADD CONSTRAINT "memorial_posts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "memorial_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

