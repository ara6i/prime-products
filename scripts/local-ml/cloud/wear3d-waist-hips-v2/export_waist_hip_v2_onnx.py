#!/usr/bin/env python3
"""Export the constrained waist/hip student as a private ONNX package."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

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
    WaistHipExportModel,
    WaistHipStudent,
    latent_schema,
    output_schema,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--final-result", required=True, type=Path)
    parser.add_argument("--validation-overlay", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--model-version", required=True)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_json(path: Path, payload: Any) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    temporary.replace(path)


def main() -> int:
    args = parse_args()
    checkpoint_path = args.checkpoint.resolve()
    result_path = args.final_result.resolve()
    output_dir = args.output_dir.resolve()
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    result = json.loads(result_path.read_text())
    model_name = checkpoint.get("model")
    if (
        model_name not in {
            "WaistHipStudent-v2",
            "WaistHipStudent",
            "WaistHipStudentV4",
            "WaistHipStudentV5",
            "WaistHipStudentV6",
            "WaistHipStudentV7",
            "WaistHipStudentV71",
            "WaistHipStudentV72",
            "WaistHipStudentV8",
        }
        or checkpoint.get("latentSchema") != latent_schema()
        or checkpoint.get("outputSchema") != output_schema()
        or checkpoint.get("imageSize") != [IMAGE_WIDTH, IMAGE_HEIGHT]
        or checkpoint.get("profileFields") != list(PROFILE_FIELDS)
        or checkpoint.get("teacherInputsReadOnly") is not True
        or checkpoint.get("previousWeightsUsed") is not False
        or checkpoint.get("sealed448SubjectsUsedForTraining") != 0
        or result.get("state") != "completed"
    ):
        raise RuntimeError("The waist/hip checkpoint failed its provenance contract")
    arrays = DecoderArrays(
        latent_means=np.asarray(checkpoint["latentMeans"], dtype=np.float32),
        latent_stds=np.asarray(checkpoint["latentStandardDeviations"], dtype=np.float32),
        pca_means=np.asarray(checkpoint["pcaMeans"], dtype=np.float32),
        pca_bases=np.asarray(checkpoint["pcaBases"], dtype=np.float32),
    )
    student = WaistHipStudent().cpu().eval()
    student.load_state_dict(checkpoint["modelStateDict"])
    model = WaistHipExportModel(student, WaistHipDecoder(arrays)).cpu().eval()
    output_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = output_dir / "model.onnx"
    temporary_onnx = output_dir / "model.onnx.tmp"
    example_silhouette = torch.zeros(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH, dtype=torch.float32)
    example_silhouette[:, :, 6:122, 19:77] = 1.0
    example_profile = torch.tensor([[0.15, -0.1, -0.2, 1.0, 0.0]], dtype=torch.float32)
    with torch.no_grad():
        reference = model(example_silhouette, example_profile).flatten().tolist()
    torch.onnx.export(
        model,
        (example_silhouette, example_profile),
        temporary_onnx,
        input_names=["silhouette", "profile"],
        output_names=["targets"],
        dynamic_axes={
            "silhouette": {0: "batch"},
            "profile": {0: "batch"},
            "targets": {0: "batch"},
        },
        opset_version=17,
        external_data=False,
        dynamo=False,
    )
    onnx.checker.check_model(onnx.load(str(temporary_onnx)))
    temporary_onnx.replace(onnx_path)
    runtime = {
        "schemaVersion": "wear3d-waist-hips-v2-onnx-runtime/v1",
        "modelVersion": args.model_version,
        "model": model_name,
        "modelSha256": sha256(onnx_path),
        "checkpointSha256": sha256(checkpoint_path),
        "teacherJobId": checkpoint["teacherJobId"],
        "trainingIndexSha256": checkpoint["trainingIndexSha256"],
        "bestEpoch": checkpoint["epoch"],
        "bestValidationLoss": checkpoint["validationLoss"],
        "imageSize": [IMAGE_WIDTH, IMAGE_HEIGHT],
        "sourceTrainingMaskSize": [192, 256],
        "profileFields": list(PROFILE_FIELDS),
        "targetSchema": output_schema(),
        "targetCount": len(output_schema()),
        "outputsPhysicalValues": True,
        "teacherInputsReadOnly": True,
        "previousWeightsUsed": False,
        "sealed448SubjectsUsedForTraining": 0,
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
            "Private waist/hip-only research model. The 448 benchmark and paired normal-photo acceptance "
            "must pass before any release or SDK use."
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
    if args.validation_overlay and args.validation_overlay.is_file():
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
