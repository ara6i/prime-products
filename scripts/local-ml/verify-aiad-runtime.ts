import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { aiadModelDirectory, runAiadTensors } from "../../app/api/try-on-test/wear-photo-test/_lib/aiadRuntime";
import { AIAD_LEVELS, AIAD_MEASURES } from "../../app/try-on-test/wear-photo-test/aiadPreprocessing";

async function main() {
  const root = aiadModelDirectory();
  const npy = await readFile(path.join(root, "test_input_silhouette.npy"));
  assert.equal(npy.subarray(1, 6).toString(), "NUMPY");
  assert.equal(npy[6], 1);
  const offset = 10 + npy.readUInt16LE(8);
  const header = npy.subarray(10, offset).toString();
  assert.match(header, /\|u1/); assert.match(header, /256, 192/); assert.match(header, /False/);
  const silhouette = Float32Array.from(npy.subarray(offset), (p) => p / 255);
  assert.equal(silhouette.length, 256 * 192);
  const expected = JSON.parse(await readFile(path.join(root, "test_expected_outputs.json"), "utf8"));
  for (const [gender, ref] of Object.entries(expected.cases) as Array<[string, { profile_input: number[]; circumference_cm: Record<string, number>; sigma_cm: Record<string, number>; per_level_cm: Record<string, { width: number; depth: number }>; shape_code: number[] }]>) {
    const got = await runAiadTensors(silhouette, new Float32Array(ref.profile_input));
    const diffs = AIAD_MEASURES.map((kind, i) => Math.abs(got.circumference_cm[i]! - ref.circumference_cm[kind]!));
    for (const diff of diffs) assert.ok(diff < 0.05, "Tape does not match Aiad's reference");
    for (const [i, kind] of AIAD_MEASURES.entries()) assert.ok(Math.abs(got.sigma_cm[i]! - ref.sigma_cm[kind]!) < 0.01, "Uncertainty mismatch");
    for (const [i, kind] of AIAD_LEVELS.entries()) { assert.ok(Math.abs(got.per_level_cm[2 * i]! - ref.per_level_cm[kind]!.width) < 0.05, "Width mismatch"); assert.ok(Math.abs(got.per_level_cm[2 * i + 1]! - ref.per_level_cm[kind]!.depth) < 0.05, "Depth mismatch"); }
    for (const [i, value] of ref.shape_code.entries()) assert.ok(Math.abs(got.shape_code[i]! - value) < 0.001, "Shape-code mismatch");
    console.log(JSON.stringify({ gender, pass: true, maxTapeDifferenceCm: Math.max(...diffs), allFourOutputHeadsChecked: true, inferenceMs: got.inferenceMs }));
  }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
