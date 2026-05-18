"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

// Pre-computed hash used when the user is not found, so bcrypt.compare always
// runs and response time doesn't reveal whether an email exists in the database.
const DUMMY_HASH = bcrypt.hashSync("__dummy_never_matches__", 10);

function valueAsString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function loginWithCredentials(formData: FormData) {
  const email = valueAsString(formData.get("email"));
  const password = valueAsString(formData.get("password"));

  if (!email || !password) {
    redirect("/login?error=invalid");
  }

  const user = await prisma.users.findUnique({ where: { email } });
  const passwordMatch = await bcrypt.compare(
    password,
    user?.password_hash ?? DUMMY_HASH,
  );

  if (!user || !passwordMatch) {
    redirect("/login?error=invalid");
  }

  await createSession(user.id, user.role, user.email);
  redirect("/dashboard");
}
