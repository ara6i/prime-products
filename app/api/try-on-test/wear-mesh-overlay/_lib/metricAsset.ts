import { access, mkdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SAFE_SCAN_ID = /^(?:IT|NA|NL)-[0-9]{4}-A$/;
const BUCKET = "primestyleai-wear3d-921049726279-us-east-1";
const SOURCE_PREFIX = "/opt/primestyle/wear3d/";

interface ManifestRecord {
  scan_id: string;
  source?: { mesh?: string; landmarks?: string };
}

interface MetricIndexEntry {
  scanId: string;
  path: string;
}

let manifestPromise: Promise<Map<string, ManifestRecord>> | null = null;
const buildPromises = new Map<string, Promise<{ metricPath: string; directory: string }>>();
const sourcePromises = new Map<string, Promise<{ meshPath: string; landmarkPath: string }>>();

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function manifestRecords() {
  if (manifestPromise) return manifestPromise;
  const manifestPath = path.join(
    process.cwd(),
    ".local-ml",
    "wear3d-v6-audit",
    "source-manifest-standing-a.jsonl",
  );
  manifestPromise = readFile(manifestPath, "utf8").then((source) => new Map(
    source.split("\n")
      .filter(Boolean)
      .map((line) => {
        const record = JSON.parse(line) as ManifestRecord;
        return [record.scan_id, record] as const;
      }),
  ));
  return manifestPromise;
}

function s3Key(sourcePath: string) {
  if (!sourcePath.startsWith(SOURCE_PREFIX)) {
    throw new Error("The WEAR source pointer is outside the verified archive.");
  }
  return sourcePath.slice(SOURCE_PREFIX.length);
}

async function canonicalAsset(scanId: string) {
  const directories = [
    path.join(process.cwd(), ".local-ml", "wear-mesh-overlay", "metric-lines"),
    path.join(process.cwd(), ".local-ml", "wear-mesh-overlay", "all-search-metric-lines"),
  ];
  for (const directory of directories) {
    const indexPath = path.join(directory, "index.json");
    if (!(await exists(indexPath))) continue;
    const index = JSON.parse(await readFile(indexPath, "utf8")) as { scans?: MetricIndexEntry[] };
    const entry = (index.scans ?? []).find((item) => item.scanId === scanId);
    if (!entry || path.basename(entry.path) !== entry.path) continue;
    const metricPath = path.join(directory, entry.path);
    if (await exists(metricPath)) return { metricPath, directory };
  }
  return null;
}

async function buildDynamicAsset(scanId: string) {
  const root = process.cwd();
  const outputDirectory = path.join(root, ".local-ml", "wear-mesh-overlay", "dynamic-metric-lines", scanId.toLowerCase());
  const readyMetricPath = path.join(outputDirectory, `${scanId.toLowerCase()}.json`);
  if (await exists(readyMetricPath)) return { metricPath: readyMetricPath, directory: outputDirectory };

  const source = await loadWearSourcePair(scanId);
  await mkdir(outputDirectory, { recursive: true });

  const python = path.join(root, ".local-ml", "venvs", "sam-3d-body", "bin", "python");
  const script = path.join(root, "scripts", "local-ml", "build_wear_metric_line_assets.py");
  const manifest = path.join(root, ".local-ml", "wear3d-v6-audit", "source-manifest-standing-a.jsonl");
  await execFileAsync(
    python,
    [
      script,
      "--source-dir",
      path.dirname(source.meshPath),
      "--manifest",
      manifest,
      "--output-dir",
      outputDirectory,
      "--scan-id",
      scanId,
    ],
    { cwd: root, timeout: 300_000, maxBuffer: 4 * 1024 * 1024 },
  );

  const metricPath = readyMetricPath;
  if (!(await exists(metricPath))) throw new Error("The exact WEAR metric asset was not created.");
  return { metricPath, directory: outputDirectory };
}

async function ensureWearSourcePair(scanId: string) {
  const root = process.cwd();
  const records = await manifestRecords();
  const record = records.get(scanId);
  if (!record?.source?.mesh || !record.source.landmarks) {
    throw new Error("This scan is missing its verified PLY/LND source pair.");
  }

  const sourceDirectory = path.join(root, ".local-ml", "wear-mesh-overlay", "dynamic-sources", scanId.toLowerCase());
  await mkdir(sourceDirectory, { recursive: true });
  const meshPath = path.join(sourceDirectory, path.basename(record.source.mesh));
  const landmarkPath = path.join(sourceDirectory, path.basename(record.source.landmarks));
  for (const [sourcePath, targetPath] of [
    [record.source.mesh, meshPath],
    [record.source.landmarks, landmarkPath],
  ] as const) {
    if (await exists(targetPath)) continue;
    await execFileAsync(
      "aws",
      [
        "s3",
        "cp",
        `s3://${BUCKET}/${s3Key(sourcePath)}`,
        targetPath,
        "--region",
        "us-east-1",
        "--only-show-errors",
      ],
      { cwd: root, timeout: 240_000, maxBuffer: 2 * 1024 * 1024 },
    );
  }
  return { meshPath, landmarkPath };
}

export async function loadWearSourcePair(scanId: string) {
  if (!SAFE_SCAN_ID.test(scanId)) throw new Error("Unknown WEAR scan.");
  const cached = sourcePromises.get(scanId);
  if (cached) return cached;
  const promise = ensureWearSourcePair(scanId).catch((error) => {
    sourcePromises.delete(scanId);
    throw error;
  });
  sourcePromises.set(scanId, promise);
  return promise;
}

export async function loadMetricAsset(scanId: string) {
  if (!SAFE_SCAN_ID.test(scanId)) throw new Error("Unknown WEAR scan.");
  const canonical = await canonicalAsset(scanId);
  const asset = canonical ?? await (() => {
    const cached = buildPromises.get(scanId);
    if (cached) return cached;
    const promise = buildDynamicAsset(scanId).catch((error) => {
      buildPromises.delete(scanId);
      throw error;
    });
    buildPromises.set(scanId, promise);
    return promise;
  })();

  const metric = JSON.parse(await readFile(asset.metricPath, "utf8")) as {
    frontProjection?: { mesh2d?: { path?: string } };
  } & Record<string, unknown>;
  const browserName = metric.frontProjection?.mesh2d?.path;
  if (!browserName || path.basename(browserName) !== browserName) {
    throw new Error("The browser-safe WEAR projection is unavailable.");
  }
  const mesh2d = JSON.parse(await readFile(path.join(asset.directory, browserName), "utf8")) as Record<string, unknown>;
  return {
    metric,
    mesh2d,
    assetDirectory: asset.directory,
    metricPath: asset.metricPath,
  };
}
