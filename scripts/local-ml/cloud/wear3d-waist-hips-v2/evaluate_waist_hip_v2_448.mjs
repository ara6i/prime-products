#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ort from "onnxruntime-node";
import sharp from "sharp";

const ROWS = ["waist", "hips"];
const EXPECTED_PEOPLE = 448;
const EXPECTED_TARGETS = 150;
const SOURCE_WIDTH = 192;
const SOURCE_HEIGHT = 256;
const INPUT_WIDTH = 96;
const INPUT_HEIGHT = 128;

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function round(value, digits = 6) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function quantile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function distribution(values) {
  return {
    count: values.length,
    mae: round(mean(values)),
    median: round(quantile(values, 0.5)),
    p90: round(quantile(values, 0.9)),
    p95: round(quantile(values, 0.95)),
    maximum: round(values.length ? Math.max(...values) : null),
    within1Rate: round(values.length ? values.filter((value) => value <= 1).length / values.length : null, 4),
    within2Rate: round(values.length ? values.filter((value) => value <= 2).length / values.length : null, 4),
    within3Rate: round(values.length ? values.filter((value) => value <= 3).length / values.length : null, 4),
    within5Rate: round(values.length ? values.filter((value) => value <= 5).length / values.length : null, 4),
  };
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function fileSha256(filePath) {
  return sha256(await fs.readFile(filePath));
}

async function silhouette(filePath) {
  const decoded = await sharp(filePath)
    .greyscale()
    .threshold(128)
    .resize(INPUT_WIDTH, INPUT_HEIGHT, { kernel: sharp.kernel.linear })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = new Float32Array(INPUT_WIDTH * INPUT_HEIGHT);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = decoded.data[index * decoded.info.channels] / 255;
  }
  const foreground = output.filter((value) => value >= 0.5).length;
  if (foreground < 700 || foreground > 6_000) {
    throw new Error(`Held-out silhouette foreground changed for ${filePath}: ${foreground}`);
  }
  return output;
}

function profile(person) {
  const bmi = person.weightKg / ((person.heightCm / 100) ** 2);
  return [
    (person.heightCm - 170) / 20,
    (person.weightKg - 70) / 25,
    (bmi - 24) / 8,
    person.gender === "female" ? 1 : 0,
    person.gender === "male" ? 1 : 0,
  ];
}

function tape(person, row) {
  const value = person.revealOnly?.rowTapeAndCircumferenceCm?.[row]?.tape;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function shapeStatistics(predictions, truths) {
  if (!predictions.length || predictions.length !== truths.length) {
    return { rSquared: null, betweenPersonVarianceRatio: null };
  }
  const dimensions = truths[0].length;
  const means = Array.from({ length: dimensions }, (_, dimension) => mean(truths.map((row) => row[dimension])));
  let residual = 0;
  let total = 0;
  let predictedVariance = 0;
  let truthVariance = 0;
  for (let dimension = 0; dimension < dimensions; dimension += 1) {
    const predictedMean = mean(predictions.map((row) => row[dimension]));
    for (let person = 0; person < truths.length; person += 1) {
      residual += (predictions[person][dimension] - truths[person][dimension]) ** 2;
      total += (truths[person][dimension] - means[dimension]) ** 2;
      predictedVariance += (predictions[person][dimension] - predictedMean) ** 2;
      truthVariance += (truths[person][dimension] - means[dimension]) ** 2;
    }
  }
  return {
    rSquared: round(total > 0 ? 1 - residual / total : null),
    betweenPersonVarianceRatio: round(truthVariance > 0 ? predictedVariance / truthVariance : null),
  };
}

async function main() {
  const root = process.cwd();
  const packageDir = path.resolve(root, argument("--package-dir", ".local-ml/checkpoints/wear3d-waist-hips-v2"));
  const heldoutIndexPath = path.resolve(root, argument("--heldout-index", ".local-ml/wear-sdk-heldout/index.json"));
  const baselinePath = path.resolve(root, argument(
    "--baseline",
    ".local-ml/checkpoints/wear3d-fresh-v1-full-runpod-h100-20260824/sealed-448-result.json",
  ));
  const outputPath = path.resolve(packageDir, argument("--output", "benchmark-448-result.json"));
  const modelPath = path.join(packageDir, "model.onnx");
  const runtimePath = path.join(packageDir, "runtime.json");
  const [modelBuffer, runtimeBuffer, heldoutBuffer] = await Promise.all([
    fs.readFile(modelPath),
    fs.readFile(runtimePath),
    fs.readFile(heldoutIndexPath),
  ]);
  const runtime = JSON.parse(runtimeBuffer.toString("utf8"));
  const modelSha = sha256(modelBuffer);
  if (
    runtime.schemaVersion !== "wear3d-waist-hips-v2-onnx-runtime/v1"
    || runtime.modelSha256 !== modelSha
    || runtime.targetCount !== EXPECTED_TARGETS
    || runtime.teacherInputsReadOnly !== true
    || runtime.previousWeightsUsed !== false
    || runtime.sealed448SubjectsUsedForTraining !== 0
  ) {
    throw new Error("The waist/hip ONNX failed its provenance contract");
  }
  const heldout = JSON.parse(heldoutBuffer.toString("utf8"));
  const people = heldout.people;
  if (
    heldout.personCount !== EXPECTED_PEOPLE
    || heldout.expectedPersonCount !== EXPECTED_PEOPLE
    || people?.length !== EXPECTED_PEOPLE
    || new Set(people.map((person) => person.scanId)).size !== EXPECTED_PEOPLE
    || people.some((person) => person.role !== "test" || person.viewId !== "front-50")
  ) {
    throw new Error("The 448-person benchmark cohort failed its integrity check");
  }
  const inputs = new Float32Array(EXPECTED_PEOPLE * INPUT_WIDTH * INPUT_HEIGHT);
  const profiles = new Float32Array(EXPECTED_PEOPLE * 5);
  for (let index = 0; index < people.length; index += 1) {
    inputs.set(await silhouette(path.resolve(root, people[index].imagePath)), index * INPUT_WIDTH * INPUT_HEIGHT);
    profiles.set(profile(people[index]), index * 5);
  }
  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });
  const started = performance.now();
  const output = await session.run({
    silhouette: new ort.Tensor("float32", inputs, [EXPECTED_PEOPLE, 1, INPUT_HEIGHT, INPUT_WIDTH]),
    profile: new ort.Tensor("float32", profiles, [EXPECTED_PEOPLE, 5]),
  });
  const inferenceMs = performance.now() - started;
  const targets = output.targets?.data;
  if (!targets || targets.length !== EXPECTED_PEOPLE * EXPECTED_TARGETS) {
    throw new Error("The waist/hip ONNX returned an incompatible output tensor");
  }
  const targetIndex = new Map(runtime.targetSchema.map((key, index) => [key, index]));
  const predicted = (personIndex, key) => {
    const index = targetIndex.get(key);
    return index == null ? null : Number(targets[personIndex * EXPECTED_TARGETS + index]);
  };
  const errors = Object.fromEntries(ROWS.map((row) => [row, {
    yPixels: [], edgePixels: [], widthCm: [], depthCm: [], depthWidthRatio: [], shape: [], tapeCm: [],
  }]));
  const predictedShapes = Object.fromEntries(ROWS.map((row) => [row, []]));
  const truthShapes = Object.fromEntries(ROWS.map((row) => [row, []]));
  const perPerson = [];
  for (let personIndex = 0; personIndex < people.length; personIndex += 1) {
    const person = people[personIndex];
    const rows = {};
    for (const row of ROWS) {
      const truth = person.rows?.[row];
      const validGeometry = truth?.geometryValid === true;
      const prediction = {
        yNorm: predicted(personIndex, `row.${row}.y_norm`),
        leftXNorm: predicted(personIndex, `row.${row}.left_x_norm`),
        rightXNorm: predicted(personIndex, `row.${row}.right_x_norm`),
        widthCm: predicted(personIndex, `row.${row}.width_cm`),
        depthCm: predicted(personIndex, `row.${row}.depth_cm`),
        depthWidthRatio: predicted(personIndex, `row.${row}.depth_width_ratio`),
        tapeCm: predicted(personIndex, `tape.${row}.circumference_cm`),
        shape: Array.from({ length: 32 }, (_, point) => ({
          x: predicted(personIndex, `row.${row}.shape.${String(point).padStart(2, "0")}.x`),
          depth: predicted(personIndex, `row.${row}.shape.${String(point).padStart(2, "0")}.depth`),
        })),
      };
      const actualTape = tape(person, row);
      const actual = validGeometry ? {
        yNorm: truth.yNorm,
        leftXNorm: truth.leftXNorm,
        rightXNorm: truth.rightXNorm,
        widthCm: truth.frontWidthCm,
        depthCm: truth.depthCm,
        depthWidthRatio: truth.depthCm / truth.frontWidthCm,
        tapeCm: actualTape,
        shape: truth.contour32Normalized?.map(([x, depth]) => ({ x, depth })) ?? [],
      } : { tapeCm: actualTape };
      const rowErrors = {};
      if (validGeometry) {
        rowErrors.yPixels = Math.abs(prediction.yNorm - truth.yNorm) * SOURCE_HEIGHT;
        rowErrors.leftPixels = Math.abs(prediction.leftXNorm - truth.leftXNorm) * SOURCE_WIDTH;
        rowErrors.rightPixels = Math.abs(prediction.rightXNorm - truth.rightXNorm) * SOURCE_WIDTH;
        rowErrors.edgePixels = (rowErrors.leftPixels + rowErrors.rightPixels) / 2;
        rowErrors.widthCm = Math.abs(prediction.widthCm - truth.frontWidthCm);
        rowErrors.depthCm = Math.abs(prediction.depthCm - truth.depthCm);
        rowErrors.depthWidthRatio = Math.abs(prediction.depthWidthRatio - truth.depthCm / truth.frontWidthCm);
        for (const metric of ["yPixels", "edgePixels", "widthCm", "depthCm", "depthWidthRatio"]) {
          errors[row][metric].push(rowErrors[metric]);
        }
        if (actual.shape.length === 32) {
          const flattenedPrediction = prediction.shape.flatMap((point) => [point.x, point.depth]);
          const flattenedTruth = actual.shape.flatMap((point) => [point.x, point.depth]);
          rowErrors.shapeCoordinate = mean(flattenedPrediction.map((value, index) => Math.abs(value - flattenedTruth[index])));
          errors[row].shape.push(rowErrors.shapeCoordinate);
          predictedShapes[row].push(flattenedPrediction);
          truthShapes[row].push(flattenedTruth);
        }
      }
      if (actualTape != null) {
        rowErrors.tapeCm = Math.abs(prediction.tapeCm - actualTape);
        errors[row].tapeCm.push(rowErrors.tapeCm);
      }
      rows[row] = {
        validGeometry,
        predicted: JSON.parse(JSON.stringify(prediction, (_, value) => typeof value === "number" ? round(value) : value)),
        actual,
        errors: Object.fromEntries(Object.entries(rowErrors).map(([key, value]) => [key, round(value)])),
      };
    }
    perPerson.push({
      scanId: person.scanId,
      subjectId: person.subjectId,
      gender: person.gender,
      heightCm: person.heightCm,
      weightKg: person.weightKg,
      imagePath: person.imagePath,
      rows,
    });
  }
  const rowMetrics = Object.fromEntries(ROWS.map((row) => [row, {
    yPixels: distribution(errors[row].yPixels),
    edgePixels: distribution(errors[row].edgePixels),
    widthCm: distribution(errors[row].widthCm),
    depthCm: distribution(errors[row].depthCm),
    depthWidthRatio: distribution(errors[row].depthWidthRatio),
    shapeCoordinate: {
      ...distribution(errors[row].shape),
      ...shapeStatistics(predictedShapes[row], truthShapes[row]),
    },
    tapeCm: distribution(errors[row].tapeCm),
  }]));
  let baseline = null;
  try {
    const parsed = JSON.parse(await fs.readFile(baselinePath, "utf8"));
    baseline = Object.fromEntries(ROWS.map((row) => [row, parsed.metrics?.rows?.[row] ?? null]));
  } catch {
    baseline = null;
  }
  const thresholds = {
    waist: { yMean: 3.5, edgeMean: 2.0, widthMean: 1.25, depthMean: 1.5, tapeMean: 2.5, tapeP95: 6.0, shapeRSquared: 0.30, shapeVarianceRatio: 0.35 },
    hips: { yMean: 3.5, edgeMean: 2.0, widthMean: 1.0, depthMean: 1.5, tapeMean: 2.0, tapeP95: 5.0, shapeRSquared: 0.40, shapeVarianceRatio: 0.40 },
  };
  const rowGates = Object.fromEntries(ROWS.map((row) => {
    const metric = rowMetrics[row];
    const threshold = thresholds[row];
    return [row, Boolean(
      metric.yPixels.mae <= threshold.yMean
      && metric.edgePixels.mae <= threshold.edgeMean
      && metric.widthCm.mae <= threshold.widthMean
      && metric.depthCm.mae <= threshold.depthMean
      && metric.tapeCm.mae <= threshold.tapeMean
      && metric.tapeCm.p95 <= threshold.tapeP95
      && metric.shapeCoordinate.rSquared >= threshold.shapeRSquared
      && metric.shapeCoordinate.betweenPersonVarianceRatio >= threshold.shapeVarianceRatio
    )];
  }));
  const baselineImprovement = baseline == null ? null : Object.fromEntries(ROWS.map((row) => [row, {
    yPixelsMaeDelta: round(rowMetrics[row].yPixels.mae - baseline[row].yPixels.mae),
    edgePixelsMaeDelta: round(rowMetrics[row].edgePixels.mae - baseline[row].edgePixels.mae),
    widthCmMaeDelta: round(rowMetrics[row].widthCm.mae - baseline[row].widthCm.mae),
    depthCmMaeDelta: round(rowMetrics[row].depthCm.mae - baseline[row].depthCm.mae),
    tapeCmMaeDelta: round(rowMetrics[row].tapeCm.mae - baseline[row].tapeCm.mae),
    worstTapeCmDelta: round(rowMetrics[row].tapeCm.maximum - baseline[row].tapeCm.maximum),
  }]));
  const result = {
    schemaVersion: "wear3d-waist-hips-v2-benchmark-448/v1",
    state: "completed",
    completedAt: new Date().toISOString(),
    model: {
      version: runtime.modelVersion,
      sha256: modelSha,
      bestEpoch: runtime.bestEpoch,
      bestValidationLoss: runtime.bestValidationLoss,
    },
    cohort: {
      people: EXPECTED_PEOPLE,
      uniquePeople: EXPECTED_PEOPLE,
      role: "test-only",
      views: { "front-50": EXPECTED_PEOPLE },
      women: people.filter((person) => person.gender === "female").length,
      men: people.filter((person) => person.gender === "male").length,
      indexSha256: sha256(heldoutBuffer),
    },
    provenance: {
      usedForTraining: false,
      usedForValidationSelection: false,
      previousWeightsUsed: false,
      teacherInputsReadOnly: true,
      note: "This cohort was sealed for the original run but its labels were already opened on 2026-08-24; this is now an honest fixed benchmark, not a never-seen final test.",
    },
    input: {
      source: "frozen 192x256 held-out WEAR canonical front render",
      preprocessing: "grayscale threshold at 128, then linear resize to 96x128",
      profile: ["height", "weight", "calculated BMI", "female flag", "male flag"],
      importantLimit: "This does not test normal customer photographs or segmentation errors.",
    },
    timing: {
      totalBatchInferenceMs: round(inferenceMs, 3),
      meanInferenceMsPerPerson: round(inferenceMs / EXPECTED_PEOPLE, 4),
      executionProvider: "onnxruntime-node-cpu",
    },
    metrics: { rows: rowMetrics },
    comparisonToFreshV1: baselineImprovement,
    gates: {
      validationGatePassedBeforeBenchmark: runtime.qualityGates?.validationReadyFor448Benchmark === true,
      rows: rowGates,
      benchmark448Passed: Object.values(rowGates).every(Boolean),
      thresholds,
    },
    people: perPerson,
  };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const temporary = `${outputPath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`);
  await fs.rename(temporary, outputPath);
  console.log(JSON.stringify({
    ok: true,
    outputPath,
    outputSha256: await fileSha256(outputPath),
    people: EXPECTED_PEOPLE,
    inferenceMs: result.timing.totalBatchInferenceMs,
    gates: result.gates,
    rows: Object.fromEntries(ROWS.map((row) => [row, {
      yPixelsMae: rowMetrics[row].yPixels.mae,
      edgePixelsMae: rowMetrics[row].edgePixels.mae,
      widthCmMae: rowMetrics[row].widthCm.mae,
      depthCmMae: rowMetrics[row].depthCm.mae,
      shapeRSquared: rowMetrics[row].shapeCoordinate.rSquared,
      shapeVarianceRatio: rowMetrics[row].shapeCoordinate.betweenPersonVarianceRatio,
      tapeCmMae: rowMetrics[row].tapeCm.mae,
      tapeCmP95: rowMetrics[row].tapeCm.p95,
      worstTapeCm: rowMetrics[row].tapeCm.maximum,
    }])),
    comparisonToFreshV1: baselineImprovement,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
