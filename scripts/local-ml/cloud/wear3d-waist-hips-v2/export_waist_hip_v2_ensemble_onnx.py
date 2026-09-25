#!/usr/bin/env python3
"""Export the selected two-candidate fresh waist/hip ensemble as ONNX."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
import onnx
import torch

from waist_hip_student import (
    IMAGE_HEIGHT,
    IMAGE_WIDTH,
    PROFILE_FIELDS,
    PCA_COMPONENTS,
    DecoderArrays,
    WaistHipDecoder,
    WaistHipEnsembleExportModel,
    WaistHipStudent,
    WaistHipStudentLarge,
    latent_schema,
    output_schema,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--large-checkpoint", required=True, type=Path)
    parser.add_argument("--compact-checkpoint", required=True, type=Path)
    parser.add_argument("--validation-result", required=True, type=Path)
    parser.add_argument("--validation-overlay", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--model-version", required=True)
    parser.add_argument("--compact-weight", type=float, default=0.5)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_json(path: Path, payload: object) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    temporary.replace(path)


def checkpoint_contract(checkpoint: dict[str, object]) -> None:
    if (
        checkpoint.get("model") != "WaistHipStudent-v2"
        or checkpoint.get("latentSchema") != latent_schema()
        or checkpoint.get("outputSchema") != output_schema()
        or checkpoint.get("imageSize") != [IMAGE_WIDTH, IMAGE_HEIGHT]
        or checkpoint.get("profileFields") != list(PROFILE_FIELDS)
        or checkpoint.get("teacherInputsReadOnly") is not True
        or checkpoint.get("previousWeightsUsed") is not False
        or checkpoint.get("sealed448SubjectsUsedForTraining") != 0
    ):
        raise RuntimeError("A fresh ensemble checkpoint failed its provenance contract")


def main() -> int:
    args = parse_args()
    if not 0.0 <= args.compact_weight <= 1.0:
        raise ValueError("--compact-weight must be between zero and one")
    large_path = args.large_checkpoint.resolve()
    compact_path = args.compact_checkpoint.resolve()
    result_path = args.validation_result.resolve()
    output_dir = args.output_dir.resolve()
    large_checkpoint = torch.load(large_path, map_location="cpu", weights_only=False)
    compact_checkpoint = torch.load(compact_path, map_location="cpu", weights_only=False)
    checkpoint_contract(large_checkpoint)
    checkpoint_contract(compact_checkpoint)
    for key in ("latentMeans", "latentStandardDeviations", "pcaMeans", "pcaBases"):
        if not np.allclose(np.asarray(large_checkpoint[key]), np.asarray(compact_checkpoint[key])):
            raise RuntimeError(f"Fresh ensemble decoder mismatch: {key}")
    result = json.loads(result_path.read_text())
    if (
        result.get("state") != "completed"
        or result.get("model") != "WaistHipStudentEnsemble-v2"
        or result.get("selection", {}).get("compactWeight") != args.compact_weight
        or result.get("teacherInputsReadOnly") is not True
        or result.get("previousWeightsUsed") is not False
        or result.get("sealed448SubjectsUsedForTraining") != 0
    ):
        raise RuntimeError("The ensemble validation result failed its provenance contract")

    arrays = DecoderArrays(
        latent_means=np.asarray(compact_checkpoint["latentMeans"], dtype=np.float32),
        latent_stds=np.asarray(compact_checkpoint["latentStandardDeviations"], dtype=np.float32),
        pca_means=np.asarray(compact_checkpoint["pcaMeans"], dtype=np.float32),
        pca_bases=np.asarray(compact_checkpoint["pcaBases"], dtype=np.float32),
    )
    large = WaistHipStudentLarge().cpu().eval()
    compact = WaistHipStudent().cpu().eval()
    large.load_state_dict(large_checkpoint["modelStateDict"])
    compact.load_state_dict(compact_checkpoint["modelStateDict"])
    model = WaistHipEnsembleExportModel(
        large, compact, WaistHipDecoder(arrays), compact_weight=args.compact_weight
    ).cpu().eval()
    output_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = output_dir / "model.onnx"
    temporary_onnx = output_dir / "model.onnx.tmp"
    example_silhouette = torch.zeros(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH, dtype=torch.float32)
    example_silhouette[:, :, 6:122, 19:77] = 1.0
    example_profile = torch.tensor([[0.15, -0.1, -0.2, 1.0, 0.0]], dtype=torch.float32)
    with torch.inference_mode():
        reference = model(example_silhouette, example_profile).flatten().tolist()
    torch.onnx.export(
        model,
        (example_silhouette, example_profile),
        temporary_onnx,
        input_names=["silhouette", "profile"],
        output_names=["targets"],
        dynamic_axes={"silhouette": {0: "batch"}, "profile": {0: "batch"}, "targets": {0: "batch"}},
        opset_version=17,
        external_data=False,
        dynamo=False,
    )
    onnx.checker.check_model(onnx.load(str(temporary_onnx)))
    temporary_onnx.replace(onnx_path)
    runtime = {
        "schemaVersion": "wear3d-waist-hips-v2-onnx-runtime/v1",
        "modelVersion": args.model_version,
        "model": "WaistHipStudentEnsemble-v2",
        "modelSha256": sha256(onnx_path),
        "candidateCheckpointSha256s": {"large": sha256(large_path), "compact": sha256(compact_path)},
        "candidateBestEpochs": {"large": large_checkpoint["epoch"], "compact": compact_checkpoint["epoch"]},
        "bestEpoch": {"large": large_checkpoint["epoch"], "compact": compact_checkpoint["epoch"]},
        "bestValidationLoss": None,
        "ensembleCompactWeight": args.compact_weight,
        "teacherJobIds": [large_checkpoint["teacherJobId"], compact_checkpoint["teacherJobId"]],
        "trainingIndexSha256": compact_checkpoint["trainingIndexSha256"],
        "imageSize": [IMAGE_WIDTH, IMAGE_HEIGHT],
        "sourceTrainingMaskSize": [192, 256],
        "profileFields": list(PROFILE_FIELDS),
        "targetSchema": output_schema(),
        "targetCount": len(output_schema()),
        "outputsPhysicalValues": True,
        "teacherInputsReadOnly": True,
        "previousWeightsUsed": False,
        "sealed448SubjectsUsedForTraining": 0,
        "benchmark448NoLongerSealedForDevelopment": True,
        "rowsTrained": ["waist", "hips"],
        "qualityGates": result["qualityGates"],
        "validationMetrics": result["metrics"],
        "syntheticWearValidationCompleted": True,
        "realPhotoValidated": False,
        "sdkReady": False,
        "inputContract": {
            "silhouette": "one cleaned front body silhouette, float32 [batch,1,128,96] in [0,1]",
            "profile": "normalized height, weight, BMI, female flag, male flag",
            "normalPhotoPreprocessing": "segmentation plus camera normalization is required before inference",
        },
        "shapeContract": {
            "representation": f"{PCA_COMPONENTS}-component accepted-WEAR PCA ring per row",
            "decodedPoints": 32,
            "physicalScale": "decoded normalized ring multiplied by predicted A-B width and C-D depth",
            "tape": "independent recorded WEAR tape target; not fabricated by walking the displayed ring",
        },
        "importantLimit": (
            "Private waist/hip-only research ensemble. The 448 cohort is now a repeat benchmark and normal-photo "
            "acceptance has not passed; do not release this as an SDK model."
        ),
    }
    write_json(output_dir / "runtime.json", runtime)
    write_json(output_dir / "validation-result.json", result)
    write_json(
        output_dir / "onnx-parity-reference.json",
        {
            "schemaVersion": "wear3d-waist-hips-v2-onnx-parity/v1",
            "silhouetteShape": [1, 1, IMAGE_HEIGHT, IMAGE_WIDTH],
            "silhouetteForegroundBox": [19, 6, 76, 121],
            "profile": example_profile.flatten().tolist(),
            "targets": reference,
            "absoluteTolerance": 1e-4,
        },
    )
    shutil.copy2(args.validation_overlay.resolve(), output_dir / "validation-overlay.jpg")
    write_json(
        output_dir / "install-manifest.json",
        {
            "schemaVersion": "wear3d-waist-hips-v2-private-install/v1",
            "modelVersion": args.model_version,
            "files": {
                file.name: {"bytes": file.stat().st_size, "sha256": sha256(file)}
                for file in sorted(output_dir.iterdir())
                if file.is_file() and file.name != "install-manifest.json"
            },
            "privateTestLabOnly": True,
            "sdkReady": False,
        },
    )
    print(json.dumps({
        "ok": True,
        "modelVersion": args.model_version,
        "onnx": str(onnx_path),
        "onnxBytes": onnx_path.stat().st_size,
        "onnxSha256": sha256(onnx_path),
        "targets": len(output_schema()),
        "validationReadyFor448Benchmark": result["qualityGates"]["validationReadyFor448Benchmark"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
