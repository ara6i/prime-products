#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ort from "onnxruntime-node";
import sharp from "sharp";

const ROWS = ["neck", "chest", "underbust", "waist", "hips"];
const EXPECTED_PEOPLE = 448;
const EXPECTED_TARGETS = 371;
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
  };
}

function passRate(values, threshold) {
  return values.length
    ? round(values.filter((value) => value <= threshold).length / values.length, 4)
    : null;
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
  if (decoded.info.width !== INPUT_WIDTH || decoded.info.height !== INPUT_HEIGHT) {
    throw new Error(`Unexpected held-out mask size for ${filePath}`);
  }
  const output = new Float32Array(INPUT_WIDTH * INPUT_HEIGHT);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = decoded.data[index * decoded.info.channels] / 255;
  }
  const foreground = output.filter((value) => value >= 0.5).length;
  if (foreground < 700 || foreground > 6_000) {
    throw new Error(`Held-out silhouette foreground changed for ${filePath}: ${foreground}`);
  }
  return { output, foreground };
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

function frontRatioTruth(person, key) {
  const shoulder = person.revealOnly?.measurementsCm?.shoulder_breadth_mm;
  const widths = Object.fromEntries(ROWS.map((row) => [row, person.rows?.[row]?.frontWidthCm]));
  if (!Number.isFinite(shoulder) || shoulder <= 0) return null;
  if (key === "ratio.front.shoulder_waist" && Number.isFinite(widths.waist)) return shoulder / widths.waist;
  if (key === "ratio.front.shoulder_hips" && Number.isFinite(widths.hips)) return shoulder / widths.hips;
  if (key === "ratio.front.neck_shoulder" && Number.isFinite(widths.neck)) return widths.neck / shoulder;
  return null;
}

function tapeRatioTruth(person, key) {
  const parts = key.replace("ratio.tape.", "").split("_");
  if (parts.length !== 2) return null;
  const numerator = tape(person, parts[0]);
  const denominator = tape(person, parts[1]);
  return numerator != null && denominator != null && denominator > 0 ? numerator / denominator : null;
}

async function main() {
  const root = process.cwd();
  const packageDir = path.resolve(root, argument(
    "--package-dir",
    ".local-ml/checkpoints/wear3d-fresh-v1-full-runpod-h100-20260824",
  ));
  const heldoutIndexPath = path.resolve(root, argument(
    "--heldout-index",
    ".local-ml/wear-sdk-heldout/index.json",
  ));
  const outputPath = path.resolve(packageDir, argument("--output", "sealed-448-result.json"));
  const modelPath = path.join(packageDir, "model.onnx");
  const runtimePath = path.join(packageDir, "runtime.json");

  // Freeze and identify the selected artifact before opening any sealed labels.
  const [modelBuffer, runtimeBuffer] = await Promise.all([
    fs.readFile(modelPath),
    fs.readFile(runtimePath),
  ]);
  const runtime = JSON.parse(runtimeBuffer.toString("utf8"));
  const modelSha = sha256(modelBuffer);
  if (
    runtime.schemaVersion !== "wear3d-fresh-onnx-runtime/v1"
    || runtime.modelSha256 !== modelSha
    || runtime.targetCount !== EXPECTED_TARGETS
    || runtime.qualityGates?.eligibleForSealedWear448 !== true
    || runtime.sealedTestSubjectsUsed !== 0
  ) {
    throw new Error("The frozen fresh model failed the sealed-test opening gate");
  }
  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });

  const heldoutBuffer = await fs.readFile(heldoutIndexPath);
  const heldout = JSON.parse(heldoutBuffer.toString("utf8"));
  const people = heldout.people;
  if (
    heldout.personCount !== EXPECTED_PEOPLE
    || heldout.expectedPersonCount !== EXPECTED_PEOPLE
    || people?.length !== EXPECTED_PEOPLE
    || new Set(people.map((person) => person.scanId)).size !== EXPECTED_PEOPLE
    || people.some((person) => person.role !== "test" || person.viewId !== "front-50")
  ) {
    throw new Error("The sealed 448-person cohort failed its integrity check");
  }

  const inputs = new Float32Array(EXPECTED_PEOPLE * INPUT_WIDTH * INPUT_HEIGHT);
  const profiles = new Float32Array(EXPECTED_PEOPLE * 5);
  const foregroundCounts = [];
  for (let index = 0; index < people.length; index += 1) {
    const person = people[index];
    const imagePath = path.resolve(root, person.imagePath);
    const decoded = await silhouette(imagePath);
    inputs.set(decoded.output, index * INPUT_WIDTH * INPUT_HEIGHT);
    profiles.set(profile(person), index * 5);
    foregroundCounts.push(decoded.foreground);
  }

  const startedAt = performance.now();
  const output = await session.run({
    silhouette: new ort.Tensor("float32", inputs, [EXPECTED_PEOPLE, 1, INPUT_HEIGHT, INPUT_WIDTH]),
    profile: new ort.Tensor("float32", profiles, [EXPECTED_PEOPLE, 5]),
  });
  const inferenceMs = performance.now() - startedAt;
  const targets = output.targets?.data;
  if (!targets || targets.length !== EXPECTED_PEOPLE * EXPECTED_TARGETS) {
    throw new Error("The fresh ONNX returned an incompatible sealed-test tensor");
  }
  const schema = runtime.targetSchema;
  const targetIndex = new Map(schema.map((key, index) => [key, index]));
  const predicted = (personIndex, key) => {
    const index = targetIndex.get(key);
    return index == null ? null : Number(targets[personIndex * EXPECTED_TARGETS + index]);
  };

  const rowErrors = Object.fromEntries(ROWS.map((row) => [row, {
    yPixels: [],
    edgePixels: [],
    widthCm: [],
    depthCm: [],
    depthWidthRatio: [],
    shape: [],
    tapeCm: [],
  }]));
  const ratioErrors = Object.fromEntries(schema.filter((key) => key.startsWith("ratio.")).map((key) => [key, []]));
  const cameraErrors = Object.fromEntries(schema.filter((key) => key.startsWith("camera.")).map((key) => [key, []]));
  const perPerson = [];

  for (let personIndex = 0; personIndex < people.length; personIndex += 1) {
    const person = people[personIndex];
    const personTapeErrors = [];
    const personLineErrors = [];
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
      const errors = {};
      if (validGeometry) {
        errors.yPixels = Math.abs(prediction.yNorm - truth.yNorm) * SOURCE_HEIGHT;
        errors.leftPixels = Math.abs(prediction.leftXNorm - truth.leftXNorm) * SOURCE_WIDTH;
        errors.rightPixels = Math.abs(prediction.rightXNorm - truth.rightXNorm) * SOURCE_WIDTH;
        errors.edgePixels = (errors.leftPixels + errors.rightPixels) / 2;
        errors.widthCm = Math.abs(prediction.widthCm - truth.frontWidthCm);
        errors.depthCm = Math.abs(prediction.depthCm - truth.depthCm);
        errors.depthWidthRatio = Math.abs(prediction.depthWidthRatio - truth.depthCm / truth.frontWidthCm);
        rowErrors[row].yPixels.push(errors.yPixels);
        rowErrors[row].edgePixels.push(errors.edgePixels);
        rowErrors[row].widthCm.push(errors.widthCm);
        rowErrors[row].depthCm.push(errors.depthCm);
        rowErrors[row].depthWidthRatio.push(errors.depthWidthRatio);
        personLineErrors.push(errors.yPixels, errors.edgePixels);
        if (actual.shape.length === 32) {
          const shapeError = mean(prediction.shape.flatMap((point, index) => [
            Math.abs(point.x - actual.shape[index].x),
            Math.abs(point.depth - actual.shape[index].depth),
          ]));
          errors.shapeCoordinate = shapeError;
          rowErrors[row].shape.push(shapeError);
        }
      }
      if (actualTape != null) {
        errors.tapeCm = Math.abs(prediction.tapeCm - actualTape);
        rowErrors[row].tapeCm.push(errors.tapeCm);
        personTapeErrors.push(errors.tapeCm);
      }
      rows[row] = {
        validGeometry,
        predicted: Object.fromEntries(Object.entries(prediction).map(([key, value]) => [
          key,
          Array.isArray(value)
            ? value.map((point) => ({ x: round(point.x), depth: round(point.depth) }))
            : round(value),
        ])),
        actual,
        errors: Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, round(value)])),
      };
    }

    const ratios = {};
    for (const key of Object.keys(ratioErrors)) {
      const actual = key.startsWith("ratio.front.")
        ? frontRatioTruth(person, key)
        : tapeRatioTruth(person, key);
      const prediction = predicted(personIndex, key);
      const error = actual == null ? null : Math.abs(prediction - actual);
      if (error != null) ratioErrors[key].push(error);
      ratios[key] = { predicted: round(prediction), actual: round(actual), error: round(error) };
    }
    const cameraTruth = {
      "camera.correction_yaw_deg": 0,
      "camera.correction_pitch_deg": 0,
      "camera.correction_roll_deg": 0,
      "camera.correction_target_height_ratio": 0,
      "camera.input_lens_ratio_to_50mm": 1,
      "camera.input_distance_scale": 1,
    };
    const camera = {};
    for (const [key, actual] of Object.entries(cameraTruth)) {
      const prediction = predicted(personIndex, key);
      const error = Math.abs(prediction - actual);
      cameraErrors[key].push(error);
      camera[key] = { predicted: round(prediction), actual, error: round(error) };
    }
    perPerson.push({
      scanId: person.scanId,
      subjectId: person.subjectId,
      gender: person.gender,
      heightCm: person.heightCm,
      weightKg: person.weightKg,
      imagePath: person.imagePath,
      foregroundPixels: foregroundCounts[personIndex],
      meanTapeErrorCm: round(mean(personTapeErrors)),
      meanLineErrorPixels: round(mean(personLineErrors)),
      rows,
      ratios,
      camera,
    });
  }

  const rowMetrics = Object.fromEntries(ROWS.map((row) => [row, {
    yPixels: { ...distribution(rowErrors[row].yPixels), within6Rate: passRate(rowErrors[row].yPixels, 6) },
    edgePixels: { ...distribution(rowErrors[row].edgePixels), within6Rate: passRate(rowErrors[row].edgePixels, 6) },
    widthCm: distribution(rowErrors[row].widthCm),
    depthCm: distribution(rowErrors[row].depthCm),
    depthWidthRatio: distribution(rowErrors[row].depthWidthRatio),
    shapeCoordinate: distribution(rowErrors[row].shape),
    tapeCm: {
      ...distribution(rowErrors[row].tapeCm),
      within1Rate: passRate(rowErrors[row].tapeCm, 1),
      within2Rate: passRate(rowErrors[row].tapeCm, 2),
      within3Rate: passRate(rowErrors[row].tapeCm, 3),
      within5Rate: passRate(rowErrors[row].tapeCm, 5),
    },
  }]));
  const meanRatioMae = mean(Object.values(ratioErrors).flat());
  const criticalLineGate = ["chest", "waist", "hips"].every((row) => (
    rowMetrics[row].yPixels.mae <= 6 && rowMetrics[row].edgePixels.mae <= 6
  ));
  const waistHipTapeGate = ["waist", "hips"].every((row) => rowMetrics[row].tapeCm.mae <= 5);
  const result = {
    schemaVersion: "wear3d-fresh-sealed-448-result/v1",
    state: "completed",
    completedAt: new Date().toISOString(),
    finalTest: true,
    weightsFrozenBeforeLabelsOpened: true,
    usedForTraining: false,
    usedForValidationSelection: false,
    tuningAfterThisResultForbidden: true,
    model: {
      version: runtime.modelVersion,
      sha256: modelSha,
      targetCount: runtime.targetCount,
      bestEpoch: runtime.bestEpoch,
      bestValidationLoss: runtime.bestValidationLoss,
    },
    cohort: {
      people: EXPECTED_PEOPLE,
      records: EXPECTED_PEOPLE,
      uniquePeople: EXPECTED_PEOPLE,
      role: "test-only",
      views: { "front-50": EXPECTED_PEOPLE },
      women: people.filter((person) => person.gender === "female").length,
      men: people.filter((person) => person.gender === "male").length,
      indexSha256: sha256(heldoutBuffer),
    },
    input: {
      source: "frozen 192x256 held-out WEAR front render",
      preprocessing: "grayscale threshold at 128, then linear resize to 96x128",
      profile: ["height", "weight", "calculated BMI", "female flag", "male flag"],
      labelsHiddenUntilAfterOnnx: true,
      canonicalViewsOnly: true,
      importantLimit: "This 448-person result tests canonical synthetic WEAR renders, not normal customer photographs or camera-angle perturbations.",
      foregroundPixels: distribution(foregroundCounts.map((value) => Math.abs(value - mean(foregroundCounts)))),
    },
    timing: {
      totalBatchInferenceMs: round(inferenceMs, 3),
      meanInferenceMsPerPerson: round(inferenceMs / EXPECTED_PEOPLE, 4),
      executionProvider: "onnxruntime-node-cpu",
    },
    metrics: {
      rows: rowMetrics,
      ratios: Object.fromEntries(Object.entries(ratioErrors).map(([key, values]) => [key, distribution(values)])),
      meanRatioMae: round(meanRatioMae),
      camera: Object.fromEntries(Object.entries(cameraErrors).map(([key, values]) => [key, distribution(values)])),
    },
    gates: {
      criticalLineGate,
      waistHipTapeGate,
      sealed448Passed: criticalLineGate && waistHipTapeGate,
      thresholds: {
        criticalRowMeanYPixels: 6,
        criticalRowMeanEdgePixels: 6,
        waistHipMeanTapeCm: 5,
      },
    },
    people: perPerson,
  };
  const temporary = `${outputPath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`);
  await fs.rename(temporary, outputPath);
  const resultSha = await fileSha256(outputPath);
  console.log(JSON.stringify({
    ok: true,
    outputPath,
    outputSha256: resultSha,
    modelSha256: modelSha,
    people: result.cohort.people,
    inferenceMs: result.timing.totalBatchInferenceMs,
    gates: result.gates,
    rows: Object.fromEntries(ROWS.map((row) => [row, {
      yPixelsMae: result.metrics.rows[row].yPixels.mae,
      edgePixelsMae: result.metrics.rows[row].edgePixels.mae,
      widthCmMae: result.metrics.rows[row].widthCm.mae,
      depthCmMae: result.metrics.rows[row].depthCm.mae,
      tapeCmMae: result.metrics.rows[row].tapeCm.mae,
    }])),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
