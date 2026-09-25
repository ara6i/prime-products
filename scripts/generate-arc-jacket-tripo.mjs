import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://openapi.tripo3d.ai/v3";
const INPUT_DIR = path.join(
  ROOT,
  "public/media/partner-landing/merchant-network/arc-jacket-turnaround-v1",
);
const OUTPUT_DIR = path.join(
  ROOT,
  "output/reports/arc-jacket-tripo-v1",
);
const PUBLIC_DIR = path.join(
  ROOT,
  "public/media/partner-landing/merchant-network/arc-jacket-3d-v1",
);
const TASK_PATH = path.join(OUTPUT_DIR, "task.json");
const STATUS_PATH = path.join(OUTPUT_DIR, "status.json");
const API_KEY = process.env.TRIPO_API_KEY;
const MODE = process.argv[2] || "run";

const INPUTS = [
  ["front", "arc-jacket-cobalt-front.png"],
  ["left", "arc-jacket-cobalt-left.png"],
  ["back", "arc-jacket-cobalt-back.png"],
  ["right", "arc-jacket-cobalt-right.png"],
];

if (!API_KEY) throw new Error("TRIPO_API_KEY is required.");

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${API_KEY}`, ...extra };
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || data.code !== 0) {
    throw new Error(
      `Tripo request failed (${response.status}): ${data.message || data.msg || JSON.stringify(data)}`,
    );
  }
  return data.data;
}

async function balance() {
  return apiJson(`${BASE_URL}/account/balance`, {
    headers: authHeaders(),
  });
}

async function uploadImage(filename) {
  const source = path.join(INPUT_DIR, filename);
  if (!existsSync(source)) throw new Error(`Missing input: ${source}`);
  const form = new FormData();
  form.append(
    "file",
    new Blob([readFileSync(source)], { type: "image/png" }),
    filename,
  );
  const data = await apiJson(`${BASE_URL}/files`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return data.file_token;
}

async function submit() {
  if (existsSync(TASK_PATH)) {
    throw new Error("A Tripo task already exists; refusing duplicate credit use.");
  }

  const before = await balance();
  if ((before.balance || 0) < 40) {
    throw new Error(`Insufficient free balance: ${before.balance || 0} credits.`);
  }

  const inputs = [];
  for (const [view, filename] of INPUTS) {
    const fileToken = await uploadImage(filename);
    inputs.push({ [view]: fileToken });
    console.log(`Uploaded ${view}`);
  }

  const request = {
    inputs,
    model: "v3.1-20260211",
    texture: true,
    pbr: true,
    texture_quality: "detailed",
    texture_alignment: "original_image",
    geometry_quality: "detailed",
    export_uv: true,
  };
  const task = await apiJson(`${BASE_URL}/generation/multiview-to-model`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(request),
  });

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(
    TASK_PATH,
    `${JSON.stringify(
      {
        taskId: task.task_id,
        submittedAt: new Date().toISOString(),
        balanceBefore: before,
        request: {
          ...request,
          inputs: INPUTS.map(([view, filename]) => ({ view, filename })),
        },
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Submitted ${task.task_id}`);
  return task.task_id;
}

async function getTask(taskId) {
  return apiJson(`${BASE_URL}/tasks/${taskId}`, {
    headers: authHeaders(),
  });
}

async function waitForTask(taskId) {
  const deadline = Date.now() + 8 * 60 * 1000;
  let lastProgress = -1;
  while (Date.now() < deadline) {
    const task = await getTask(taskId);
    if (task.progress !== lastProgress) {
      console.log(`${task.status} ${task.progress ?? 0}%`);
      lastProgress = task.progress;
    }
    if (task.status === "success") return task;
    if (["failed", "cancelled", "banned"].includes(task.status)) {
      throw new Error(`Tripo task ${task.status}: ${JSON.stringify(task)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("Timed out waiting for Tripo generation.");
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

async function saveResult(task) {
  const modelUrl = task.output?.model_url;
  if (!modelUrl) throw new Error("Tripo returned no model URL.");
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const modelPath = path.join(PUBLIC_DIR, "arc-jacket-cobalt.glb");
  await download(modelUrl, modelPath);

  const previewUrl = task.output?.rendered_image_url;
  let previewPath = null;
  if (previewUrl) {
    previewPath = path.join(PUBLIC_DIR, "arc-jacket-cobalt-preview.png");
    await download(previewUrl, previewPath);
  }

  const after = await balance();
  const status = {
    checkedAt: new Date().toISOString(),
    task,
    balanceAfter: after,
    saved: {
      model: path.relative(ROOT, modelPath),
      preview: previewPath ? path.relative(ROOT, previewPath) : null,
    },
  };
  writeFileSync(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
  console.log(JSON.stringify(status.saved, null, 2));
}

if (MODE === "balance") {
  console.log(JSON.stringify(await balance(), null, 2));
} else if (MODE === "submit") {
  await submit();
} else if (MODE === "poll") {
  if (!existsSync(TASK_PATH)) throw new Error("No submitted Tripo task found.");
  const { taskId } = JSON.parse(readFileSync(TASK_PATH, "utf8"));
  await saveResult(await waitForTask(taskId));
} else if (MODE === "run") {
  const taskId = existsSync(TASK_PATH)
    ? JSON.parse(readFileSync(TASK_PATH, "utf8")).taskId
    : await submit();
  await saveResult(await waitForTask(taskId));
} else {
  throw new Error(`Unknown mode: ${MODE}`);
}
