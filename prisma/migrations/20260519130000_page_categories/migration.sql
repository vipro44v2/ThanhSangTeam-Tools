CREATE TABLE "page_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "page_categories_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "facebook_pages" ADD COLUMN "category_id" TEXT;

ALTER TABLE "facebook_pages"
    ADD CONSTRAINT "facebook_pages_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "page_categories"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "facebook_pages_category_id_idx" ON "facebook_pages"("category_id");
