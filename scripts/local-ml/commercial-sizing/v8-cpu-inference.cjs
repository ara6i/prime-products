'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MODEL_INPUT_WIDTH = 96;
const MODEL_INPUT_HEIGHT = 128;
const SOURCE_MASK_WIDTH = 192;
const SOURCE_MASK_HEIGHT = 256;
const CANONICAL_BODY_HEIGHT = 237;
const CANONICAL_BODY_MAX_WIDTH = 182;

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function largestConnectedSilhouette(source) {
  const visited = new Uint8Array(source.data.length);
  const queue = new Int32Array(source.data.length);
  let best = new Int32Array(0);
  let foregroundPixels = 0;
  for (let start = 0; start < source.data.length; start += 1) {
    if (source.data[start] < 128) continue;
    foregroundPixels += 1;
    if (visited[start]) continue;
    let read = 0;
    let write = 1;
    queue[0] = start;
    visited[start] = 1;
    while (read < write) {
      const current = queue[read++];
      const x = current % source.width;
      const y = Math.floor(current / source.width);
      const neighbours = [
        x > 0 ? current - 1 : -1,
        x + 1 < source.width ? current + 1 : -1,
        y > 0 ? current - source.width : -1,
        y + 1 < source.height ? current + source.width : -1,
      ];
      for (const neighbour of neighbours) {
        if (neighbour < 0 || visited[neighbour] || source.data[neighbour] < 128) continue;
        visited[neighbour] = 1;
        queue[write++] = neighbour;
      }
    }
    if (write > best.length) best = queue.slice(0, write);
  }
  if (best.length < 200) throw new Error('The selected WEAR render has no usable full-body silhouette.');
  const cleaned = new Uint8Array(source.data.length);
  let left = source.width;
  let top = source.height;
  let right = -1;
  let bottom = -1;
  for (const index of best) {
    cleaned[index] = 255;
    const x = index % source.width;
    const y = Math.floor(index / source.width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return {
    cleaned: { data: cleaned, width: source.width, height: source.height },
    box: { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 },
    foregroundPixels,
    keptPixels: best.length,
  };
}

async function decodeThresholdedRender(imagePath, sharp) {
  const decoded = await sharp(imagePath).greyscale().raw().toBuffer({ resolveWithObject: true });
  if (decoded.info.width < 32 || decoded.info.height < 32) throw new Error('The selected WEAR render is too small.');
  const data = new Uint8Array(decoded.info.width * decoded.info.height);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = decoded.data[index * decoded.info.channels] >= 128 ? 255 : 0;
  }
  return { data, width: decoded.info.width, height: decoded.info.height };
}

async function canonicalizeRender(imagePath, sharp) {
  const source = await decodeThresholdedRender(imagePath, sharp);
  const largest = largestConnectedSilhouette(source);
  const box = largest.box;
  const scale = Math.min(CANONICAL_BODY_HEIGHT / box.height, CANONICAL_BODY_MAX_WIDTH / box.width);
  const targetWidth = Math.max(1, Math.round(box.width * scale));
  const targetHeight = Math.max(1, Math.round(box.height * scale));
  const offsetX = Math.floor((SOURCE_MASK_WIDTH - targetWidth) / 2);
  const offsetY = Math.floor((SOURCE_MASK_HEIGHT - targetHeight) / 2);
  const output = new Uint8Array(SOURCE_MASK_WIDTH * SOURCE_MASK_HEIGHT);
  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const sourceY = Math.min(box.bottom, box.top + Math.floor(((targetY + 0.5) / targetHeight) * box.height));
    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceX = Math.min(box.right, box.left + Math.floor(((targetX + 0.5) / targetWidth) * box.width));
      if (largest.cleaned.data[sourceY * source.width + sourceX] >= 128) {
        output[(offsetY + targetY) * SOURCE_MASK_WIDTH + offsetX + targetX] = 255;
      }
    }
  }
  const resized = await sharp(Buffer.from(output), {
    raw: { width: SOURCE_MASK_WIDTH, height: SOURCE_MASK_HEIGHT, channels: 1 },
  }).greyscale().resize(MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT, { kernel: sharp.kernel.linear }).raw().toBuffer({ resolveWithObject: true });
  const modelInput = new Float32Array(MODEL_INPUT_WIDTH * MODEL_INPUT_HEIGHT);
  for (let index = 0; index < modelInput.length; index += 1) modelInput[index] = resized.data[index * resized.info.channels] / 255;
  return {
    modelInput,
    preprocessing: {
      sourceSize: [source.width, source.height],
      threshold: 128,
      connectedComponent: 'largest-4-connected',
      canonicalMaskSize: [SOURCE_MASK_WIDTH, SOURCE_MASK_HEIGHT],
      modelInputSize: [MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT],
      sourceBodyBox: box,
      canonicalBodyBox: { left: offsetX, top: offsetY, width: targetWidth, height: targetHeight },
      removedForegroundPixels: largest.foregroundPixels - largest.keptPixels,
    },
  };
}

function profileFor(person) {
  if (!finite(person.heightCm) || !finite(person.weightKg) || !['female', 'male'].includes(person.gender)) {
    throw new Error(`Invalid V8 profile for ${person.scanId || 'selected person'}.`);
  }
  const bmi = person.weightKg / ((person.heightCm / 100) ** 2);
  return {
    bmi,
    normalized: [
      (person.heightCm - 170) / 20,
      (person.weightKg - 70) / 25,
      (bmi - 24) / 8,
      person.gender === 'female' ? 1 : 0,
      person.gender === 'male' ? 1 : 0,
    ],
  };
}

async function createV8CpuRunner({ frontendRoot, modelRoot }) {
  const sharp = require(path.join(frontendRoot, 'node_modules', 'sharp'));
  const ort = require(path.join(frontendRoot, 'node_modules', 'onnxruntime-node'));
  const runtimePath = path.join(modelRoot, 'runtime.json');
  const modelPath = path.join(modelRoot, 'model.onnx');
  const runtime = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
  const runtimeSha256 = sha256File(runtimePath);
  const modelSha256 = sha256File(modelPath);
  if (runtime.schemaVersion !== 'wear3d-waist-hips-v2-onnx-runtime/v1'
    || runtime.modelSha256 !== modelSha256
    || runtime.targetCount !== 150
    || runtime.targetSchema?.length !== 150
    || runtime.sealed448SubjectsUsedForTraining !== 0) {
    throw new Error('The installed V8 CPU package does not match its frozen runtime contract.');
  }
  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
  });
  if (session.inputNames.join('|') !== 'silhouette|profile' || session.outputNames.join('|') !== 'targets') {
    throw new Error('The installed V8 ONNX tensor names changed.');
  }
  const targetIndex = new Map(runtime.targetSchema.map((key, index) => [key, index]));
  return {
    metadata: {
      version: runtime.modelVersion,
      modelSha256,
      runtimeSha256,
      executionProvider: 'cpu',
      previous448ResultReused: false,
      rows: ['waist', 'hips'],
    },
    async predict(person, imagePath) {
      const startedAt = performance.now();
      const [canonical, profile] = await Promise.all([
        canonicalizeRender(imagePath, sharp),
        Promise.resolve(profileFor(person)),
      ]);
      const output = await session.run({
        silhouette: new ort.Tensor('float32', canonical.modelInput, [1, 1, MODEL_INPUT_HEIGHT, MODEL_INPUT_WIDTH]),
        profile: new ort.Tensor('float32', Float32Array.from(profile.normalized), [1, 5]),
      });
      const targets = output.targets?.data;
      if (!targets || targets.length !== runtime.targetCount) throw new Error(`V8 returned an invalid tensor for ${person.scanId}.`);
      const read = key => {
        const index = targetIndex.get(key);
        const value = index == null ? null : Number(targets[index]);
        return finite(value) ? value : null;
      };
      return {
        scanId: person.scanId,
        predicted: {
          waist: read('tape.waist.circumference_cm'),
          hips: read('tape.hips.circumference_cm'),
          chest: null,
          thigh: null,
        },
        rows: {
          waist: { widthCm: read('row.waist.width_cm'), depthCm: read('row.waist.depth_cm') },
          hips: { widthCm: read('row.hips.width_cm'), depthCm: read('row.hips.depth_cm') },
        },
        preprocessing: canonical.preprocessing,
        inferenceMs: Math.round((performance.now() - startedAt) * 100) / 100,
      };
    },
  };
}

module.exports = { createV8CpuRunner, canonicalizeRender, profileFor, largestConnectedSilhouette };
