-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('available', 'used', 'expired', 'deleted');

-- CreateEnum
CREATE TYPE "PostJobStatus" AS ENUM ('pending', 'processing', 'posted', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('active', 'expired', 'error');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'editor');

-- CreateTable
CREATE TABLE "facebook_pages" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "page_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daily_post_limit" INTEGER NOT NULL DEFAULT 3,
    "page_access_token_encrypted" TEXT NOT NULL,
    "token_status" "TokenStatus" NOT NULL DEFAULT 'active',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "size_bytes" INTEGER NOT NULL,
    "tags" TEXT[],
    "status" "MediaStatus" NOT NULL DEFAULT 'available',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_media_usage" (
    "id" TEXT NOT NULL,
    "facebook_page_id" TEXT NOT NULL,
    "media_asset_id" TEXT NOT NULL,
    "post_job_id" TEXT,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_media_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_jobs" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "media_asset_id" TEXT,
    "caption" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "PostJobStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "fb_post_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facebook_pages_page_id_key" ON "facebook_pages"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "page_media_usage_facebook_page_id_idx" ON "page_media_usage"("facebook_page_id");

-- CreateIndex
CREATE INDEX "page_media_usage_media_asset_id_idx" ON "page_media_usage"("media_asset_id");

-- CreateIndex
CREATE INDEX "page_media_usage_post_job_id_idx" ON "page_media_usage"("post_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_media_usage_facebook_page_id_media_asset_id_key" ON "page_media_usage"("facebook_page_id", "media_asset_id");

-- CreateIndex
CREATE INDEX "post_jobs_media_asset_id_idx" ON "post_jobs"("media_asset_id");

-- CreateIndex
CREATE INDEX "post_jobs_page_id_idx" ON "post_jobs"("page_id");

-- CreateIndex
CREATE INDEX "post_jobs_status_scheduled_at_idx" ON "post_jobs"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "page_media_usage" ADD CONSTRAINT "page_media_usage_facebook_page_id_fkey" FOREIGN KEY ("facebook_page_id") REFERENCES "facebook_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_media_usage" ADD CONSTRAINT "page_media_usage_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_media_usage" ADD CONSTRAINT "page_media_usage_post_job_id_fkey" FOREIGN KEY ("post_job_id") REFERENCES "post_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_jobs" ADD CONSTRAINT "post_jobs_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_jobs" ADD CONSTRAINT "post_jobs_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "facebook_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
