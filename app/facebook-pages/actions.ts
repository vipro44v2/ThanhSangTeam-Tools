"use server";

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
    console.error("Failed to import Facebook Pages", error);
    redirect("/facebook-pages?error=import-failed");
  }
}

export async function deleteFacebookPage(formData: FormData) {
  await requireAdminAccess();

  const id = valueAsString(formData.get("id"));

  if (!id) {
    redirect("/facebook-pages?error=missing-page");
  }

  await prisma.facebook_pages.deleteMany({
    where: {
      id,
    },
  });

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

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/login");
}
