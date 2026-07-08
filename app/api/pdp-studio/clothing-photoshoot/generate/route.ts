import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PDP_STUDIO_SESSION_COOKIE_NAME = "pdp_studio_session";
const TEST_BACKEND_URL = "https://test-be-9a7k.primestyleai.com";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(PDP_STUDIO_SESSION_COOKIE_NAME)?.value;

  if (!session) {
    return NextResponse.json({ ok: false, error: "PDP Studio login is required." }, { status: 401 });
  }

  let body = "";
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read generation request." }, { status: 400 });
  }

  try {
    const response = await fetch(`${getPdpStudioApiBaseUrl()}/api/pdp-studio/clothing-photoshoot/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${PDP_STUDIO_SESSION_COOKIE_NAME}=${session}`,
      },
      body,
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({
      ok: false,
      error: `PDP Studio backend returned ${response.status}.`,
    }));

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to reach the PDP Studio generation server." }, { status: 502 });
  }
}

function getPdpStudioApiBaseUrl(): string {
  return (
    process.env.PRIMESTYLE_PDP_STUDIO_API_INTERNAL_URL ||
    process.env.PRIMESTYLE_API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    TEST_BACKEND_URL
  ).replace(/\/$/, "");
}
