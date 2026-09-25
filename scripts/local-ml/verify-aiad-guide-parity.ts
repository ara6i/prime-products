/** Read-only parity check against the actual, checksum-pinned S3 handoff.
 * Requires the existing external-drive NumPy/OpenCV runtime, not PyTorch/GPU.
 * No person data, source archives, model weights or saved reports are modified.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { aiadGuideLines, canonicalizeAiadMask, cleanAiadMask, type AiadRowEndpoints } from "../../app/try-on-test/wear-photo-test/aiadPreprocessing";

const root = process.env.WEAR_AIAD_ARTIFACT_DIR ?? "/Volumes/PrimeStorage/PrimeStyleAI-model-artifacts/aiad/wear-student-2d-v1";
const python = process.env.WEAR_AIAD_PARITY_PYTHON ?? "/Volumes/PrimeStorage/PrimeStyleAI-model-artifacts/aiad/aiad-runtime/bin/python";
const archive = path.join(root, "code/deployment.tar.gz");
const archiveHash = "646cf9bd992d5264a3f0437b3b4b6113582361f697d5195fdfefbfe5ecb8012a";
assert.equal(createHash("sha256").update(readFileSync(archive)).digest("hex"), archiveHash, "Deployment source changed; review it before comparing");

type Case = { width: number; height: number; heightCm: number; pixels: Uint8Array };
const cases: Case[] = [];
const npy = readFileSync(path.join(root, "onnx/test_input_silhouette.npy"));
assert.equal(npy[6], 1); assert.match(npy.subarray(10, 10 + npy.readUInt16LE(8)).toString(), /256, 192/);
cases.push({ width: 192, height: 256, heightCm: 168, pixels: npy.subarray(10 + npy.readUInt16LE(8)) });

// The exact-framing half-pixel regression: rounded prose gave 69, NPZ gives 70.
const halfPixel = new Uint8Array(200 * 500);
for (let y = 10; y < 476; y++) for (let x = 30; x < 169; x++) halfPixel[y * 200 + x] = 255;
cases.push({ width: 200, height: 500, heightCm: 170, pixels: halfPixel });

let seed = 20260831;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
for (let i = 0; i < 100; i++) {
  const width = 192 + Math.floor(random() * 180), height = 300 + Math.floor(random() * 240);
  const pixels = new Uint8Array(width * height);
  const baseWidth = height * (.18 + random() * .12), phase = random() * 4;
  for (let y = 12; y < height - 12; y++) {
    const torsoWidth = baseWidth * (.90 + .13 * Math.sin(y / height * 12 + phase));
    const left = Math.floor(width / 2 - torsoWidth / 2), right = Math.floor(width / 2 + torsoWidth / 2);
    for (let x = left; x <= right; x++) pixels[y * width + x] = 255;
    // Detached arms, joined at one shoulder band: tests torso vs full extent.
    if (y > height * .2 && y < height * .65) {
      const gap = 7, arm = 8;
      for (let x = Math.max(1, left - gap - arm); x < left - gap; x++) pixels[y * width + x] = 255;
      for (let x = right + gap; x < Math.min(width - 1, right + gap + arm); x++) pixels[y * width + x] = 255;
      if (y < height * .2 + 4) for (let x = Math.max(1, left - gap - arm); x < Math.min(width - 1, right + gap + arm); x++) pixels[y * width + x] = 255;
    }
  }
  pixels[0] = 255; // Stray component and a small internal hole.
  pixels[Math.floor(height / 2) * width + Math.floor(width / 2)] = 0;
  cases.push({ width, height, heightCm: 148 + random() * 50, pixels });
}

// Compile only the previously audited pure functions from Aiad's archive.
// This never imports his checkpoint loader or deserializes .pt/pickle files.
const original = String.raw`
import ast, base64, io, json, sys, tarfile
import cv2
import numpy as np
from scipy import ndimage

request = json.load(sys.stdin)
with tarfile.open(sys.argv[1], "r:gz") as archive:
    def source(name):
        return archive.extractfile("deployment/" + name).read().decode()
    namespace = {"np": np, "H": 256, "W": 192}
    constants = ast.parse(source("wear_measure/constants.py"))
    levels = next(ast.literal_eval(node.value) for node in constants.body
                  if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == "LEVELS")
    namespace["LEVEL_FRAC"] = dict(levels)
    for filename, names in [("wear_measure/predict.py", ["_torso_run", "row_endpoints"]),
                            ("wear_measure/frontend.py", ["canonicalize"])]:
        tree = ast.parse(source(filename))
        chosen = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
        assert len(chosen) == len(names)
        exec(compile(ast.Module(body=chosen, type_ignores=[]), filename, "exec"), namespace)
    bundle = np.load(io.BytesIO(archive.extractfile("deployment/deploy_bundle.npz").read()), allow_pickle=False)
    framing = {str(k): float(v) for k, v in zip(bundle["framing_keys"], bundle["framing"])}

out = []
for case in request:
    mask = np.frombuffer(base64.b64decode(case["pixels"]), np.uint8).reshape(case["height"], case["width"])
    mask = (mask > 127).astype(np.uint8)
    n, labels = cv2.connectedComponents(mask)
    if n > 1:
        sizes = [(labels == k).sum() for k in range(1, n)]
        mask = (labels == (1 + int(np.argmax(sizes)))).astype(np.uint8)
    mask = ndimage.binary_fill_holes(mask).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    canonical = namespace["canonicalize"](mask, framing)
    out.append({"clean": base64.b64encode(mask.tobytes()).decode(),
                "canonical": base64.b64encode(canonical.tobytes()).decode(),
                "guides": namespace["row_endpoints"](canonical, case["heightCm"])})
print(json.dumps({"framing": framing, "cases": out}))
`;
const run = spawnSync(python, ["-c", original, archive], {
  input: JSON.stringify(cases.map((item) => ({ ...item, pixels: Buffer.from(item.pixels).toString("base64") }))),
  encoding: "utf8", timeout: 60_000, maxBuffer: 40_000_000,
  env: { ...process.env, OMP_NUM_THREADS: "2", OPENBLAS_NUM_THREADS: "2" },
});
if (run.error) throw run.error;
assert.equal(run.status, 0, run.stderr);
const reference = JSON.parse(run.stdout) as { framing: Record<string, number>; cases: Array<{ clean: string; canonical: string; guides: Record<string, AiadRowEndpoints> }> };
let guideComparisons = 0;
for (const [i, item] of cases.entries()) {
  const clean = cleanAiadMask(item.pixels, item.width, item.height);
  const canonical = canonicalizeAiadMask(clean.mask, item.width, item.height);
  const ref = reference.cases[i]!;
  assert.equal(Buffer.compare(Buffer.from(clean.mask), Buffer.from(ref.clean, "base64")), 0, `Mask cleanup case ${i}`);
  const referenceMask = Buffer.from(ref.canonical, "base64");
  const pixelDiffs = Array.from(canonical.mask).flatMap((value, index) => value !== referenceMask[index] ? [{ x: index % 192, y: Math.floor(index / 192), actual: value, expected: referenceMask[index] }] : []);
  assert.equal(pixelDiffs.length, 0, `Canonical pixels case ${i}: ${JSON.stringify({ box: canonical.sourceBox, transform: canonical.transform, count: pixelDiffs.length, first: pixelDiffs.slice(0, 5) })}`);
  for (const guide of aiadGuideLines(canonical, item.heightCm)) {
    assert.deepEqual(guide.endpoints, ref.guides[guide.kind] ?? null, `Helper output case ${i} ${guide.kind}`);
    if (!guide.endpoints || !guide.line) continue;
    assert.equal(guide.line.canonical.left.x * 192, guide.endpoints.A_px);
    assert.equal(guide.line.canonical.right.x * 192, guide.endpoints.B_px);
    assert.equal(guide.line.canonical.left.y * 256, guide.endpoints.row_px);
    guideComparisons++;
  }
}
console.log(JSON.stringify({ pass: true, sourceArchiveSha256: archiveHash, masksCompared: cases.length, guideComparisons,
  cleanupPixelDifferences: 0, canonicalPixelDifferences: 0, helperFieldDifferences: 0,
  framing: reference.framing, limit: "Adapter parity, not anatomical accuracy or real-photo segmentation accuracy." }, null, 2));
