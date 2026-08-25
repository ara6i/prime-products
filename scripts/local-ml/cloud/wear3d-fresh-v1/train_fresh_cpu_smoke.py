#!/usr/bin/env python3
"""Run a tiny, isolated CPU training proof against the fresh WEAR teachers.

The completed teacher directory is treated as immutable input. This script:

* reads only the fresh train/validation manifests;
* copies a deterministic, subject-disjoint mask sample from S3;
* trains a newly initialized masked multi-head CNN on CPU;
* reloads its checkpoint and runs validation inference;
* hashes every teacher input before and after the run.

It intentionally never reads the sealed 448-person test split and never accepts
an existing checkpoint. The proof is a wiring/learning smoke test, not an
accuracy claim for normal RGB photographs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import random
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from teacher_contract import (
    FRONT_RATIO_DEFINITIONS,
    ROW_NAMES,
    TAPE_RATIO_DEFINITIONS,
    extract_targets,
)


SCAN_ID_PATTERN = re.compile(rb'"scan_id"\s*:\s*"([^"]+)"')
CANONICAL_VIEW_PATTERN = re.compile(rb'"view_id"\s*:\s*"canonical"')
TARGET_EPSILON = 1e-4


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--teacher-root", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--train-subjects", type=int, default=24)
    parser.add_argument("--validation-subjects", type=int, default=8)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=24)
    parser.add_argument("--seed", type=int, default=20260824)
    parser.add_argument("--download-workers", type=int, default=12)
    parser.add_argument("--image-width", type=int, default=48)
    parser.add_argument("--image-height", type=int, default=64)
    parser.add_argument("--torch-threads", type=int, default=8)
    return parser.parse_args()


def target_schema() -> list[str]:
    keys: list[str] = []
    for row in ROW_NAMES:
        keys.extend(
            f"row.{row}.{field}"
            for field in (
                "y_norm",
                "left_x_norm",
                "right_x_norm",
                "width_cm",
                "depth_cm",
                "depth_width_ratio",
            )
        )
        for point in range(32):
            keys.append(f"row.{row}.shape.{point:02d}.x")
            keys.append(f"row.{row}.shape.{point:02d}.depth")
    keys.extend(f"tape.{row}.circumference_cm" for row in ROW_NAMES)
    keys.extend(FRONT_RATIO_DEFINITIONS)
    keys.extend(TAPE_RATIO_DEFINITIONS)
    keys.extend(
        (
            "camera.correction_yaw_deg",
            "camera.correction_pitch_deg",
            "camera.correction_roll_deg",
            "camera.correction_target_height_ratio",
            "camera.input_lens_ratio_to_50mm",
            "camera.input_distance_scale",
        )
    )
    if len(keys) != len(set(keys)):
        raise RuntimeError("Fresh target schema contains duplicate keys")
    return keys


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def integrity_snapshot(paths: Iterable[Path]) -> dict[str, dict[str, Any]]:
    snapshot: dict[str, dict[str, Any]] = {}
    for path in sorted(paths):
        stat = path.stat()
        snapshot[str(path.resolve())] = {
            "bytes": stat.st_size,
            "mtime_ns": stat.st_mtime_ns,
            "sha256": sha256_file(path),
        }
    return snapshot


def atomic_json(path: Path, payload: Any) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    temporary.replace(path)


def assert_isolated(teacher_root: Path, output_dir: Path) -> None:
    teacher = teacher_root.resolve()
    output = output_dir.resolve()
    if teacher == output or teacher in output.parents or output in teacher.parents:
        raise RuntimeError(
            "Output must be a separate sibling tree, never inside the teacher input"
        )


def deterministic_score(seed: int, role: str, scan_id: str) -> str:
    return hashlib.sha256(f"{seed}:{role}:{scan_id}".encode()).hexdigest()


@dataclass(frozen=True)
class Subject:
    scan_id: str
    role: str
    gender: str


def discover_subjects(manifests: list[Path]) -> list[Subject]:
    subjects: dict[str, Subject] = {}
    for manifest in manifests:
        with manifest.open("rb") as handle:
            for line in handle:
                if CANONICAL_VIEW_PATTERN.search(line) is None:
                    continue
                record = json.loads(line)
                role = str(record.get("role") or "")
                if role not in {"train", "validation"}:
                    raise RuntimeError(f"Forbidden role in fresh manifest: {role!r}")
                scan_id = str(record["scan_id"])
                subject = Subject(
                    scan_id=scan_id,
                    role=role,
                    gender=str(record.get("gender") or "unknown").lower(),
                )
                previous = subjects.setdefault(scan_id, subject)
                if previous != subject:
                    raise RuntimeError(f"Inconsistent subject metadata for {scan_id}")
    return list(subjects.values())


def balanced_select(
    subjects: list[Subject], role: str, count: int, seed: int
) -> list[Subject]:
    eligible = [subject for subject in subjects if subject.role == role]
    females = [subject for subject in eligible if subject.gender == "female"]
    others = [subject for subject in eligible if subject.gender != "female"]
    for group in (females, others):
        group.sort(key=lambda item: deterministic_score(seed, role, item.scan_id))
    female_count = min(len(females), math.ceil(count / 2))
    other_count = min(len(others), count - female_count)
    chosen = females[:female_count] + others[:other_count]
    if len(chosen) < count:
        already = {item.scan_id for item in chosen}
        remainder = [item for item in eligible if item.scan_id not in already]
        remainder.sort(key=lambda item: deterministic_score(seed, role, item.scan_id))
        chosen.extend(remainder[: count - len(chosen)])
    if len(chosen) != count:
        raise RuntimeError(f"Could select only {len(chosen)}/{count} {role} subjects")
    return sorted(chosen, key=lambda item: item.scan_id)


def compact_record(record: dict[str, Any], schema_set: set[str]) -> dict[str, Any]:
    targets = extract_targets(record)
    unknown = sorted(set(targets) - schema_set)
    if unknown:
        raise RuntimeError(f"Teacher emitted unknown target keys: {unknown[:5]}")
    return {
        "sample_id": record["sample_id"],
        "scan_id": record["scan_id"],
        "role": record["role"],
        "view_id": record["view_id"],
        "s3_mask": record["s3_mask"],
        "height_cm": record.get("height_cm"),
        "weight_kg": record.get("weight_kg"),
        "bmi": record.get("bmi"),
        "gender": record.get("gender"),
        "targets": targets,
    }


def collect_selected_records(
    manifests: list[Path], selected_ids: set[str], schema: list[str]
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    schema_set = set(schema)
    for manifest in manifests:
        with manifest.open("rb") as handle:
            for line in handle:
                match = SCAN_ID_PATTERN.search(line)
                if match is None or match.group(1).decode() not in selected_ids:
                    continue
                record = json.loads(line)
                if record.get("role") not in {"train", "validation"}:
                    raise RuntimeError("The sealed test role must never enter CPU smoke")
                records.append(compact_record(record, schema_set))
    records.sort(key=lambda item: (item["role"], item["scan_id"], item["view_id"]))
    return records


def copy_mask(record: dict[str, Any], masks_dir: Path) -> tuple[str, Path]:
    destination = masks_dir / f"{record['sample_id']}.png"
    if destination.exists() and destination.stat().st_size > 0:
        return record["sample_id"], destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "aws",
            "s3",
            "cp",
            record["s3_mask"],
            str(destination),
            "--only-show-errors",
        ],
        check=True,
        stdout=subprocess.DEVNULL,
    )
    return record["sample_id"], destination


def materialize_masks(
    records: list[dict[str, Any]], masks_dir: Path, workers: int
) -> None:
    with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        futures = [executor.submit(copy_mask, record, masks_dir) for record in records]
        for future in as_completed(futures):
            sample_id, path = future.result()
            if path.stat().st_size <= 0:
                raise RuntimeError(f"Empty downloaded mask for {sample_id}")


def profile_vector(record: dict[str, Any]) -> list[float]:
    height = float(record.get("height_cm") or 170.0)
    weight = float(record.get("weight_kg") or 70.0)
    bmi = float(record.get("bmi") or (weight / ((height / 100.0) ** 2)))
    gender = str(record.get("gender") or "unknown").lower()
    return [
        (height - 170.0) / 20.0,
        (weight - 70.0) / 25.0,
        (bmi - 24.0) / 8.0,
        1.0 if gender == "female" else 0.0,
        1.0 if gender == "male" else 0.0,
    ]


def silhouette_channel(opened):
    """Prefer meaningful transparency, otherwise use the rendered RGB mask."""
    if "A" in opened.getbands():
        alpha = opened.getchannel("A")
        minimum, maximum = alpha.getextrema()
        if minimum != maximum:
            return alpha
    return opened.convert("L")


def main() -> int:
    args = parse_args()
    teacher_root = args.teacher_root.resolve()
    output_dir = args.output_dir.resolve()
    assert_isolated(teacher_root, output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        import numpy as np
        import torch
        from PIL import Image, ImageDraw
        from torch import nn
        from torch.utils.data import DataLoader, Dataset
    except ImportError as error:
        raise RuntimeError(
            "Run this script inside the isolated smoke venv with torch, numpy, and Pillow"
        ) from error

    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.set_num_threads(max(1, min(args.torch_threads, os.cpu_count() or 1)))

    manifests = sorted(teacher_root.glob("cpu-32-*/render-manifest.jsonl"))
    critical_files = manifests + [
        teacher_root / "combined-geometry-audit.json",
        teacher_root / "final-result.json",
    ]
    missing = [str(path) for path in critical_files if not path.is_file()]
    if missing:
        raise RuntimeError(f"Missing fresh teacher inputs: {missing}")

    before = integrity_snapshot(critical_files)
    atomic_json(output_dir / "teacher-integrity-before.json", before)

    final_result = json.loads((teacher_root / "final-result.json").read_text())
    if final_result.get("state") != "passed":
        raise RuntimeError("Fresh teacher audit is not in passed state")
    if final_result.get("sealedTestSubjectsUsed") != 0:
        raise RuntimeError("Teacher provenance says the sealed test was used")

    schema = target_schema()
    subjects = discover_subjects(manifests)
    train_subjects = balanced_select(subjects, "train", args.train_subjects, args.seed)
    validation_subjects = balanced_select(
        subjects, "validation", args.validation_subjects, args.seed
    )
    train_ids = {item.scan_id for item in train_subjects}
    validation_ids = {item.scan_id for item in validation_subjects}
    if train_ids & validation_ids:
        raise RuntimeError("Subject leakage between train and validation")
    selected_ids = train_ids | validation_ids
    records = collect_selected_records(manifests, selected_ids, schema)
    if {record["scan_id"] for record in records} != selected_ids:
        raise RuntimeError("Not every selected subject had render records")
    if any(record["role"] not in {"train", "validation"} for record in records):
        raise RuntimeError("Forbidden record role selected")
    for record in records:
        expected = "train" if record["scan_id"] in train_ids else "validation"
        if record["role"] != expected:
            raise RuntimeError(f"Split mismatch for {record['scan_id']}")

    index_path = output_dir / "sample-index.jsonl"
    with index_path.open("w") as handle:
        for record in records:
            handle.write(json.dumps(record, sort_keys=True) + "\n")

    masks_dir = output_dir / "masks"
    materialize_masks(records, masks_dir, args.download_workers)

    target_index = {key: position for position, key in enumerate(schema)}
    train_records = [record for record in records if record["role"] == "train"]
    validation_records = [
        record for record in records if record["role"] == "validation"
    ]

    target_count = len(schema)
    sums = np.zeros(target_count, dtype=np.float64)
    squared_sums = np.zeros(target_count, dtype=np.float64)
    counts = np.zeros(target_count, dtype=np.float64)
    for record in train_records:
        for key, value in record["targets"].items():
            index = target_index[key]
            number = float(value)
            sums[index] += number
            squared_sums[index] += number * number
            counts[index] += 1.0
    means = np.divide(sums, counts, out=np.zeros_like(sums), where=counts > 0)
    variance = np.divide(
        squared_sums,
        counts,
        out=np.ones_like(squared_sums),
        where=counts > 0,
    ) - means * means
    standard_deviations = np.sqrt(np.maximum(variance, TARGET_EPSILON**2))

    class SmokeDataset(Dataset):
        def __init__(self, source_records: list[dict[str, Any]]) -> None:
            self.records = source_records

        def __len__(self) -> int:
            return len(self.records)

        def __getitem__(self, index: int):
            record = self.records[index]
            image_path = masks_dir / f"{record['sample_id']}.png"
            resampling = getattr(Image, "Resampling", Image).BILINEAR
            with Image.open(image_path) as opened:
                image = silhouette_channel(opened)
                image = image.resize(
                    (args.image_width, args.image_height), resampling
                )
            image_array = np.asarray(image, dtype=np.float32) / 255.0
            image_tensor = torch.from_numpy(image_array).unsqueeze(0)
            profile_tensor = torch.tensor(profile_vector(record), dtype=torch.float32)
            target = np.zeros(target_count, dtype=np.float32)
            mask = np.zeros(target_count, dtype=np.float32)
            for key, value in record["targets"].items():
                target_position = target_index[key]
                if counts[target_position] <= 0:
                    continue
                target[target_position] = (
                    float(value) - means[target_position]
                ) / standard_deviations[target_position]
                mask[target_position] = 1.0
            return (
                image_tensor,
                profile_tensor,
                torch.from_numpy(target),
                torch.from_numpy(mask),
                index,
            )

    class FreshSmokeCNN(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.image_encoder = nn.Sequential(
                nn.Conv2d(1, 8, kernel_size=5, stride=2, padding=2),
                nn.ReLU(),
                nn.Conv2d(8, 16, kernel_size=3, stride=2, padding=1),
                nn.ReLU(),
                nn.Conv2d(16, 24, kernel_size=3, stride=2, padding=1),
                nn.ReLU(),
                nn.AdaptiveAvgPool2d((4, 3)),
                nn.Flatten(),
            )
            self.head = nn.Sequential(
                nn.Linear(24 * 4 * 3 + 5, 160),
                nn.ReLU(),
                nn.Linear(160, target_count),
            )

        def forward(self, image, profile):
            encoded = self.image_encoder(image)
            return self.head(torch.cat((encoded, profile), dim=1))

    train_dataset = SmokeDataset(train_records)
    validation_dataset = SmokeDataset(validation_records)
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        generator=torch.Generator().manual_seed(args.seed),
    )
    train_evaluation_loader = DataLoader(
        train_dataset, batch_size=args.batch_size, shuffle=False
    )
    validation_loader = DataLoader(
        validation_dataset, batch_size=args.batch_size, shuffle=False
    )

    within_image_standard_deviations: list[float] = []
    image_means: list[float] = []
    for images, _profiles, _targets, _masks, _indices in train_evaluation_loader:
        flattened = images.flatten(1)
        within_image_standard_deviations.extend(
            flattened.std(dim=1).detach().cpu().tolist()
        )
        image_means.extend(flattened.mean(dim=1).detach().cpu().tolist())
    mean_within_image_std = float(np.mean(within_image_standard_deviations))
    image_mean_range = float(max(image_means) - min(image_means))
    if mean_within_image_std <= 0.05:
        raise RuntimeError(
            "Silhouette loader produced blank or near-constant images; refusing smoke proof"
        )

    model = FreshSmokeCNN().cpu()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.003, weight_decay=1e-5)

    def evaluate(loader: DataLoader):
        model.eval()
        squared_error = 0.0
        absolute_error = 0.0
        labels = 0.0
        predictions: list[tuple[int, Any]] = []
        with torch.no_grad():
            for images, profiles, targets, masks, indices in loader:
                outputs = model(images, profiles)
                difference = (outputs - targets) * masks
                squared_error += float((difference * difference).sum())
                absolute_error += float(difference.abs().sum())
                labels += float(masks.sum())
                for item_index, output in zip(indices.tolist(), outputs):
                    predictions.append((item_index, output.detach().cpu().numpy()))
        return {
            "masked_mse": squared_error / max(labels, 1.0),
            "masked_mae_z": absolute_error / max(labels, 1.0),
            "labeled_values": int(labels),
            "predictions": predictions,
        }

    initial_train = evaluate(train_evaluation_loader)
    history: list[dict[str, float]] = []
    for epoch in range(1, args.epochs + 1):
        model.train()
        epoch_error = 0.0
        epoch_labels = 0.0
        for images, profiles, targets, masks, _indices in train_loader:
            optimizer.zero_grad(set_to_none=True)
            outputs = model(images, profiles)
            difference = (outputs - targets) * masks
            loss = (difference * difference).sum() / masks.sum().clamp_min(1.0)
            if not torch.isfinite(loss):
                raise RuntimeError("Non-finite training loss")
            loss.backward()
            optimizer.step()
            epoch_error += float((difference.detach() ** 2).sum())
            epoch_labels += float(masks.sum())
        epoch_mse = epoch_error / max(epoch_labels, 1.0)
        history.append({"epoch": epoch, "masked_mse": epoch_mse})
        if epoch == 1 or epoch == args.epochs or epoch % 5 == 0:
            print(f"epoch={epoch:03d} train_masked_mse={epoch_mse:.6f}", flush=True)

    final_train = evaluate(train_evaluation_loader)
    validation = evaluate(validation_loader)
    baseline_validation_error = 0.0
    baseline_validation_labels = 0.0
    for _images, _profiles, targets, masks, _indices in validation_loader:
        baseline_validation_error += float(((targets * masks) ** 2).sum())
        baseline_validation_labels += float(masks.sum())
    baseline_validation_mse = baseline_validation_error / max(
        baseline_validation_labels, 1.0
    )

    checkpoint_path = output_dir / "fresh-cpu-smoke-checkpoint.pt"
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "target_schema": schema,
            "target_means": means.tolist(),
            "target_standard_deviations": standard_deviations.tolist(),
            "target_training_counts": counts.astype(int).tolist(),
            "model": "FreshSmokeCNN-v1",
            "fresh_initialization": True,
            "previous_weights_used": False,
            "v9_artifact_used": False,
            "sealed_test_subjects_used": 0,
            "image_size": [args.image_width, args.image_height],
            "profile_fields": ["height_cm", "weight_kg", "bmi", "gender_female", "gender_male"],
        },
        checkpoint_path,
    )
    reloaded = FreshSmokeCNN().cpu()
    payload = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    reloaded.load_state_dict(payload["model_state_dict"])
    reloaded.eval()
    model.eval()
    first_batch = next(iter(validation_loader))
    with torch.no_grad():
        original_output = model(first_batch[0], first_batch[1])
        reloaded_output = reloaded(first_batch[0], first_batch[1])
    reload_max_difference = float((original_output - reloaded_output).abs().max())

    validation_predictions = dict(validation["predictions"])
    overlay_records = [
        (index, record)
        for index, record in enumerate(validation_records)
        if record["view_id"] == "canonical"
    ][:8]
    card_width = 384
    card_height = 548
    columns = 4
    rows = max(1, math.ceil(len(overlay_records) / columns))
    sheet = Image.new("RGB", (columns * card_width, rows * card_height + 48), "#111827")
    sheet_draw = ImageDraw.Draw(sheet)
    sheet_draw.text(
        (12, 14),
        "CPU smoke validation: teacher orange | prediction cyan",
        fill="#f9fafb",
    )
    row_colors = {"chest": "#f59e0b", "waist": "#fb923c", "hips": "#fbbf24"}
    for card_number, (record_index, record) in enumerate(overlay_records):
        with Image.open(masks_dir / f"{record['sample_id']}.png") as opened:
            silhouette = silhouette_channel(opened)
            source = Image.new("RGB", opened.size, "#111827")
            body = Image.new("RGB", opened.size, "#e5e7eb")
            source.paste(body, mask=silhouette)
        source = source.resize((card_width, 512), getattr(Image, "Resampling", Image).BILINEAR)
        draw = ImageDraw.Draw(source)
        standardized_prediction = validation_predictions[record_index]
        prediction = standardized_prediction * standard_deviations + means
        for row_name, teacher_color in row_colors.items():
            fields = (
                f"row.{row_name}.y_norm",
                f"row.{row_name}.left_x_norm",
                f"row.{row_name}.right_x_norm",
            )
            if all(field in record["targets"] for field in fields):
                teacher_values = [float(record["targets"][field]) for field in fields]
                predicted_values = [float(prediction[target_index[field]]) for field in fields]
                ty, tl, tr = teacher_values
                py, pl, pr = predicted_values
                draw.line(
                    (
                        max(0.0, min(1.0, tl)) * card_width,
                        max(0.0, min(1.0, ty)) * 512,
                        max(0.0, min(1.0, tr)) * card_width,
                        max(0.0, min(1.0, ty)) * 512,
                    ),
                    fill=teacher_color,
                    width=5,
                )
                draw.line(
                    (
                        max(0.0, min(1.0, pl)) * card_width,
                        max(0.0, min(1.0, py)) * 512,
                        max(0.0, min(1.0, pr)) * card_width,
                        max(0.0, min(1.0, py)) * 512,
                    ),
                    fill="#22d3ee",
                    width=2,
                )
        draw.rectangle((0, 0, card_width, 24), fill="#111827")
        draw.text((8, 6), record["scan_id"], fill="#ffffff")
        x = (card_number % columns) * card_width
        y = 48 + (card_number // columns) * card_height
        sheet.paste(source, (x, y))
    overlay_path = output_dir / "validation-overlay.jpg"
    sheet.save(overlay_path, quality=92)

    after = integrity_snapshot(critical_files)
    atomic_json(output_dir / "teacher-integrity-after.json", after)
    integrity_preserved = before == after

    train_reduction = 1.0 - (
        final_train["masked_mse"] / max(initial_train["masked_mse"], 1e-12)
    )
    finite_metrics = all(
        math.isfinite(value)
        for value in (
            initial_train["masked_mse"],
            final_train["masked_mse"],
            validation["masked_mse"],
            reload_max_difference,
        )
    )
    passed = bool(
        integrity_preserved
        and finite_metrics
        and train_reduction >= 0.30
        and reload_max_difference <= 1e-7
        and mean_within_image_std > 0.05
        and not (train_ids & validation_ids)
    )

    group_counts: dict[str, int] = {
        "row_non_shape": 0,
        "shape": 0,
        "tape": 0,
        "ratio": 0,
        "camera": 0,
    }
    for key, count in zip(schema, counts.astype(int)):
        if ".shape." in key:
            group_counts["shape"] += int(count)
        elif key.startswith("row."):
            group_counts["row_non_shape"] += int(count)
        elif key.startswith("tape."):
            group_counts["tape"] += int(count)
        elif key.startswith("ratio."):
            group_counts["ratio"] += int(count)
        elif key.startswith("camera."):
            group_counts["camera"] += int(count)

    report = {
        "schemaVersion": 1,
        "state": "passed" if passed else "failed",
        "kind": "fresh-cpu-training-smoke",
        "purpose": "prove isolated data loading, masked multi-head learning, checkpointing, and validation inference",
        "notAnAccuracyClaim": True,
        "teacherRoot": str(teacher_root),
        "teacherIntegrityPreserved": integrity_preserved,
        "teacherInputsOpenedReadOnly": True,
        "outputIsolatedFromTeachers": True,
        "previousWeightsUsed": False,
        "v9ArtifactUsed": False,
        "sealedTestSubjectsUsed": 0,
        "freshInitialization": True,
        "device": "cpu",
        "inputSignal": {
            "meanWithinImageStandardDeviation": mean_within_image_std,
            "imageMeanRange": image_mean_range,
            "blankImageGatePassed": mean_within_image_std > 0.05,
        },
        "subjects": {
            "train": len(train_ids),
            "validation": len(validation_ids),
            "overlap": len(train_ids & validation_ids),
        },
        "records": {
            "train": len(train_records),
            "validation": len(validation_records),
        },
        "targets": {
            "schemaSize": target_count,
            "trainingLabelCountsByGroup": group_counts,
            "targetsWithTrainingLabels": int((counts > 0).sum()),
        },
        "training": {
            "epochs": args.epochs,
            "initialMaskedMse": initial_train["masked_mse"],
            "finalMaskedMse": final_train["masked_mse"],
            "lossReductionFraction": train_reduction,
            "history": history,
        },
        "validation": {
            "maskedMse": validation["masked_mse"],
            "maskedMaeZ": validation["masked_mae_z"],
            "meanBaselineMaskedMse": baseline_validation_mse,
            "inferenceCompleted": finite_metrics,
        },
        "checkpoint": {
            "path": str(checkpoint_path),
            "reloadMaxAbsDifference": reload_max_difference,
        },
        "artifacts": {
            "sampleIndex": str(index_path),
            "validationOverlay": str(overlay_path),
            "integrityBefore": str(output_dir / "teacher-integrity-before.json"),
            "integrityAfter": str(output_dir / "teacher-integrity-after.json"),
        },
        "limitations": [
            "This tiny run uses WEAR synthetic silhouette masks, not normal RGB photos.",
            "It proves trainer wiring and learning only; it does not certify model accuracy.",
            "The 448-person sealed test remains untouched.",
        ],
    }
    report_path = output_dir / "smoke-result.json"
    atomic_json(report_path, report)
    print(json.dumps({
        "state": report["state"],
        "train_loss_reduction": train_reduction,
        "validation_masked_mse": validation["masked_mse"],
        "teacher_integrity_preserved": integrity_preserved,
        "checkpoint_reload_max_abs_difference": reload_max_difference,
        "report": str(report_path),
    }, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
