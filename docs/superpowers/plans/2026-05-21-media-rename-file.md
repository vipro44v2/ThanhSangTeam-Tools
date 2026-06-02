# Media Rename File Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users rename the displayed file name when editing a single media asset.

**Architecture:** Store the new name in `media_assets.file_name` only. Do not rename `storage_key` or physical upload files, so existing media URLs continue to work.

**Tech Stack:** Next.js App Router, React client state, Prisma media service, Node test runner with `tsx`.

---

### Task 1: File Name Validation

**Files:**
- Modify: `lib/media/validation.ts`
- Test: `tests/media-validation.test.ts`

- [ ] Add failing tests for trimming valid names and rejecting empty names.
- [ ] Add `parseFileNameInput(input: string): string`.
- [ ] Run `npm.cmd test`.

### Task 2: Backend Update Support

**Files:**
- Modify: `lib/media/service.ts`
- Modify: `app/api/media/[id]/route.ts`

- [ ] Add optional `file_name` to `updateMediaAsset`.
- [ ] Parse and validate `file_name` with `parseFileNameInput`.
- [ ] Accept `file_name` in the PATCH route body.

### Task 3: Edit Form UI

**Files:**
- Modify: `app/media/page.tsx`

- [ ] Add `draftFileName` state in `MediaCard`.
- [ ] Reset it in cancel edit.
- [ ] Add File name input above Tags.
- [ ] Include `file_name` in `handleUpdate`.
- [ ] Optimistically update the card name after save.

### Task 4: Verification

**Files:**
- No new files.

- [ ] Run `npm.cmd test`.
- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Run `npm.cmd run lint`.
