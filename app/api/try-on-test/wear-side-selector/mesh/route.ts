import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { loadFrozenWearRun } from "../_lib/runStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MeshView = "front" | "side";

function isView(value: unknown): value is MeshView {
  return value === "front" || value === "side";
}

export async function POST(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "WEAR mesh previews are private Test Lab only." }, { status: 403 });
  }
  try {
    const body = await request.json() as { runId?: unknown; scanId?: unknown; view?: unknown };
    const runId = typeof body.runId === "string" ? body.runId : "";
    const scanId = typeof body.scanId === "string" ? body.scanId.toUpperCase() : "";
    if (!runId || !/^(?:IT|NA|NL)-\d{4}-A$/.test(scanId) || !isView(body.view)) {
      return NextResponse.json({ error: "A valid run, scan, and mesh view are required." }, { status: 400 });
    }
    const run = await loadFrozenWearRun(runId);
    const isInput = scanId === run.inputScanId;
    const isFrozenCandidate = run.rings.some((ring) => ring.candidates.some((candidate) => candidate.scanId === scanId));
    if (!isInput && !isFrozenCandidate) {
      return NextResponse.json({ error: "This mesh is not part of the frozen ranking." }, { status: 403 });
    }
    if (isInput && body.view === "side" && !run.reveal) {
      return NextResponse.json({ error: "The hidden input side mesh is available only after a user selection is revealed." }, { status: 403 });
    }

    const publicOrigin = new URL(request.url).origin;
    // On the authenticated Test Server, calling the public origin from inside
    // the route re-enters the site login boundary without the browser cookie.
    // Keep this private server-to-server hop on loopback instead.
    const internalOrigin = process.env.PRIME_PRODUCTS_INTERNAL_ORIGIN ?? publicOrigin;
    const cookie = request.headers.get("cookie");
    const internalHeaders = {
      "Content-Type": "application/json",
      Host: request.headers.get("host") ?? "",
      ...(cookie ? { Cookie: cookie } : {}),
    };
    const renderResponse = await fetch(new URL("/api/try-on-test/sizing-lab/sdk-wear/render", internalOrigin), {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({ scanId }),
      cache: "no-store",
    });
    const rendered = await renderResponse.json() as {
      ok?: boolean;
      error?: string;
      metadata?: { source?: string; generator?: unknown; geometry?: unknown };
      artifacts?: { front2dUrl?: string; side2dUrl?: string };
    };
    if (!renderResponse.ok || !rendered.ok || !rendered.artifacts) {
      throw new Error(rendered.error || `Blender could not build ${scanId}.`);
    }
    const artifactPath = body.view === "front" ? rendered.artifacts.front2dUrl : rendered.artifacts.side2dUrl;
    if (!artifactPath) throw new Error(`The ${body.view} mesh is missing for ${scanId}.`);
    const artifactResponse = await fetch(new URL(artifactPath, internalOrigin), {
      headers: internalHeaders,
      cache: "no-store",
    });
    if (!artifactResponse.ok) throw new Error(`The ${body.view} Blender mesh could not be read.`);
    const mesh = await artifactResponse.json();
    return NextResponse.json({
      ok: true,
      scanId,
      view: body.view,
      mesh,
      proof: {
        source: rendered.metadata?.source,
        generator: rendered.metadata?.generator,
        geometry: rendered.metadata?.geometry,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The Blender mesh is unavailable." }, { status: 400 });
  }
}
