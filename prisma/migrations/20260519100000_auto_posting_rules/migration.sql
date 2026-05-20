CREATE TABLE "auto_posting_rules" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "schedule_type" TEXT NOT NULL DEFAULT 'daily',
    "posts_count" INTEGER NOT NULL DEFAULT 1,
    "start_hour" INTEGER NOT NULL DEFAULT 8,
    "end_hour" INTEGER NOT NULL DEFAULT 22,
    "tag_filter" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "captions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "auto_posting_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auto_posting_rules_page_id_key" ON "auto_posting_rules"("page_id");

ALTER TABLE "auto_posting_rules" ADD CONSTRAINT "auto_posting_rules_page_id_fkey"
    FOREIGN KEY ("page_id") REFERENCES "facebook_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
