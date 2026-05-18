CREATE TABLE "facebook_accounts" (
    "id" TEXT NOT NULL,
    "facebook_user_id" TEXT NOT NULL,
    "facebook_user_name" TEXT NOT NULL,
    "user_access_token_encrypted" TEXT NOT NULL,
    "token_status" "TokenStatus" NOT NULL DEFAULT 'active',
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_accounts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "facebook_pages" ADD COLUMN "facebook_account_id" TEXT;

CREATE UNIQUE INDEX "facebook_accounts_facebook_user_id_key" ON "facebook_accounts"("facebook_user_id");
CREATE INDEX "facebook_pages_facebook_account_id_idx" ON "facebook_pages"("facebook_account_id");

ALTER TABLE "facebook_pages" ADD CONSTRAINT "facebook_pages_facebook_account_id_fkey" FOREIGN KEY ("facebook_account_id") REFERENCES "facebook_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
