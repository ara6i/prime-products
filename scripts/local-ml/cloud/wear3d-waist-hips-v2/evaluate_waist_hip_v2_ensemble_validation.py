#!/usr/bin/env python3
"""Select and audit a fresh two-candidate waist/hip ensemble on validation only."""

from __future__ import annotations

import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from PIL import Image

from train_waist_hip_v2 import (
    IMAGE_HEIGHT,
    IMAGE_WIDTH,
    build_targets,
    calculate_metrics,
    meaningful_silhouette,
    render_overlay,
    validation_gates,
)
from waist_hip_student import (
    DecoderArrays,
    WaistHipDecoder,
    WaistHipStudent,
    WaistHipStudentLarge,
    latent_schema,
    output_schema,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", required=True, type=Path)
    parser.add_argument("--masks-dir", required=True, type=Path)
    parser.add_argument("--large-checkpoint", required=True, type=Path)
    parser.add_argument("--compact-checkpoint", required=True, type=Path)
    parser.add_argument("--compact-weight", type=float, default=0.5)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--overlay", required=True, type=Path)
    parser.add_argument("--decode-workers", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--torch-threads", type=int, default=12)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    temporary.replace(path)


def checkpoint_contract(checkpoint: dict[str, object]) -> None:
    if (
        checkpoint.get("model") != "WaistHipStudent-v2"
        or checkpoint.get("latentSchema") != latent_schema()
        or checkpoint.get("outputSchema") != output_schema()
        or checkpoint.get("teacherInputsReadOnly") is not True
        or checkpoint.get("previousWeightsUsed") is not False
        or checkpoint.get("sealed448SubjectsUsedForTraining") != 0
    ):
        raise RuntimeError("A fresh ensemble candidate failed its provenance contract")


def main() -> int:
    args = parse_args()
    if not 0.0 <= args.compact_weight <= 1.0:
        raise ValueError("--compact-weight must be between zero and one")
    torch.set_num_threads(max(1, args.torch_threads))
    large_checkpoint = torch.load(args.large_checkpoint.resolve(), map_location="cpu", weights_only=False)
    compact_checkpoint = torch.load(args.compact_checkpoint.resolve(), map_location="cpu", weights_only=False)
    checkpoint_contract(large_checkpoint)
    checkpoint_contract(compact_checkpoint)
    for key in ("latentMeans", "latentStandardDeviations", "pcaMeans", "pcaBases"):
        if not np.allclose(np.asarray(large_checkpoint[key]), np.asarray(compact_checkpoint[key])):
            raise RuntimeError(f"Fresh ensemble decoder mismatch: {key}")

    large = WaistHipStudentLarge().cpu().eval()
    compact = WaistHipStudent().cpu().eval()
    large.load_state_dict(large_checkpoint["modelStateDict"])
    compact.load_state_dict(compact_checkpoint["modelStateDict"])
    arrays = DecoderArrays(
        latent_means=np.asarray(compact_checkpoint["latentMeans"], dtype=np.float32),
        latent_stds=np.asarray(compact_checkpoint["latentStandardDeviations"], dtype=np.float32),
        pca_means=np.asarray(compact_checkpoint["pcaMeans"], dtype=np.float32),
        pca_bases=np.asarray(compact_checkpoint["pcaBases"], dtype=np.float32),
    )
    decoder = WaistHipDecoder(arrays).cpu().eval()

    packed = np.load(args.index.resolve(), allow_pickle=False)
    validation_original = np.flatnonzero(packed["roles"] == 1)
    if len(validation_original) != 3_843:
        raise RuntimeError(f"Validation record count changed: {len(validation_original)}")
    validation_scan_ids = packed["scan_ids"][validation_original]
    validation_view_ids = packed["view_ids"][validation_original]
    if len(np.unique(validation_scan_ids)) != 427:
        raise RuntimeError("Validation subject count changed")
    _, _, public_targets, public_masks, *_ = build_targets(packed)
    sample_ids = packed["sample_ids"][validation_original]
    profiles = packed["profiles"][validation_original].astype(np.float32, copy=False)
    masks_dir = args.masks_dir.resolve()

    def decode(sample_id: str) -> np.ndarray:
        with Image.open(masks_dir / f"{sample_id}.png") as opened:
            resized = meaningful_silhouette(opened).resize(
                (IMAGE_WIDTH, IMAGE_HEIGHT), getattr(Image, "Resampling", Image).BILINEAR
            )
            return np.asarray(resized, dtype=np.uint8)

    with ThreadPoolExecutor(max_workers=args.decode_workers) as executor:
        images = np.stack(list(executor.map(decode, sample_ids.tolist())))
    image_tensor = torch.from_numpy(images).unsqueeze(1).float().div_(255.0)
    profile_tensor = torch.from_numpy(profiles)
    predictions: list[torch.Tensor] = []
    with torch.inference_mode():
        for start in range(0, len(validation_original), args.batch_size):
            stop = start + args.batch_size
            silhouette_batch = image_tensor[start:stop]
            profile_batch = profile_tensor[start:stop]
            large_latent = large(silhouette_batch, profile_batch)
            compact_latent = compact(silhouette_batch, profile_batch)
            blended = large_latent * (1.0 - args.compact_weight) + compact_latent * args.compact_weight
            predictions.append(decoder(blended))
    prediction = torch.cat(predictions).numpy()
    expected = public_targets[validation_original]
    expected_masks = public_masks[validation_original]
    metrics = calculate_metrics(prediction, expected, expected_masks)
    gates = validation_gates(metrics, True)
    render_overlay(
        args.overlay.resolve(),
        images,
        sample_ids,
        prediction,
        expected,
        expected_masks,
        np.flatnonzero(validation_view_ids == "canonical")[:16].astype(int).tolist(),
    )
    result = {
        "schemaVersion": "wear3d-waist-hips-v2-ensemble-validation/v1",
        "state": "completed",
        "completedAt": now(),
        "model": "WaistHipStudentEnsemble-v2",
        "selection": {
            "compactWeight": args.compact_weight,
            "criterion": "locked 427-subject WEAR validation metrics only",
        },
        "candidates": {
            "large": {"bestEpoch": large_checkpoint["epoch"], "parameterCount": sum(p.numel() for p in large.parameters())},
            "compact": {"bestEpoch": compact_checkpoint["epoch"], "parameterCount": sum(p.numel() for p in compact.parameters())},
        },
        "parameterCount": sum(p.numel() for p in large.parameters()) + sum(p.numel() for p in compact.parameters()),
        "validation": {"records": len(validation_original), "subjects": len(np.unique(validation_scan_ids))},
        "qualityGates": gates,
        "metrics": metrics,
        "teacherInputsReadOnly": True,
        "previousWeightsUsed": False,
        "sealed448SubjectsUsedForTraining": 0,
        "benchmark448NoLongerSealedForDevelopment": True,
        "limitations": [
            "The final 448 report is a repeat benchmark because that cohort was opened before ensemble packaging.",
            "Normal customer photos still require segmentation and camera normalization.",
        ],
    }
    write_json(args.output.resolve(), result)
    print(json.dumps({
        "ok": True,
        "output": str(args.output.resolve()),
        "overlay": str(args.overlay.resolve()),
        "qualityGates": gates,
        "metrics": metrics,
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
