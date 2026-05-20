ALTER TABLE "post_jobs"
  ALTER COLUMN "scheduled_at" TYPE TIMESTAMPTZ(3)
  USING "scheduled_at" AT TIME ZONE 'Asia/Bangkok',
  ALTER COLUMN "posted_at" TYPE TIMESTAMPTZ(3)
  USING "posted_at" AT TIME ZONE 'Asia/Bangkok';
