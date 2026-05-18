import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { facebookOAuthUrl } from "@/lib/facebook";
import { requireAdminAccess } from "@/lib/security";

export async function GET(request: NextRequest) {
  await requireAdminAccess();

  try {
    const state = randomBytes(24).toString("hex");
    const cookieStore = await cookies();

    cookieStore.set("fb_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });

    return NextResponse.redirect(facebookOAuthUrl(state));
  } catch (error) {
    console.error("Failed to start Facebook OAuth", error);
    return NextResponse.redirect(
      new URL("/facebook-pages?error=oauth-not-configured", request.url),
    );
  }
}
