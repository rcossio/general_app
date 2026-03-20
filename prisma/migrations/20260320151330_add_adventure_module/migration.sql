-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "chapter" INTEGER NOT NULL DEFAULT 1,
    "next_game_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_locations" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radius_m" INTEGER NOT NULL DEFAULT 30,
    "visible_when" JSONB,
    "values" JSONB NOT NULL,
    "grants" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "game_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_flags" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "set_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_visits" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "games_next_game_id_key" ON "games"("next_game_id");

-- CreateIndex
CREATE INDEX "game_locations_game_id_idx" ON "game_locations"("game_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_locations_game_id_external_id_key" ON "game_locations"("game_id", "external_id");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_idx" ON "game_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_game_id_user_id_key" ON "game_sessions"("game_id", "user_id");

-- CreateIndex
CREATE INDEX "session_flags_session_id_idx" ON "session_flags"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_flags_session_id_flag_key" ON "session_flags"("session_id", "flag");

-- CreateIndex
CREATE INDEX "location_visits_session_id_idx" ON "location_visits"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_visits_session_id_location_id_key" ON "location_visits"("session_id", "location_id");

-- AddForeignKey
ALTER TABLE "game_locations" ADD CONSTRAINT "game_locations_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_flags" ADD CONSTRAINT "session_flags_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_visits" ADD CONSTRAINT "location_visits_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_visits" ADD CONSTRAINT "location_visits_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "game_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
