import { existsSync } from "node:fs";
import path from "node:path";
import type {
  MeshShapeProviderId,
  MeshShapeProviderStatus,
} from "@/app/try-on-test/sizing-lab/lib/meshShapeProviders";

interface ProviderPaths {
  command: string;
  args: string[];
  environment: Record<string, string>;
}

export interface ResolvedMeshShapeProvider {
  status: MeshShapeProviderStatus;
  execution: ProviderPaths | null;
}

function repoPath(relativePath: string): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), relativePath);
}

function configuredPath(environmentName: string, fallbackRelativePath: string): string {
  const configured = process.env[environmentName]?.trim();
  return configured ? path.resolve(configured) : repoPath(fallbackRelativePath);
}

function missingReason(parts: string[]): string {
  return parts.length ? `${parts.join("; ")}.` : "Ready.";
}

function resolveSam3dBody(): ResolvedMeshShapeProvider {
  const modelRoot = configuredPath("PRIMESTYLE_SAM3D_ROOT", ".local-ml/external/sam-3d-body");
  const pythonPath = configuredPath("PRIMESTYLE_SAM3D_PYTHON", ".local-ml/venvs/sam-3d-body/bin/python");
  const checkpointPath = configuredPath(
    "PRIMESTYLE_SAM3D_CHECKPOINT",
    ".local-ml/checkpoints/sam-3d-body-vith/model.ckpt",
  );
  const mhrPath = configuredPath(
    "PRIMESTYLE_SAM3D_MHR",
    ".local-ml/checkpoints/sam-3d-body-vith/assets/mhr_model.pt",
  );
  const runnerPath = configuredPath(
    "PRIMESTYLE_SAM3D_SHAPE_RUNNER",
    "scripts/local-ml/run_sam3d_shape.py",
  );
  const mpsReadyMarker = configuredPath(
    "PRIMESTYLE_SAM3D_MPS_READY_MARKER",
    ".local-ml/checkpoints/sam-3d-body-vith/.mps-ready",
  );
  const codeReady = existsSync(modelRoot) && existsSync(runnerPath);
  const runtimeReady = existsSync(pythonPath);
  const checkpointReady = existsSync(checkpointPath) && existsSync(mhrPath);
  const cudaReady = process.env.PRIMESTYLE_SAM3D_CUDA_READY === "1";
  const mpsReady = process.platform === "darwin" && existsSync(mpsReadyMarker);
  const requestedDevice = process.env.PRIMESTYLE_SAM3D_DEVICE?.trim().toLowerCase();
  const runtimeDevice = requestedDevice === "mps" && mpsReady
    ? "mps"
    : requestedDevice === "cuda" && cudaReady
      ? "cuda"
      : mpsReady
        ? "mps"
        : cudaReady
          ? "cuda"
          : null;
  const missing: string[] = [];
  if (!codeReady) missing.push("Meta SAM 3D Body code is not installed in the local model folder");
  if (!runtimeReady) missing.push("its Python environment is not installed");
  if (!checkpointReady) missing.push("the gated Meta checkpoint and MHR asset are not installed");
  if (!runtimeDevice) missing.push("neither a verified Apple-GPU nor CUDA runtime is available");
  const available = codeReady && runtimeReady && checkpointReady && Boolean(runtimeDevice);
  return {
    status: {
      id: "sam-3d-body",
      label: "Meta SAM 3D Body",
      available,
      codeReady,
      runtimeReady,
      checkpointReady,
      licenseReady: true,
      requiresCuda: runtimeDevice !== "mps",
      runtimeDevice: runtimeDevice ?? undefined,
      reason: available
        ? runtimeDevice === "mps"
          ? "Ready on Apple GPU with the final float64 mesh decoder on CPU."
          : "Ready on CUDA to create a body mesh and fit each saved red row."
        : missingReason(missing),
      setupUrl: "https://github.com/facebookresearch/sam-3d-body",
      licenseUrl: "https://github.com/facebookresearch/sam-3d-body/blob/main/LICENSE",
    },
    execution: available
      ? {
          command: pythonPath,
          args: [runnerPath],
          environment: {
            PRIMESTYLE_SAM3D_ROOT: modelRoot,
            PRIMESTYLE_SAM3D_CHECKPOINT: checkpointPath,
            PRIMESTYLE_SAM3D_MHR: mhrPath,
            PRIMESTYLE_SAM3D_DEVICE: runtimeDevice!,
            ...(runtimeDevice === "mps" ? { PYTORCH_ENABLE_MPS_FALLBACK: "1" } : {}),
          },
        }
      : null,
  };
}

function resolveShapy(): ResolvedMeshShapeProvider {
  const modelRoot = configuredPath("PRIMESTYLE_SHAPY_ROOT", ".local-ml/external/shapy");
  const pythonPath = configuredPath("PRIMESTYLE_SHAPY_PYTHON", ".local-ml/venvs/shapy/bin/python");
  const checkpointPath = configuredPath("PRIMESTYLE_SHAPY_CHECKPOINT", ".local-ml/checkpoints/shapy/SHAPY_A");
  const runnerPath = process.env.PRIMESTYLE_SHAPY_SHAPE_RUNNER?.trim();
  const resolvedRunnerPath = runnerPath ? path.resolve(runnerPath) : "";
  const licenseReady = process.env.PRIMESTYLE_SHAPY_COMMERCIAL_LICENSE_CONFIRMED === "1";
  const codeReady = existsSync(modelRoot) && Boolean(resolvedRunnerPath && existsSync(resolvedRunnerPath));
  const runtimeReady = existsSync(pythonPath);
  const checkpointReady = existsSync(checkpointPath);
  const cudaReady = process.env.PRIMESTYLE_SHAPY_CUDA_READY === "1";
  const missing: string[] = [];
  if (!licenseReady) missing.push("commercial use is blocked until a SHAPY commercial license is confirmed");
  if (!codeReady) missing.push("licensed SHAPY code and a local runner are not configured");
  if (!runtimeReady) missing.push("its Python environment is not installed");
  if (!checkpointReady) missing.push("its licensed checkpoint is not installed");
  if (!cudaReady) missing.push("a CUDA runtime has not been confirmed");
  const available = licenseReady && codeReady && runtimeReady && checkpointReady && cudaReady;
  return {
    status: {
      id: "shapy",
      label: "SHAPY",
      available,
      codeReady,
      runtimeReady,
      checkpointReady,
      licenseReady,
      requiresCuda: true,
      runtimeDevice: cudaReady ? "cuda" : undefined,
      reason: available
        ? "Ready to predict a body mesh and fit a cross-section at each saved red row."
        : missingReason(missing),
      setupUrl: "https://github.com/muelea/shapy",
      licenseUrl: "https://shapy.is.tue.mpg.de/license.html",
    },
    execution: available
      ? {
          command: pythonPath,
          args: [resolvedRunnerPath],
          environment: {
            PRIMESTYLE_SHAPY_ROOT: modelRoot,
            PRIMESTYLE_SHAPY_CHECKPOINT: checkpointPath,
          },
        }
      : null,
  };
}

export function resolveMeshShapeProviders(): ResolvedMeshShapeProvider[] {
  return [resolveSam3dBody(), resolveShapy()];
}

export function resolveMeshShapeProvider(id: MeshShapeProviderId): ResolvedMeshShapeProvider | null {
  return resolveMeshShapeProviders().find((provider) => provider.status.id === id) ?? null;
}
