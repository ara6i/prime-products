import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { heldoutWearPerson } from "../_lib/heldout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARTIFACTS = {
  glb: { fileName: "model.glb", contentType: "model/gltf-binary", disposition: "inline" },
  png: { fileName: "render.png", contentType: "image/png", disposition: "inline" },
  blend: { fileName: "scene.blend", contentType: "application/octet-stream", disposition: "attachment" },
  "camera-canonical": { fileName: "render.png", contentType: "image/png", disposition: "inline" },
  "camera-yaw-left-12": { fileName: "camera-yaw-left-12.png", contentType: "image/png", disposition: "inline" },
  "camera-yaw-right-12": { fileName: "camera-yaw-right-12.png", contentType: "image/png", disposition: "inline" },
  "camera-pitch-up-6": { fileName: "camera-pitch-up-6.png", contentType: "image/png", disposition: "inline" },
  "camera-roll-right-3": { fileName: "camera-roll-right-3.png", contentType: "image/png", disposition: "inline" },
} as const;

type ArtifactKind = keyof typeof ARTIFACTS;

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "WEAR Blender artifacts are private Test Lab only." }, { status: 403 });
  }
  const parameters = new URL(request.url).searchParams;
  const scanId = parameters.get("scanId")?.toUpperCase() ?? "";
  const kind = parameters.get("kind") as ArtifactKind | null;
  if (!kind || !Object.hasOwn(ARTIFACTS, kind) || !(await heldoutWearPerson(scanId))) {
    return NextResponse.json({ error: "Unknown private WEAR artifact." }, { status: 404 });
  }
  const definition = ARTIFACTS[kind];
  try {
    const file = await readFile(path.join(
      process.cwd(),
      ".local-ml",
      "wear-sdk-heldout",
      "blender",
      scanId.toLowerCase(),
      definition.fileName,
    ));
    return new Response(new Uint8Array(file), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${definition.disposition}; filename="${scanId.toLowerCase()}-${definition.fileName}"`,
        "Content-Length": String(file.byteLength),
        "Content-Type": definition.contentType,
      },
    });
  } catch {
    return NextResponse.json({ error: "Render this WEAR scan first." }, { status: 404 });
  }
}
