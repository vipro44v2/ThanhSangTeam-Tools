import { NextRequest, NextResponse } from "next/server";
import { publishDuePostJobs } from "@/lib/posts/publisher";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
  const unauthorized = validateCronSecret(request);

  if (unauthorized) {
    return unauthorized;
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const result = await publishDuePostJobs(
    Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 50) : 10,
  );

  return NextResponse.json(result);
}

function validateCronSecret(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret && process.env.NODE_ENV !== "production") {
    return null;
  }

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is required." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const bearerSecret = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (bearerSecret === cronSecret || headerSecret === cronSecret) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}
