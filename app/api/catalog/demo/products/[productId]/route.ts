import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface RouteContext {
  params: Promise<{ productId: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { productId } = await context.params;
    const url = new URL(req.url);
    const response = await fetch(
      `${BACKEND}/api/catalog/demo/products/${encodeURIComponent(productId)}${url.search}`,
      { cache: "no-store" },
    );
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Demo product request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
