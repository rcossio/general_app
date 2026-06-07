-- Drop the disabled Life Tracker and Workout module tables.
-- The modules were removed from the codebase; this reclaims their schema.
-- Child tables first so foreign keys drop cleanly. Data loss is intentional
-- (confirmed with the operator).

DROP TABLE "workout_exercises";
DROP TABLE "workout_days";
DROP TABLE "workout_routines";
DROP TABLE "tracker_entries";
DROP TYPE "TrackerType";
