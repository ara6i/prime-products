import { access, mkdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { isTestLabAvailableForHost } from "@/app/try-on-test/lib/access";
import { loadMetricAsset } from "../../wear-mesh-overlay/_lib/metricAsset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_SCAN_ID = /^(?:NA|NL|IT)-[0-9]{4}-A$/;
const execFileAsync = promisify(execFile);
const dynamicDualPromises = new Map<string, Promise<string>>();

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function preparedDualPath(scanId: string) {
  const dualDirectories = [
    path.join(process.cwd(), ".local-ml", "wear-mesh-overlay", "dual-view"),
    path.join(process.cwd(), ".local-ml", "wear-mesh-overlay", "all-search-dual-view"),
  ];
  for (const directory of dualDirectories) {
    const dualIndexPath = path.join(directory, "index.json");
    try {
      const dualIndex = JSON.parse(await readFile(dualIndexPath, "utf8")) as {
        scans: Array<{ scanId: string; path: string }>;
      };
      const entry = dualIndex.scans.find((candidate) => candidate.scanId === scanId);
      if (entry && path.basename(entry.path) === entry.path) {
        const filePath = path.join(directory, entry.path);
        if (await exists(filePath)) return filePath;
      }
    } catch {
      // Try the next prepared exact side-projection collection.
    }
  }
  return null;
}

async function buildDynamicDualPath(scanId: string, metricDirectory: string) {
  const root = process.cwd();
  const outputDirectory = path.join(
    root,
    ".local-ml",
    "wear-mesh-overlay",
    "dynamic-dual-view",
    scanId.toLowerCase(),
  );
  const readyPath = path.join(outputDirectory, `${scanId.toLowerCase()}.json`);
  if (await exists(readyPath)) return readyPath;

  await mkdir(outputDirectory, { recursive: true });
  const python = path.join(root, ".local-ml", "venvs", "sam-3d-body", "bin", "python");
  const script = path.join(root, "scripts", "local-ml", "build_wear_dual_view_assets.py");
  await execFileAsync(
    python,
    [
      script,
      "--metric-dir",
      metricDirectory,
      "--output-dir",
      outputDirectory,
      "--scan-id",
      scanId,
    ],
    { cwd: root, timeout: 300_000, maxBuffer: 4 * 1024 * 1024 },
  );
  if (!(await exists(readyPath))) throw new Error("The exact WEAR side projection was not created.");
  return readyPath;
}

async function loadDualPath(scanId: string, metricDirectory: string) {
  const prepared = await preparedDualPath(scanId);
  if (prepared) return prepared;
  const current = dynamicDualPromises.get(scanId);
  if (current) return current;
  const promise = buildDynamicDualPath(scanId, metricDirectory).catch((error) => {
    dynamicDualPromises.delete(scanId);
    throw error;
  });
  dynamicDualPromises.set(scanId, promise);
  return promise;
}

export async function GET(request: Request) {
  if (!isTestLabAvailableForHost(request.headers.get("host"))) {
    return NextResponse.json({ error: "The front + side proof is available only inside Test Lab." }, { status: 403 });
  }
  const scanId = new URL(request.url).searchParams.get("scan") ?? "";
  if (!SAFE_SCAN_ID.test(scanId)) return NextResponse.json({ error: "Unknown WEAR scan." }, { status: 400 });
  try {
    const front = await loadMetricAsset(scanId);
    const dual = await loadDualPath(scanId, front.assetDirectory)
      .then((dualPath) => readFile(dualPath, "utf8"))
      .then((value) => JSON.parse(value));
    return NextResponse.json({ scanId, frontMetric: front.metric, frontMesh: front.mesh2d, dual }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "The exact WEAR front + side projection is unavailable." }, { status: 404 });
  }
}
