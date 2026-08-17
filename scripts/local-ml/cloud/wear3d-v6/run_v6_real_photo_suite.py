#!/usr/bin/env python3
"""Run the answer-free WEAR v6 Shane/Shahnaz/Negar acceptance suite.

The script calls the same local Test Lab APIs as the product flow. It sends
only RGB, height, weight, gender, an Apple-derived person box, and then
Apple-corrected widths. Saved tape answers are attached only after both model
passes complete. Visible edge approvals remain false until the generated
contact sheet is reviewed by a human.
"""

from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import hashlib
from io import BytesIO
import json
import math
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageFont, ImageOps


PIPELINE_ID = "wear3d-standing-rgb-v6r5-20260816"
PEOPLE = ("shahnaz-2", "negar-2", "shane-2")
APPLE_ANCHOR_JOINTS = {
    "leftShoulder": "human_left_shoulder_3D",
    "rightShoulder": "human_right_shoulder_3D",
    "leftHip": "human_left_hip_3D",
    "rightHip": "human_right_hip_3D",
}
ROW_COLORS = {
    "neck": "#a855f7",
    "chest": "#2563eb",
    "underbust": "#f59e0b",
    "waist": "#06b6d4",
    "hips": "#22c55e",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:3001")
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path)
    parser.add_argument("--contact-sheet", type=Path)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def read_response(request: Request) -> tuple[bytes, str]:
    try:
        with urlopen(request, timeout=90) as response:
            return response.read(), response.headers.get_content_type()
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code} for {request.full_url}: {detail}") from error


def get_bytes(url: str) -> tuple[bytes, str]:
    return read_response(Request(url, headers={"Cache-Control": "no-store"}))


def get_json(url: str) -> dict[str, Any]:
    body, _ = get_bytes(url)
    value = json.loads(body)
    if not isinstance(value, dict):
        raise RuntimeError(f"Expected an object from {url}")
    return value


def post_json(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    request = Request(
        url,
        data=json.dumps(payload, separators=(",", ":")).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "Cache-Control": "no-store"},
    )
    body, _ = read_response(request)
    value = json.loads(body)
    if not isinstance(value, dict) or value.get("ok") is not True:
        raise RuntimeError(f"API rejected {url}: {value}")
    return value


def finite_positive(value: object) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value)) and float(value) > 0:
        return float(value)
    return None


def data_url(image_bytes: bytes, content_type: str) -> str:
    mime = content_type if content_type in {"image/png", "image/jpeg", "image/webp"} else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(image_bytes).decode()}"


def person_box(apple: dict[str, Any], width: int, height: int) -> tuple[dict[str, float], bool]:
    joints = [joint for joint in apple.get("joints", []) if isinstance(joint, dict)]
    points = [
        (float(joint["xPx"]) / width, float(joint["yPx"]) / height, str(joint.get("name", "")))
        for joint in joints
        if isinstance(joint.get("xPx"), (int, float)) and isinstance(joint.get("yPx"), (int, float))
    ]
    if len(points) < 10:
        raise RuntimeError("Apple returned too few joints to build an answer-free person box")
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    raw_width = max(xs) - min(xs)
    raw_height = max(ys) - min(ys)
    box = {
        "left": max(0.0, min(xs) - raw_width * 0.10),
        "right": min(1.0, max(xs) + raw_width * 0.10),
        "top": max(0.0, min(ys) - raw_height * 0.16),
        "bottom": min(1.0, max(ys) + raw_height * 0.07),
    }
    by_name = {name: (x, y) for x, y, name in points}
    head = by_name.get("human_top_head_3D")
    left_ankle = by_name.get("human_left_ankle_3D")
    right_ankle = by_name.get("human_right_ankle_3D")
    # Judge the source photo, not the padded crop box. A valid full-body photo
    # may legitimately clamp the expanded crop margin at the image boundary.
    # Require the actual head and both ankles to remain visibly inside frame.
    full_body = bool(
        head
        and left_ankle
        and right_ankle
        and 0.005 < head[1] < 0.45
        and 0.55 < left_ankle[1] < 0.995
        and 0.55 < right_ankle[1] < 0.995
        and min(left_ankle[1], right_ankle[1]) - head[1] >= 0.35
    )
    return box, full_body


def pose_anchors(apple: dict[str, Any], width: int, height: int) -> dict[str, dict[str, float]]:
    joints = {
        str(joint.get("name")): joint
        for joint in apple.get("joints", [])
        if isinstance(joint, dict)
    }
    anchors: dict[str, dict[str, float]] = {}
    for anchor_name, joint_name in APPLE_ANCHOR_JOINTS.items():
        joint = joints.get(joint_name)
        if not joint or not isinstance(joint.get("xPx"), (int, float)) or not isinstance(joint.get("yPx"), (int, float)):
            raise RuntimeError(f"Apple did not return required pose anchor {joint_name}")
        anchors[anchor_name] = {
            "x": max(0.0, min(1.0, float(joint["xPx"]) / width)),
            "y": max(0.0, min(1.0, float(joint["yPx"]) / height)),
        }
    return anchors


def measurement_actuals(row: dict[str, Any]) -> dict[str, float]:
    mapping = {
        "chest": row.get("chestCm"),
        "underbust": row.get("underChestCm"),
        "waist": row.get("waistCm"),
        "hips": row.get("hipsCm"),
    }
    return {key: value for key, raw in mapping.items() if (value := finite_positive(raw)) is not None}


def draw_review(image_bytes: bytes, label: str, prediction: dict[str, Any]) -> Image.Image:
    # Match browser naturalWidth/naturalHeight and the server's sharp.rotate()
    # preprocessing. Phone JPEGs such as Shahnaz 2 carry EXIF orientation; a
    # raw PIL size would rotate every overlay and corrupt Apple calibration.
    with Image.open(BytesIO(image_bytes)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
    image.thumbnail((520, 680), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    for row in prediction.get("rows", []):
        if not isinstance(row, dict):
            continue
        name = str(row.get("kind", ""))
        photo = row.get("photo") or {}
        left = photo.get("left") or {}
        right = photo.get("right") or {}
        values = [left.get("x"), left.get("y"), right.get("x"), right.get("y")]
        if not all(isinstance(value, (int, float)) and math.isfinite(float(value)) for value in values):
            continue
        x1 = round(float(left["x"]) * image.width)
        x2 = round(float(right["x"]) * image.width)
        y = round((float(left["y"]) + float(right["y"])) * 0.5 * image.height)
        color = ROW_COLORS.get(name, "#ffffff")
        draw.line((x1, y, x2, y), fill=color, width=max(3, image.width // 130))
        draw.rectangle((x1 - 2, y - 2, x1 + 2, y + 2), fill=color)
        draw.rectangle((x2 - 2, y - 2, x2 + 2, y + 2), fill=color)
        draw.text((max(2, x1), max(2, y - 13)), name, fill=color, font=font, stroke_width=2, stroke_fill="black")
    header_height = 32
    panel = Image.new("RGB", (image.width, image.height + header_height), "#07101f")
    panel.paste(image, (0, header_height))
    ImageDraw.Draw(panel).text((10, 10), f"{label} · WEAR v6 predicted rows", fill="white", font=font)
    return panel


def make_contact_sheet(panels: list[Image.Image], output: Path) -> str:
    width = max(panel.width for panel in panels)
    height = max(panel.height for panel in panels)
    sheet = Image.new("RGB", (width * len(panels), height), "#020617")
    for index, panel in enumerate(panels):
        sheet.paste(panel, (index * width + (width - panel.width) // 2, 0))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=92)
    return sha256_bytes(output.read_bytes())


def main() -> None:
    args = parse_args()
    root = args.project_root.resolve()
    output = (args.output or root / ".local-ml/reports/wear3d-v6-real-photo-pending.json").resolve()
    contact_sheet = (args.contact_sheet or root / ".local-ml/reports/wear3d-v6-real-photo-contact-sheet.jpg").resolve()
    base = args.base_url.rstrip("/") + "/"
    status = get_json(urljoin(base, "api/try-on-test/wear-photo-test/v6"))
    if (
        status.get("ok") is not True
        or status.get("modelVersion") != PIPELINE_ID
        or (
            status.get("syntheticCandidatePassed") is not True
            and status.get("privateDiagnosticOnly") is not True
        )
    ):
        raise RuntimeError(
            "A synthetic-pass or hash-locked private-diagnostic v6 candidate "
            f"must be installed first: {status}"
        )

    candidate = root / ".local-ml/checkpoints" / PIPELINE_ID / "model.onnx"
    model_hash = sha256_bytes(candidate.read_bytes())
    dataset = get_json(urljoin(base, "api/try-on-test/sizing-lab/dataset"))
    by_id = {str(row.get("setId")): row for row in dataset.get("rows", []) if isinstance(row, dict)}
    cases: list[dict[str, Any]] = []
    panels: list[Image.Image] = []

    for person_id in PEOPLE:
        row = by_id.get(person_id)
        if not row:
            raise RuntimeError(f"Dataset is missing {person_id}")
        image_path = str(row.get("alternateFrontImageUrl") or row.get("frontImageUrl") or "")
        image_bytes, content_type = get_bytes(urljoin(base, image_path.lstrip("/")))
        with Image.open(BytesIO(image_bytes)) as source:
            width, height = ImageOps.exif_transpose(source).size
        encoded = data_url(image_bytes, content_type)
        height_cm = finite_positive(row.get("heightCm"))
        weight_kg = finite_positive(row.get("weightKg"))
        gender = row.get("gender")
        if height_cm is None or weight_kg is None or gender not in {"female", "male"}:
            raise RuntimeError(f"{person_id} has an invalid product profile")

        apple_seed = post_json(urljoin(base, "api/try-on-test/sizing-lab/apple-vision-pose3d"), {
            "imageDataUrl": encoded,
            "imageWidth": width,
            "imageHeight": height,
            "heightCm": height_cm,
            "rows": [{"name": "waist", "y": height * 0.5, "leftX": width * 0.4, "rightX": width * 0.6}],
        })["result"]
        crop_box, full_body_visible = person_box(apple_seed, width, height)
        anchors = pose_anchors(apple_seed, width, height)
        model_payload = {
            "imageDataUrl": encoded,
            "heightCm": height_cm,
            "weightKg": weight_kg,
            "gender": gender,
            "personBox": crop_box,
            "poseAnchors": anchors,
            "evaluationMode": "answer-free-real-photo-suite",
        }
        edge_prediction = post_json(urljoin(base, "api/try-on-test/wear-photo-test/v6"), model_payload)
        apple_rows = []
        for predicted_row in edge_prediction.get("rows", []):
            left = predicted_row["photo"]["left"]
            right = predicted_row["photo"]["right"]
            apple_rows.append({
                "name": predicted_row["kind"],
                "y": (float(left["y"]) + float(right["y"])) * 0.5 * height,
                "leftX": float(left["x"]) * width,
                "rightX": float(right["x"]) * width,
            })
        apple = post_json(urljoin(base, "api/try-on-test/sizing-lab/apple-vision-pose3d"), {
            "cacheKey": apple_seed["cacheKey"],
            "imageWidth": width,
            "imageHeight": height,
            "heightCm": height_cm,
            "rows": apple_rows,
        })["result"]
        if apple.get("geometryQuality") == "reject":
            raise RuntimeError(f"{person_id}: Apple rejected camera geometry")
        widths = {
            str(item["name"]): round(float(item["frontPlaneWidthCm"]), 6)
            for item in apple.get("rows", [])
            if finite_positive(item.get("frontPlaneWidthCm")) is not None
        }
        confidence = "high" if apple.get("geometryQuality") == "pass" else "medium"
        prediction = post_json(urljoin(base, "api/try-on-test/wear-photo-test/v6"), {
            **model_payload,
            "rowWidthsCm": widths,
            "rowWidthSources": {name: "apple-vision" for name in widths},
            "rowWidthConfidences": {name: confidence for name in widths},
        })
        predicted = {
            str(item["kind"]): round(float(item["valueCm"]), 4)
            for item in prediction.get("measurements", [])
            if finite_positive(item.get("valueCm")) is not None
        }
        actuals = measurement_actuals(row)
        edges = {str(item.get("kind")): False for item in prediction.get("rows", []) if isinstance(item, dict)}
        cases.append({
            "person_id": person_id,
            "gender": gender,
            "image_sha256": sha256_bytes(image_bytes),
            "full_body_visible": full_body_visible,
            "camera_geometry": apple.get("geometryQuality"),
            "saved_answers_sent_to_model": False,
            "manual_answer_used": False,
            "edge_review": edges,
            "known_tape_cm": actuals,
            "predicted_cm": predicted,
            "evidence": {
                "inference_completed_at": now(),
                "person_box_source": "Apple Vision joints; no silhouette mask",
                "pose_anchor_source": "Apple Vision shoulder/hip joints; no silhouette mask",
                "person_box": crop_box,
                "pose_anchors": anchors,
                "profile": prediction.get("profile"),
                "preprocessing": prediction.get("preprocessing"),
                "calibration": prediction.get("calibration"),
                "measurements": prediction.get("measurements"),
                "rows": prediction.get("rows", []),
                "segments": prediction.get("segments", []),
                "landmarks": prediction.get("landmarks", []),
                "apple": {
                    "model": apple.get("model"),
                    "heightSource": apple.get("heightSource"),
                    "referenceBodyHeightM": apple.get("referenceBodyHeightM"),
                    "inputHeightCm": apple.get("inputHeightCm"),
                    "heightScaleFactor": apple.get("heightScaleFactor"),
                    "bodyDistanceM": apple.get("bodyDistanceM"),
                    "geometryQuality": apple.get("geometryQuality"),
                    "focalMismatchPct": apple.get("focalMismatchPct"),
                    "normalizedRmsePct": apple.get("normalizedRmsePct"),
                    "cacheKey": apple.get("cacheKey"),
                    "rows": apple.get("rows", []),
                },
            },
        })
        panels.append(draw_review(image_bytes, str(row.get("label") or person_id), prediction))

    contact_hash = make_contact_sheet(panels, contact_sheet)
    report = {
        "schema_version": 1,
        "model_version": PIPELINE_ID,
        "model_onnx_sha256": model_hash,
        "generated_at": now(),
        "saved_answers_sent_to_model": False,
        "runtime_mask_used": False,
        "formula_used": False,
        "official_synthetic_candidate_passed": status.get("syntheticCandidatePassed") is True,
        "private_diagnostic_only": status.get("privateDiagnosticOnly") is True,
        "released": False,
        "published": False,
        "deployed": False,
        "sdk_ready": False,
        "visual_review_complete": False,
        "contact_sheet": {"path": str(contact_sheet), "sha256": contact_hash},
        "cases": cases,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "report": str(output),
        "contactSheet": str(contact_sheet),
        "cases": len(cases),
        "visualReviewComplete": False,
        "note": "Review the contact sheet before changing any edge_review value to true.",
    }, indent=2))


if __name__ == "__main__":
    main()
