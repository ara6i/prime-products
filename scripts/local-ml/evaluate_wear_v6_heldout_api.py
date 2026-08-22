#!/usr/bin/env python3
"""Audit the private WEAR held-out API without changing or publishing a model."""

from __future__ import annotations

import argparse
import json
import math
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INDEX = ROOT / ".local-ml/wear-sdk-heldout/index.json"
DEFAULT_OUTPUT = ROOT / ".local-ml/reports/wear-v6r5-heldout-448-audit.json"
PARTS = ("neck", "chest", "underbust", "waist", "hips")
STRICT_CM = 1.27


def percentile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def stats(values: list[float]) -> dict[str, float | int | None]:
    return {
        "count": len(values),
        "mean": round(statistics.fmean(values), 6) if values else None,
        "median": round(statistics.median(values), 6) if values else None,
        "p95": round(percentile(values, 0.95), 6) if values else None,
        "max": round(max(values), 6) if values else None,
    }


def post(base_url: str, scan_id: str) -> dict[str, Any]:
    body = json.dumps({"heldoutScanId": scan_id}).encode()
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/try-on-test/wear-photo-test/v6",
        data=body,
        headers={"content-type": "application/json"},
        method="POST",
    )
    last_error = "unknown error"
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.loads(response.read())
            if not payload.get("ok"):
                raise RuntimeError(payload.get("error") or "API returned ok=false")
            return payload
        except (urllib.error.URLError, TimeoutError, RuntimeError, json.JSONDecodeError) as error:
            last_error = str(error)
            if attempt < 2:
                time.sleep(0.5 * (attempt + 1))
    raise RuntimeError(last_error)


def evaluate(person: dict[str, Any], base_url: str) -> dict[str, Any]:
    payload = post(base_url, person["scanId"])
    measurements = {item["kind"]: item for item in payload.get("measurements", [])}
    display_rows = {item["kind"]: item for item in payload.get("rows", [])}
    raw_rows = {item["kind"]: item for item in payload.get("preprocessing", {}).get("rawCoreRows", [])}
    actuals = payload.get("heldoutEvaluation", {}).get("actuals", {})
    rows: dict[str, Any] = {}
    for part in PARTS:
        exact = person.get("rows", {}).get(part)
        if not exact:
            continue
        raw = raw_rows.get(part) or {}
        displayed = display_rows.get(part) or {}
        measurement = measurements.get(part) or {}
        actual = actuals.get(part)
        predicted = measurement.get("valueCm")
        exact_left = exact.get("leftXNorm")
        exact_right = exact.get("rightXNorm")
        exact_y = exact.get("yNorm")
        raw_left = raw.get("leftXNorm")
        raw_right = raw.get("rightXNorm")
        raw_y = raw.get("yNorm")
        display_left = displayed.get("canonical", {}).get("left", {}).get("x")
        display_right = displayed.get("canonical", {}).get("right", {}).get("x")
        display_y = displayed.get("canonical", {}).get("left", {}).get("y")
        circumference_error = (
            abs(float(predicted) - float(actual))
            if isinstance(predicted, (int, float)) and isinstance(actual, (int, float))
            else None
        )
        rows[part] = {
            "actualTapeCm": actual,
            "predictedCircumferenceCm": predicted,
            "circumferenceAbsoluteErrorCm": circumference_error,
            "strictHalfInchPass": circumference_error is not None and circumference_error <= STRICT_CM,
            "rawOnnxLineErrorPx": {
                "y": abs(raw_y - exact_y) * 256 if isinstance(raw_y, (int, float)) else None,
                "left": abs(raw_left - exact_left) * 192 if isinstance(raw_left, (int, float)) else None,
                "right": abs(raw_right - exact_right) * 192 if isinstance(raw_right, (int, float)) else None,
            },
            "displayLineMatchesExactMesh": all(
                isinstance(value, (int, float)) and abs(value - target) < 1e-6
                for value, target in (
                    (display_left, exact_left),
                    (display_right, exact_right),
                    (display_y, exact_y),
                )
            ),
        }
    return {"scanId": person["scanId"], "rows": rows}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:3001")
    parser.add_argument("--index", type=Path, default=DEFAULT_INDEX)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    index = json.loads(args.index.read_text())
    people = index.get("people", [])
    if len(people) != 448:
        raise SystemExit(f"Expected 448 held-out people, found {len(people)}")
    started = time.time()
    completed: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []
    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 8))) as pool:
        futures = {pool.submit(evaluate, person, args.base_url): person["scanId"] for person in people}
        for future in as_completed(futures):
            scan_id = futures[future]
            try:
                completed.append(future.result())
            except Exception as error:  # report every failed case; do not hide it
                failures.append({"scanId": scan_id, "error": str(error)})
    completed.sort(key=lambda item: item["scanId"])
    per_part: dict[str, Any] = {}
    for part in PARTS:
        rows = [item["rows"][part] for item in completed if part in item["rows"]]
        circumference_errors = [row["circumferenceAbsoluteErrorCm"] for row in rows if row["circumferenceAbsoluteErrorCm"] is not None]
        strict_count = sum(row["strictHalfInchPass"] for row in rows)
        per_part[part] = {
            "circumferenceAbsoluteErrorCm": stats(circumference_errors),
            "strictHalfInch": {
                "thresholdCm": STRICT_CM,
                "passCount": strict_count,
                "failCount": len(circumference_errors) - strict_count,
                "passRate": round(strict_count / len(circumference_errors), 6) if circumference_errors else None,
            },
            "rawOnnxLineErrorPx": {
                key: stats([row["rawOnnxLineErrorPx"][key] for row in rows if row["rawOnnxLineErrorPx"][key] is not None])
                for key in ("y", "left", "right")
            },
            "exactMeshDisplayPassCount": sum(row["displayLineMatchesExactMesh"] for row in rows),
            "exactMeshDisplayTotal": len(rows),
        }
    all_required_rows_pass = 0
    eligible_people = 0
    for item in completed:
        eligible = [row for row in item["rows"].values() if row["circumferenceAbsoluteErrorCm"] is not None]
        if eligible:
            eligible_people += 1
            all_required_rows_pass += all(row["strictHalfInchPass"] for row in eligible)
    report = {
        "schemaVersion": "wear-v6r5-heldout-api-audit/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "modelVersion": completed and post(args.base_url, completed[0]["scanId"]).get("model", {}).get("version"),
        "privateTestLabOnly": True,
        "releaseApproved": False,
        "inputs": ["448 held-out front-50 RGB renders", "height", "weight", "gender", "exact WEAR mesh front widths"],
        "displayRows": "exact WEAR mesh projection; raw ONNX rows retained for audit only",
        "subjectCount": len(people),
        "completedCount": len(completed),
        "failureCount": len(failures),
        "failures": failures,
        "strictAllRows": {
            "thresholdCm": STRICT_CM,
            "eligiblePeople": eligible_people,
            "passCount": all_required_rows_pass,
            "failCount": eligible_people - all_required_rows_pass,
            "passRate": round(all_required_rows_pass / eligible_people, 6) if eligible_people else None,
        },
        "parts": per_part,
        "elapsedSeconds": round(time.time() - started, 3),
        "people": completed,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2) + "\n")
    temporary.replace(args.output)
    print(json.dumps({
        "output": str(args.output),
        "completed": len(completed),
        "failures": len(failures),
        "strictAllRows": report["strictAllRows"],
        "elapsedSeconds": report["elapsedSeconds"],
    }))


if __name__ == "__main__":
    main()
