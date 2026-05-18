import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForUserAccessToken,
  importFacebookPages,
} from "@/lib/facebook";
import { requireAdminAccess } from "@/lib/security";

export async function GET(request: NextRequest) {
  await requireAdminAccess();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("fb_oauth_state")?.value;

  cookieStore.delete("fb_oauth_state");

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(
      new URL("/facebook-pages?error=oauth-state", request.url),
    );
  }

  try {
    const userAccessToken = await exchangeCodeForUserAccessToken(code);
    const imported = await importFacebookPages(userAccessToken);

    return NextResponse.redirect(
      new URL(`/facebook-pages?imported=${imported.length}`, request.url),
    );
  } catch (error) {
    console.error("Failed to complete Facebook OAuth", error);
    return NextResponse.redirect(
      new URL("/facebook-pages?error=oauth-failed", request.url),
    );
  }
}
