"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { importFacebookPages } from "@/lib/facebook";
import { prisma } from "@/lib/prisma";
import {
  clearAdminSession,
  isTokenLengthAllowed,
  requireAdminAccess,
} from "@/lib/security";

function valueAsString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

// ---------------------------------------------------------------------------
// Category management
// ---------------------------------------------------------------------------

export async function upsertPageCategory(formData: FormData) {
  await requireAdminAccess();
  const id = valueAsString(formData.get("id"));
  const name = valueAsString(formData.get("name"));
  const color = valueAsString(formData.get("color")) || "#6b7280";
  if (!name) return { error: "Category name is required." };
  if (id) {
    await prisma.page_categories.update({ where: { id }, data: { name, color } });
  } else {
    await prisma.page_categories.create({ data: { id: randomUUID(), name, color } });
  }
  revalidatePath("/facebook-pages");
  revalidatePath("/auto-posting");
  return { error: null };
}

export async function deletePageCategory(formData: FormData) {
  await requireAdminAccess();
  const id = valueAsString(formData.get("id"));
  await prisma.page_categories.deleteMany({ where: { id } });
  revalidatePath("/facebook-pages");
  revalidatePath("/auto-posting");
}

export async function assignPageCategory(formData: FormData) {
  await requireAdminAccess();
  const pageId = valueAsString(formData.get("pageId"));
  const categoryId = valueAsString(formData.get("categoryId")) || null;
  await prisma.facebook_pages.update({
    where: { id: pageId },
    data: { category_id: categoryId },
  });
  revalidatePath("/facebook-pages");
  revalidatePath("/auto-posting");
}

export async function importPagesWithToken(formData: FormData) {
  await requireAdminAccess();

  const token = valueAsString(formData.get("userAccessToken"));

  if (!isTokenLengthAllowed(token)) {
    redirect("/facebook-pages?error=missing-token");
  }

  try {
    const imported = await importFacebookPages(token);
    revalidatePath("/facebook-pages");
    redirect(`/facebook-pages?imported=${imported.length}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to import Facebook Pages", error);
    redirect(`/facebook-pages?error=import-failed&detail=${encodeURIComponent(detail)}`);
  }
}

export async function deleteFacebookPage(formData: FormData) {
  await requireAdminAccess();

  const id = valueAsString(formData.get("id"));

  if (!id) {
    redirect("/facebook-pages?error=missing-page");
  }

  const page = await prisma.facebook_pages.findUnique({
    where: { id },
    select: { facebook_account_id: true },
  });

  await prisma.facebook_pages.deleteMany({ where: { id } });

  if (page?.facebook_account_id) {
    const remaining = await prisma.facebook_pages.count({
      where: { facebook_account_id: page.facebook_account_id },
    });
    if (remaining === 0) {
      await prisma.facebook_accounts.deleteMany({
        where: { id: page.facebook_account_id },
      });
    }
  }

  revalidatePath("/facebook-pages");
}

export async function toggleFacebookPageStatus(formData: FormData) {
  await requireAdminAccess();

  const id = valueAsString(formData.get("id"));
  const nextStatus = valueAsString(formData.get("isActive")) === "true";

  if (!id) {
    redirect("/facebook-pages?error=missing-page");
  }

  await prisma.facebook_pages.updateMany({
    where: {
      id,
    },
    data: {
      is_active: nextStatus,
      updated_at: new Date(),
    },
  });

  revalidatePath("/facebook-pages");
}

export async function updateFacebookPageLimit(formData: FormData) {
  await requireAdminAccess();

  const id = valueAsString(formData.get("id"));
  const rawLimit = valueAsString(formData.get("dailyPostLimit"));
  const dailyPostLimit = Number(rawLimit);

  if (!id) {
    redirect("/facebook-pages?error=missing-page");
  }

  if (!Number.isInteger(dailyPostLimit) || dailyPostLimit < 0 || dailyPostLimit > 50) {
    redirect("/facebook-pages?error=invalid-limit");
  }

  await prisma.facebook_pages.updateMany({
    where: {
      id,
    },
    data: {
      daily_post_limit: dailyPostLimit,
      updated_at: new Date(),
    },
  });

  revalidatePath("/facebook-pages");
}

export async function purgeUnlinkedAccounts() {
  await requireAdminAccess();

  const { count } = await prisma.facebook_accounts.deleteMany({
    where: { facebook_pages: { none: {} } },
  });

  revalidatePath("/facebook-pages");
  redirect(`/facebook-pages?purged=${count}`);
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/login");
}
