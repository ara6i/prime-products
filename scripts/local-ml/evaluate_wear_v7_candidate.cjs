#!/usr/bin/env node
"use strict";

// Blind private evaluation for a downloaded WEAR v7 candidate. The exact
// held-out row geometry is input; tape is read only after inference for score.

const fs = require("node:fs/promises");
const path = require("node:path");
const ort = require("onnxruntime-node");
const sharp = require("sharp");

const PARTS = ["neck", "chest", "underbust", "waist", "hips"];
const STRICT_CM = 1.27;

function option(name, fallback) {
  const at = process.argv.indexOf(name);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function quantile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function stats(values) {
  if (!values.length) return { count: 0, mean: null, median: null, p95: null, max: null };
  return {
    count: values.length,
    mean: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(6)),
    median: Number(quantile(values, 0.5).toFixed(6)),
    p95: Number(quantile(values, 0.95).toFixed(6)),
    max: Number(Math.max(...values).toFixed(6)),
  };
}

async function rgbTensor(people, projectRoot, width, height, mean, std) {
  const plane = width * height;
  const output = new Float32Array(people.length * plane * 3);
  await Promise.all(people.map(async (person, batchIndex) => {
    if (!person.imagePath) throw new Error(`${person.scanId} has no front-50 render`);
    const decoded = await sharp(path.join(projectRoot, person.imagePath))
      .resize(width, height, { fit: "fill" })
      .removeAlpha()
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (decoded.info.channels !== 3) throw new Error(`${person.scanId} did not decode to RGB`);
    const batchOffset = batchIndex * plane * 3;
    for (let pixel = 0; pixel < plane; pixel += 1) {
      output[batchOffset + pixel] = (decoded.data[pixel * 3] / 255 - mean[0]) / std[0];
      output[batchOffset + plane + pixel] = (decoded.data[pixel * 3 + 1] / 255 - mean[1]) / std[1];
      output[batchOffset + plane * 2 + pixel] = (decoded.data[pixel * 3 + 2] / 255 - mean[2]) / std[2];
    }
  }));
  return new ort.Tensor("float32", output, [people.length, 3, height, width]);
}

function profileTensor(people, runtime) {
  const mean = runtime.normalization.profile_mean;
  const std = runtime.normalization.profile_std;
  const output = new Float32Array(people.length * 4);
  people.forEach((person, index) => {
    const bmi = person.weightKg / ((person.heightCm / 100) ** 2);
    const raw = [person.heightCm, person.weightKg, bmi, person.gender === "female" ? 1 : 0];
    raw.forEach((value, key) => { output[index * 4 + key] = (value - mean[key]) / std[key]; });
  });
  return new ort.Tensor("float32", output, [people.length, 4]);
}

function geometryTensors(people, runtime) {
  const keys = runtime.row_geometry_keys;
  const mean = runtime.normalization.row_geometry_mean;
  const std = runtime.normalization.row_geometry_std;
  const values = new Float32Array(people.length * keys.length);
  const masks = new Float32Array(people.length * PARTS.length);
  people.forEach((person, batchIndex) => {
    keys.forEach((key, keyIndex) => {
      const match = /^(neck|chest|underbust|waist|hips)_(y_norm|left_x_norm|right_x_norm)$/.exec(key);
      if (!match) throw new Error(`Unsupported row geometry key: ${key}`);
      const row = person.rows[match[1]];
      const field = { y_norm: "yNorm", left_x_norm: "leftXNorm", right_x_norm: "rightXNorm" }[match[2]];
      const raw = row?.[field];
      values[batchIndex * keys.length + keyIndex] = finite(raw) ? (raw - mean[keyIndex]) / std[keyIndex] : 0;
    });
    PARTS.forEach((part, partIndex) => {
      const row = person.rows[part];
      masks[batchIndex * PARTS.length + partIndex] = row && finite(row.yNorm) && finite(row.leftXNorm) && finite(row.rightXNorm) ? 1 : 0;
    });
  });
  return {
    row_geometry: new ort.Tensor("float32", values, [people.length, keys.length]),
    row_geometry_mask: new ort.Tensor("float32", masks, [people.length, PARTS.length]),
  };
}

async function main() {
  const projectRoot = path.resolve(option("--project-root", process.cwd()));
  const candidate = path.resolve(option("--candidate", path.join(projectRoot, ".local-ml/checkpoints/.wear3d-standing-rgb-v7-20260816-download")));
  const indexPath = path.resolve(option("--index", path.join(projectRoot, ".local-ml/wear-sdk-heldout/index.json")));
  const outputPath = path.resolve(option("--output", path.join(projectRoot, ".local-ml/reports/wear-v7-heldout-448-audit.json")));
  const runtime = JSON.parse(await fs.readFile(path.join(candidate, "runtime.json"), "utf8"));
  const cloudMetrics = JSON.parse(await fs.readFile(path.join(candidate, "test-metrics.json"), "utf8"));
  const index = JSON.parse(await fs.readFile(indexPath, "utf8"));
  if (runtime.schema_version !== 7) throw new Error(`Expected runtime schema 7, got ${runtime.schema_version}`);
  if (index.personCount !== 448 || index.people.length !== 448) throw new Error(`Expected exactly 448 held-out people, got ${index.people.length}`);
  if (index.people.some((person) => person.role !== "test")) throw new Error("Non-test person entered the held-out audit");
  const session = await ort.InferenceSession.create(path.join(candidate, "model.onnx"), {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });
  const expectedInputs = ["profile", "rgb", "row_geometry", "row_geometry_mask"];
  if (JSON.stringify([...session.inputNames].sort()) !== JSON.stringify(expectedInputs)) {
    throw new Error(`Unexpected ONNX inputs: ${session.inputNames.join(",")}`);
  }
  const [width, height] = runtime.image_size;
  const measurementIndex = Object.fromEntries(runtime.measurement_keys.map((key, index) => [key, index]));
  const edgeIndex = Object.fromEntries(runtime.edge_keys.map((key, index) => [key, index]));
  const peopleResults = [];
  const batchSize = 16;
  for (let offset = 0; offset < index.people.length; offset += batchSize) {
    const people = index.people.slice(offset, offset + batchSize);
    const geometry = geometryTensors(people, runtime);
    const result = await session.run({
      rgb: await rgbTensor(people, projectRoot, width, height, runtime.rgb_mean, runtime.rgb_std),
      profile: profileTensor(people, runtime),
      ...geometry,
    });
    const measurements = result.measurements.data;
    const edges = result.edges.data;
    const measurementStride = runtime.measurement_keys.length;
    const edgeStride = runtime.edge_keys.length;
    people.forEach((person, batchIndex) => {
      const rows = {};
      PARTS.forEach((part) => {
        const source = person.rows[part];
        if (!source) return;
        const targetMap = {
          circumference: person.revealOnly.rowTapeAndCircumferenceCm[part]?.tape,
          breadth: source.frontWidthCm,
          depth: source.depthCm,
        };
        const predicted = {};
        const absoluteError = {};
        for (const [target, actual] of Object.entries(targetMap)) {
          const key = `row.${part}.${target}_cm`;
          const targetIndex = measurementIndex[key];
          if (!finite(actual) || !Number.isInteger(targetIndex)) continue;
          const normalized = measurements[batchIndex * measurementStride + targetIndex];
          const value = normalized * runtime.normalization.measurement_std[targetIndex] + runtime.normalization.measurement_mean[targetIndex];
          predicted[target] = Number(value.toFixed(5));
          absoluteError[target] = Number(Math.abs(value - actual).toFixed(5));
        }
        const lineErrorPx = {};
        for (const [field, sourceField, pixels] of [["y", "yNorm", height], ["left", "leftXNorm", width], ["right", "rightXNorm", width]]) {
          const key = `row.${part}.${field === "y" ? "y_norm" : `${field}_x_norm`}`;
          const targetIndex = edgeIndex[key];
          if (!Number.isInteger(targetIndex) || !finite(source[sourceField])) continue;
          const normalized = edges[batchIndex * edgeStride + targetIndex];
          const value = normalized * runtime.normalization.edge_std[targetIndex] + runtime.normalization.edge_mean[targetIndex];
          lineErrorPx[field] = Number((Math.abs(value - source[sourceField]) * pixels).toFixed(5));
        }
        rows[part] = {
          predicted,
          actualAfterInference: targetMap,
          absoluteError,
          strictHalfInchPass: finite(absoluteError.circumference) && absoluteError.circumference <= STRICT_CM,
          rawRgbLineErrorPx: lineErrorPx,
        };
      });
      peopleResults.push({ scanId: person.scanId, rows });
    });
  }
  const parts = {};
  for (const part of PARTS) {
    const rows = peopleResults.map((person) => person.rows[part]).filter(Boolean);
    const summary = {};
    for (const target of ["circumference", "breadth", "depth"]) {
      summary[`${target}AbsoluteErrorCm`] = stats(rows.map((row) => row.absoluteError[target]).filter(finite));
    }
    const strict = rows.filter((row) => finite(row.absoluteError.circumference));
    const passCount = strict.filter((row) => row.strictHalfInchPass).length;
    parts[part] = {
      ...summary,
      strictHalfInch: {
        thresholdCm: STRICT_CM,
        passCount,
        failCount: strict.length - passCount,
        passRate: strict.length ? Number((passCount / strict.length).toFixed(6)) : null,
      },
      rawRgbLineErrorPx: Object.fromEntries(["y", "left", "right"].map((field) => [field, stats(rows.map((row) => row.rawRgbLineErrorPx[field]).filter(finite))])),
    };
  }
  const eligible = peopleResults.filter((person) => Object.values(person.rows).some((row) => finite(row.absoluteError.circumference)));
  const allPass = eligible.filter((person) => Object.values(person.rows).filter((row) => finite(row.absoluteError.circumference)).every((row) => row.strictHalfInchPass));
  const report = {
    schemaVersion: "wear-v7-heldout-448-audit/v1",
    generatedAt: new Date().toISOString(),
    modelVersion: runtime.model_version,
    runtimeSchema: runtime.schema_version,
    subjectCount: index.people.length,
    testOnly: true,
    tapeUsedByInference: false,
    exactRowGeometryUsed: true,
    releaseApproved: false,
    cloudSyntheticCandidatePassed: cloudMetrics.synthetic_candidate_passed === true,
    strictAllRows: {
      thresholdCm: STRICT_CM,
      eligiblePeople: eligible.length,
      passCount: allPass.length,
      failCount: eligible.length - allPass.length,
      passRate: eligible.length ? Number((allPass.length / eligible.length).toFixed(6)) : null,
    },
    parts,
    people: peopleResults,
  };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(`${outputPath}.tmp`, `${JSON.stringify(report, null, 2)}\n`);
  await fs.rename(`${outputPath}.tmp`, outputPath);
  console.log(JSON.stringify({ output: outputPath, modelVersion: report.modelVersion, strictAllRows: report.strictAllRows, parts: report.parts }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
