"use server";

import { redirect } from "next/navigation";
import { clearAdminSession } from "@/lib/security";

export async function logout() {
  await clearAdminSession();
  redirect("/login");
}
