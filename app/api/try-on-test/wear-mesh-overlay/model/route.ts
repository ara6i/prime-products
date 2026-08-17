import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_FILES = {
  "NA-0087-A": "na-0087-a.glb",
  "NA-0252-A": "na-0252-a.glb",
  "NA-1591-A": "na-1591-a.glb",
  "NA-1420-A": "na-1420-a.glb",
  "NA-1220-A": "na-1220-a.glb",
  "NA-3013-A": "na-3013-a.glb",
  "NL-1344-A": "nl-1344-a.glb",
  "NL-5934-A": "nl-5934-a.glb",
  "NL-6759-A": "nl-6759-a.glb",
} as const;

const PHOTO_MODEL_FILES = {
  delaram: {
    posed: "delaram-posed.glb",
    neutral: "delaram-neutral.glb",
    projected: "delaram-projected.json",
    anatomical: "delaram-anatomical.json",
  },
  "delaram-2": {
    posed: "delaram-2-posed.glb",
    neutral: "delaram-2-neutral.glb",
    projected: "delaram-2-projected.json",
    anatomical: "delaram-2-anatomical.json",
  },
} as const;

const SPECIALIST_MODEL_FILES = {
  "shared-parametric": {
    delaram: "delaram-parametric.json",
    "delaram-2": "delaram-2-parametric.json",
  },
  "shared-shape": {
    delaram: "delaram-shared-shape.json",
    "delaram-2": "delaram-2-shared-shape.json",
  },
  arap: {
    delaram: "delaram-arap-residual.json",
    "delaram-2": "delaram-2-arap-residual.json",
  },
} as const;

const MASK_MESH_FILES = {
  delaram: "delaram.json",
  "delaram-2": "delaram-2.json",
} as const;

const BLENDER_MESH_FILES = {
  delaram: "delaram.json",
  "delaram-2": "delaram-2.json",
} as const;

const SAFE_DYNAMIC_PHOTO_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

type ScanId = keyof typeof MODEL_FILES;
type PhotoId = keyof typeof PHOTO_MODEL_FILES;
type PhotoPose = keyof (typeof PHOTO_MODEL_FILES)[PhotoId];
type SpecialistMethod = keyof typeof SPECIALIST_MODEL_FILES;

function isScanId(value: string | null): value is ScanId {
  return value != null && Object.hasOwn(MODEL_FILES, value);
}

function isPhotoId(value: string | null): value is PhotoId {
  return value != null && Object.hasOwn(PHOTO_MODEL_FILES, value);
}

function isPhotoPose(value: string | null): value is PhotoPose {
  return value === "posed" || value === "neutral" || value === "projected" || value === "anatomical";
}

function isSpecialistMethod(value: string | null): value is SpecialistMethod {
  return value != null && Object.hasOwn(SPECIALIST_MODEL_FILES, value);
}

function isSafeDynamicPhotoId(value: string | null): value is string {
  return value != null && SAFE_DYNAMIC_PHOTO_ID.test(value);
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json(
      { error: "WEAR mesh assets are available only inside Test Lab." },
      { status: 403 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const scanId = searchParams.get("scan");
  const photoId = searchParams.get("photo");
  const photoPose = searchParams.get("pose");
  const method = searchParams.get("method");
  const isWearModel = isScanId(scanId) && photoId == null && photoPose == null;
  const isSpecialistModel = scanId == null
    && isPhotoId(photoId)
    && photoPose === "anatomical"
    && isSpecialistMethod(method);
  const isMaskMesh = scanId == null
    && isPhotoId(photoId)
    && photoPose == null
    && method === "mask-2d";
  const isBlenderMesh = scanId == null
    && isSafeDynamicPhotoId(photoId)
    && photoPose == null
    && method === "blender-2d";
  const isPhotoModel = scanId == null
    && isPhotoId(photoId)
    && isPhotoPose(photoPose)
    && method == null;
  if (!isWearModel && !isPhotoModel && !isSpecialistModel && !isMaskMesh && !isBlenderMesh) {
    return NextResponse.json({ error: "Unknown mesh asset." }, { status: 400 });
  }

  try {
    let fileName: string;
    let modelDirectory: "models" | "photo-models" | "anatomical" | "specialist" | "mask-mesh" | "blender-mesh";
    if (isScanId(scanId)) {
      fileName = MODEL_FILES[scanId];
      modelDirectory = "models";
    } else if (isSpecialistModel && isPhotoId(photoId) && isSpecialistMethod(method)) {
      fileName = SPECIALIST_MODEL_FILES[method][photoId];
      modelDirectory = "specialist";
    } else if (isMaskMesh && isPhotoId(photoId)) {
      fileName = MASK_MESH_FILES[photoId];
      modelDirectory = "mask-mesh";
    } else if (isBlenderMesh && isSafeDynamicPhotoId(photoId)) {
      fileName = Object.hasOwn(BLENDER_MESH_FILES, photoId)
        ? BLENDER_MESH_FILES[photoId as keyof typeof BLENDER_MESH_FILES]
        : `${photoId}.json`;
      modelDirectory = "blender-mesh";
    } else if (isPhotoId(photoId) && isPhotoPose(photoPose)) {
      fileName = PHOTO_MODEL_FILES[photoId][photoPose];
      modelDirectory = photoPose === "anatomical" ? "anatomical" : "photo-models";
    } else {
      throw new Error("The validated mesh selection became unavailable.");
    }
    const modelPath = modelDirectory === "specialist"
      ? path.join(
        /* turbopackIgnore: true */ process.cwd(),
        ".local-ml",
        "wear-mesh-proof",
        "delaram-specialist",
        fileName,
      )
      : modelDirectory === "mask-mesh" || modelDirectory === "blender-mesh"
        ? path.join(
          /* turbopackIgnore: true */ process.cwd(),
          ".local-ml",
          "wear-mesh-overlay",
          modelDirectory,
          fileName,
        )
      : path.join(
        /* turbopackIgnore: true */ process.cwd(),
        ".local-ml",
        "wear-mesh-overlay",
        modelDirectory,
        fileName,
      );
    const model = await readFile(modelPath);
    const isProjectionJson = fileName.endsWith(".json");
    return new Response(new Uint8Array(model), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": String(model.byteLength),
        "Content-Type": isProjectionJson ? "application/json" : "model/gltf-binary",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "This browser-ready WEAR mesh has not been generated on this machine." },
      { status: 404 },
    );
  }
}
