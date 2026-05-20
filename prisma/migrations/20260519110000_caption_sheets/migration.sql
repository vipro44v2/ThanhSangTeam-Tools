CREATE TABLE "caption_sheets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "caption_sheets_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "auto_posting_rules"
    ADD COLUMN "caption_sheet_id" TEXT;

ALTER TABLE "auto_posting_rules"
    ADD CONSTRAINT "auto_posting_rules_caption_sheet_id_fkey"
    FOREIGN KEY ("caption_sheet_id") REFERENCES "caption_sheets"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
