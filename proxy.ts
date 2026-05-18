import { NextRequest, NextResponse } from "next/server";
import { decrypt, encrypt } from "@/lib/session";

const SESSION_DURATION_S = 8 * 60 * 60;
const REFRESH_THRESHOLD_MS = 2 * 60 * 60 * 1000; // refresh if < 2 h remaining

const protectedPrefixes = ["/dashboard", "/facebook-pages", "/api/facebook", "/posts", "/api/upload", "/media", "/api/media"];
const publicRoutes = ["/login", "/"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));
  const isPublic = publicRoutes.includes(path);

  const token = req.cookies.get("session")?.value;
  const session = await decrypt(token);

  if (isProtected && !session?.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublic && session?.userId) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  const res = NextResponse.next();

  if (session?.userId && session.exp) {
    const msRemaining = session.exp * 1000 - Date.now();
    if (msRemaining > 0 && msRemaining < REFRESH_THRESHOLD_MS) {
      const newToken = await encrypt({ userId: session.userId, role: session.role, email: session.email });
      res.cookies.set("session", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_DURATION_S,
        sameSite: "lax",
        path: "/",
      });
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
