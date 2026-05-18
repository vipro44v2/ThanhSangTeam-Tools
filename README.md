# Nurse Facebook Auto Poster

MVP web app for managing an AI-generated image library used by Facebook Page posting workflows.

## Setup

```powershell
npm install
copy .env.example .env
npx.cmd prisma migrate dev
npx.cmd prisma generate
npm run dev
```

Open `http://localhost:3000`.

## Media Library

The current MVP implements the image upload module:

- Batch upload for JPEG, PNG, and WebP images
- Comma-separated tags such as `nurse meme, night shift`
- Local file storage under `public/uploads/media`
- Metadata saved in `media_assets`
- Filters by tag and status
- File name search
- Tag suggestions from existing assets
- Pagination for large libraries
- Inline edit for tags and status
- Manual delete that removes the local file and marks the asset as `deleted`

Media API routes:

- `POST /api/media/upload`
- `GET /api/media?page=1&limit=24&search=quote&tag=night%20shift&status=available`
- `GET /api/media/tags`
- `PATCH /api/media/:id`
- `DELETE /api/media/:id`

## Environment

```env
DATABASE_URL="postgresql://postgres:1234@localhost:5432/nurse-fb-auto-poster1?schema=public"
MEDIA_RETENTION_DAYS=7
MEDIA_MAX_FILE_SIZE_MB=10
```

`MEDIA_RETENTION_DAYS` controls `media_assets.expires_at` for uploaded files.

`MEDIA_MAX_FILE_SIZE_MB` controls per-file upload validation.

## Notes For The Team

Uploaded files are intentionally ignored by Git through `/public/uploads`.

The storage helper is isolated in `lib/media/local-storage.ts` so it can be replaced with Cloudflare R2, AWS S3, or Supabase Storage later without changing the API contract.
