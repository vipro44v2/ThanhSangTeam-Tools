# Media Bulk Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visible-page bulk select, edit, delete, and restore actions to Media Library.

**Architecture:** Selection state stays in `app/media/page.tsx` because the existing page owns asset data and optimistic updates. Backend gets one bulk route, `app/api/media/bulk/route.ts`, backed by focused helpers in `lib/media/service.ts` so tests can validate tag/status/expiry behavior without rendering React.

**Tech Stack:** Next.js App Router, React client state, Prisma 7 generated client, Node test runner with `tsx`.

---

### Task 1: Bulk Update Helpers

**Files:**
- Modify: `lib/media/service.ts`
- Test: `tests/media-bulk.test.ts`

- [ ] Write failing tests for add-tags, replace-tags, status update, and expiry update via a pure input parser.
- [ ] Run `npm.cmd test -- tests/media-bulk.test.ts` and confirm it fails because the helper does not exist.
- [ ] Add `parseBulkMediaUpdateInput` and `bulkUpdateMediaAssets` to `lib/media/service.ts`.
- [ ] Run `npm.cmd test -- tests/media-bulk.test.ts` and confirm it passes.

### Task 2: Bulk API Route

**Files:**
- Create: `app/api/media/bulk/route.ts`

- [ ] Add `PATCH /api/media/bulk` accepting `{ ids, updates }`.
- [ ] Validate that `ids` is a non-empty string array.
- [ ] Return `{ count }` after `bulkUpdateMediaAssets`.

### Task 3: Media Library UI

**Files:**
- Modify: `app/media/page.tsx`

- [ ] Add `selectedAssetIds` state and visible select/clear helpers.
- [ ] Add a checkbox overlay to every media card.
- [ ] Add a bulk toolbar above the grid with `Select visible`, selected count, `Edit`, `Delete`, `Restore`, and `Clear`.
- [ ] Add a bulk edit modal with Status, Tags, Tags mode, and Expiry date fields.
- [ ] Wire bulk delete to status `deleted`, restore to status `available`, and edit to the bulk API.
- [ ] Reload assets/stats/tags after each successful bulk action.

### Task 4: Verification

**Files:**
- No new files.

- [ ] Run `npm.cmd test`.
- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Report any residual local untracked/dirty files separately.
