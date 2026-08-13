import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PILOT_ROOT = ".local-ml/wear3d-pilot";

type PilotImageView = "render" | "overlay" | "mask";

function isPilotImageView(value: string | null): value is PilotImageView {
  return value === "render" || value === "overlay" || value === "mask";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function resolvePilotImage(projectRoot: string, view: PilotImageView): Promise<string | null> {
  const pilotRoot = path.resolve(projectRoot, PILOT_ROOT);
  const proofDirectories = (await readdir(pilotRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((first, second) => second.name.localeCompare(first.name, undefined, { numeric: true }));

  const candidates: Array<{
    directory: (typeof proofDirectories)[number];
    records: Record<string, unknown>[];
  }> = [];
  for (const directory of proofDirectories) {
    try {
      const proofRoot = path.join(pilotRoot, directory.name);
      const manifest = await readFile(path.join(proofRoot, "render-manifest.jsonl"), "utf8");
      const records = manifest
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .flatMap((line) => {
          try {
            const parsed = asRecord(JSON.parse(line));
            return parsed ? [parsed] : [];
          } catch {
            return [];
          }
        });
      if (records.length > 0) candidates.push({ directory, records });
    } catch {
      // Ignore an incomplete scratch proof.
    }
  }

  candidates.sort((first, second) => (
    second.records.length - first.records.length
    || second.directory.name.localeCompare(first.directory.name, undefined, { numeric: true })
  ));

  for (const candidate of candidates) {
    try {
      const proofRoot = path.join(pilotRoot, candidate.directory.name);
      const record = candidate.records.find((item) => (
        typeof item.subject_id === "string" && typeof item.image === "string"
      ));
      if (!record) continue;

      const subjectId = typeof record.subject_id === "string" ? path.basename(record.subject_id) : null;
      const imagePath = view === "render" && typeof record.image === "string"
        ? path.resolve(projectRoot, record.image)
        : view === "mask" && typeof record.mask === "string"
          ? path.resolve(projectRoot, record.mask)
          : view === "overlay" && subjectId
            ? path.join(proofRoot, "review", "overlays", `${subjectId}-review.png`)
            : null;
      if (imagePath?.startsWith(`${pilotRoot}${path.sep}`)) {
        await access(imagePath);
        return imagePath;
      }
    } catch {
      // Try the previous proof directory when a newer run is incomplete.
    }
  }
  return null;
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "Pilot images are available only inside Test Lab." }, { status: 403 });
  }

  const view = new URL(request.url).searchParams.get("view");
  if (!isPilotImageView(view)) {
    return NextResponse.json({ error: "Choose render, overlay, or mask." }, { status: 400 });
  }

  try {
    const imagePath = await resolvePilotImage(process.cwd(), view);
    if (!imagePath) throw new Error("Pilot image path is missing.");
    const image = await readFile(/* turbopackIgnore: true */ imagePath);
    return new Response(new Uint8Array(image), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "image/png",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The first pilot image is not saved on this machine." },
      { status: 404 },
    );
  }
}
