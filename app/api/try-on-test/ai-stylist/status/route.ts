import { NextRequest, NextResponse } from "next/server";
import { hasCapacityLabAccess } from "../../capacity-lab/_lib/auth";

export const dynamic = "force-dynamic";

function backendBaseUrl(): string {
  return (
    process.env.PRIMESTYLE_API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "");
}

function testLabApiKey(): string {
  return (
    process.env.PRIMESTYLE_TEST_LAB_API_KEY ||
    process.env.PRIMESTYLE_CAPACITY_LAB_API_KEY ||
    process.env.NEXT_PUBLIC_PRIMESTYLE_TEST_LAB_API_KEY ||
    ""
  );
}

export async function GET(request: NextRequest) {
  if (!(await hasCapacityLabAccess(request))) {
    return NextResponse.json(
      { ok: false, error: "AI Stylist Lab is not available on this host." },
      { status: 404 },
    );
  }

  const apiKey = testLabApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "The server-side test-lab API key is missing." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `${backendBaseUrl()}/api/test-lab/ai-stylist/status`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? `Unable to reach the PrimeStyleAI backend: ${error.message}`
            : "Unable to reach the PrimeStyleAI backend.",
      },
      { status: 502 },
    );
  }
}
