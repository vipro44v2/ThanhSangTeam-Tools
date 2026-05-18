import { redirect } from "next/navigation";
import { getSession, deleteSession } from "@/lib/session";

export const MAX_FACEBOOK_TOKEN_LENGTH = 4096;

export async function requireAdminAccess() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login?error=unauthorized");
  }
}

export async function clearAdminSession() {
  await deleteSession();
}

export function isTokenLengthAllowed(token: string) {
  return token.length > 0 && token.length <= MAX_FACEBOOK_TOKEN_LENGTH;
}
