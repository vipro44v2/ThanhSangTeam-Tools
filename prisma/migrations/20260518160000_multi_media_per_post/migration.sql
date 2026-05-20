-- CreateTable post_job_media
CREATE TABLE "post_job_media" (
    "id" TEXT NOT NULL,
    "post_job_id" TEXT NOT NULL,
    "media_asset_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_job_media_pkey" PRIMARY KEY ("id")
);

-- Migrate existing single media_asset_id -> post_job_media
INSERT INTO "post_job_media" ("id", "post_job_id", "media_asset_id", "position")
SELECT gen_random_uuid()::text, "id", "media_asset_id", 0
FROM "post_jobs"
WHERE "media_asset_id" IS NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "post_jobs_media_asset_id_idx";

-- AlterTable: remove media_asset_id
ALTER TABLE "post_jobs" DROP COLUMN IF EXISTS "media_asset_id";

-- CreateIndex
CREATE UNIQUE INDEX "post_job_media_post_job_id_position_key" ON "post_job_media"("post_job_id", "position");
CREATE INDEX "post_job_media_post_job_id_idx" ON "post_job_media"("post_job_id");

-- AddForeignKey
ALTER TABLE "post_job_media" ADD CONSTRAINT "post_job_media_post_job_id_fkey"
    FOREIGN KEY ("post_job_id") REFERENCES "post_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_job_media" ADD CONSTRAINT "post_job_media_media_asset_id_fkey"
    FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
