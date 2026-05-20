import { NextRequest, NextResponse } from "next/server";
import { runAutoPosting } from "@/lib/auto-posting/generator";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
  const unauthorized = validateCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runAutoPosting();
  return NextResponse.json({ generatedAt: new Date().toISOString(), ...result });
}

function validateCronSecret(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret && process.env.NODE_ENV !== "production") return null;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET is required." }, { status: 500 });

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (bearer === cronSecret || headerSecret === cronSecret) return null;
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}
