-- media_assets: filter by status (used in almost every query)
CREATE INDEX "media_assets_status_idx" ON "media_assets"("status");
CREATE INDEX "media_assets_status_expires_idx" ON "media_assets"("status", "expires_at");

-- media_assets: GIN index for tags array hasSome queries in generator
CREATE INDEX "media_assets_tags_idx" ON "media_assets" USING GIN("tags");

-- post_jobs: composite index for generator query (page_id + status)
CREATE INDEX "post_jobs_page_id_status_idx" ON "post_jobs"("page_id", "status");
