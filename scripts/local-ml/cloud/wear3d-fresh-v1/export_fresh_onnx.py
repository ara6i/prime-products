#!/usr/bin/env python3
"""Export a completed FreshGeometryStudent checkpoint as a private ONNX package."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

import onnx
import torch
from torch import nn

from fresh_student_contract import IMAGE_HEIGHT, IMAGE_WIDTH, PROFILE_FIELDS, target_schema
from train_fresh_full_cpu import FreshGeometryStudent


SCHEMA_VERSION = "wear3d-fresh-onnx-runtime/v1"
MODEL_VERSION = "wear3d-fresh-v1-full-runpod-h100-20260824"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--final-result", required=True, type=Path)
    parser.add_argument("--validation-overlay", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    return parser.parse_args()


def write_json(path: Path, payload: Any) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(path)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


class RawTargetModel(nn.Module):
    """Embed target de-standardization so JavaScript receives physical values."""

    def __init__(
        self,
        student: FreshGeometryStudent,
        target_means: list[float],
        target_standard_deviations: list[float],
    ) -> None:
        super().__init__()
        self.student = student
        self.register_buffer(
            "target_means",
            torch.tensor(target_means, dtype=torch.float32).view(1, -1),
        )
        self.register_buffer(
            "target_standard_deviations",
            torch.tensor(target_standard_deviations, dtype=torch.float32).view(1, -1),
        )

    def forward(self, silhouette: torch.Tensor, profile: torch.Tensor) -> torch.Tensor:
        standardized = self.student(silhouette, profile)
        return standardized * self.target_standard_deviations + self.target_means


def main() -> int:
    args = parse_args()
    checkpoint_path = args.checkpoint.resolve()
    result_path = args.final_result.resolve()
    output_dir = args.output_dir.resolve()
    if not checkpoint_path.is_file() or not result_path.is_file():
        raise RuntimeError("The completed checkpoint and final result are both required")

    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    result = json.loads(result_path.read_text(encoding="utf-8"))
    schema = target_schema()
    if (
        checkpoint.get("model") != "FreshGeometryStudent-v1"
        or checkpoint.get("targetSchema") != schema
        or checkpoint.get("imageSize") != [IMAGE_WIDTH, IMAGE_HEIGHT]
        or checkpoint.get("profileFields") != list(PROFILE_FIELDS)
        or checkpoint.get("freshInitialization") is not True
        or checkpoint.get("previousWeightsUsed") is not False
        or checkpoint.get("previousPredictionsUsed") is not False
        or checkpoint.get("v9ArtifactUsed") is not False
        or checkpoint.get("sealedTestSubjectsUsed") != 0
    ):
        raise RuntimeError("The checkpoint failed the fresh-model provenance contract")
    if (
        result.get("state") != "completed"
        or result.get("qualityGates", {}).get("eligibleForSealedWear448") is not True
        or result.get("sealedTestSubjectsUsed") != 0
    ):
        raise RuntimeError("The completed validation result failed the export gate")

    target_means = checkpoint.get("targetMeans")
    target_stds = checkpoint.get("targetStandardDeviations")
    if not isinstance(target_means, list) or not isinstance(target_stds, list):
        raise RuntimeError("The checkpoint is missing target normalization")
    if len(target_means) != len(schema) or len(target_stds) != len(schema):
        raise RuntimeError("The checkpoint target normalization length changed")

    student = FreshGeometryStudent(len(schema)).cpu().eval()
    student.load_state_dict(checkpoint["modelStateDict"])
    model = RawTargetModel(student, target_means, target_stds).cpu().eval()

    output_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = output_dir / "model.onnx"
    temporary_onnx_path = output_dir / "model.onnx.tmp"
    example_silhouette = torch.zeros(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH, dtype=torch.float32)
    example_silhouette[:, :, 7:122, 18:78] = 1.0
    example_profile = torch.tensor([[0.15, -0.1, -0.2, 1.0, 0.0]], dtype=torch.float32)
    with torch.no_grad():
        reference = model(example_silhouette, example_profile).flatten().tolist()

    torch.onnx.export(
        model,
        (example_silhouette, example_profile),
        temporary_onnx_path,
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
    onnx.checker.check_model(onnx.load(str(temporary_onnx_path)))
    temporary_onnx_path.replace(onnx_path)

    runtime = {
        "schemaVersion": SCHEMA_VERSION,
        "modelVersion": MODEL_VERSION,
        "model": "FreshGeometryStudent-v1",
        "modelSha256": sha256(onnx_path),
        "checkpointSha256": sha256(checkpoint_path),
        "teacherJobId": checkpoint["teacherJobId"],
        "trainingIndexSha256": checkpoint["trainingIndexSha256"],
        "bestEpoch": checkpoint["epoch"],
        "bestValidationLoss": checkpoint["validationLoss"],
        "imageSize": [IMAGE_WIDTH, IMAGE_HEIGHT],
        "sourceTrainingMaskSize": [192, 256],
        "profileFields": list(PROFILE_FIELDS),
        "targetSchema": schema,
        "targetCount": len(schema),
        "outputsPhysicalValues": True,
        "freshInitialization": True,
        "previousWeightsUsed": False,
        "previousPredictionsUsed": False,
        "v9ArtifactUsed": False,
        "sealedTestSubjectsUsed": 0,
        "train": result["train"],
        "validation": result["validation"],
        "qualityGates": result["qualityGates"],
        "validationMetrics": result["metrics"],
        "syntheticWearValidated": True,
        "realPhotoValidated": False,
        "sdkReady": False,
        "inputContract": {
            "silhouette": "one cleaned front body silhouette, float32 [batch,1,128,96] in [0,1]",
            "profile": "normalized height, weight, BMI, female flag, male flag",
            "normalPhotoPreprocessing": "MediaPipe segmentation, largest connected body, canonical 192x256 framing, then 96x128 resize",
        },
        "importantLimit": (
            "Synthetic WEAR validation passed, but normal-photo accuracy is not proven. "
            "Shahnaz, Shane and uploads are private transfer tests until a paired-photo acceptance set passes."
        ),
    }
    write_json(output_dir / "runtime.json", runtime)
    write_json(output_dir / "validation-result.json", result)
    write_json(
        output_dir / "onnx-parity-reference.json",
        {
            "schemaVersion": "wear3d-fresh-onnx-parity/v1",
            "silhouetteShape": [1, 1, IMAGE_HEIGHT, IMAGE_WIDTH],
            "silhouetteForegroundBox": [18, 7, 77, 121],
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
            "schemaVersion": "wear3d-fresh-private-install/v1",
            "modelVersion": MODEL_VERSION,
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
        "modelVersion": MODEL_VERSION,
        "onnx": str(onnx_path),
        "onnxBytes": onnx_path.stat().st_size,
        "onnxSha256": sha256(onnx_path),
        "targets": len(schema),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
