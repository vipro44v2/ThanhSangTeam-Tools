"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/security";

export async function deletePostJob(formData: FormData) {
  await requireAdminAccess();

  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.post_jobs.delete({ where: { id } });
  revalidatePath("/posts");
}
