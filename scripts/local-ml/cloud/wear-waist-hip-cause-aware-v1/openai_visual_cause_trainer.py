#!/usr/bin/env python3
"""Connect an OpenAI vision model to the named waist/hip teaching loop.

OpenAI diagnoses one saved failure and chooses one named lesson template.  It
cannot write a measurement or silently accept its own lesson.  Exact local code
must calculate the change from cited evidence and validate it on an outside
person fold before the lesson can be kept.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
ALLOWED_CAUSES = (
    "wrong_body_line",
    "wrong_a_to_b_width",
    "wrong_front_to_back_depth",
    "wrong_cross_section_shape",
    "wrong_tape_protocol_correction",
    "bad_teacher",
    "insufficient_visual_evidence",
)
ALLOWED_LESSONS = (
    "use_teacher_component_counterfactual",
    "use_median_agreed_residual",
    "change_visible_matching_condition",
    "quarantine_teacher",
    "request_more_visual_evidence",
    "reject_change",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence", required=True, type=Path)
    parser.add_argument("--scan-id", required=True)
    parser.add_argument("--target", required=True, choices=("waist", "hips"))
    parser.add_argument("--image", action="append", default=[], type=Path)
    parser.add_argument("--teacher-evidence-jsonl", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--request-output", type=Path)
    parser.add_argument("--model", default="gpt-5.6-sol")
    parser.add_argument("--prepare-only", action="store_true")
    return parser.parse_args()


def find_trace(evidence: dict[str, Any], scan_id: str, target: str) -> dict[str, Any]:
    for trace in evidence.get("traces", []):
        if trace.get("scanId") == scan_id and trace.get("target") == target:
            return trace
    raise ValueError(f"No {target} trace for {scan_id} in {len(evidence.get('traces', []))} saved traces")


def image_content(path: Path) -> dict[str, str]:
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return {"type": "input_image", "image_url": f"data:{mime};base64,{encoded}", "detail": "high"}


def lesson_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "scanId", "target", "teacherStatus", "mainCause", "confidence",
            "visibleObservations", "numericEvidence", "lesson", "why",
            "requiredValidation", "keepNow",
        ],
        "properties": {
            "scanId": {"type": "string"},
            "target": {"type": "string", "enum": ["waist", "hips"]},
            "teacherStatus": {"type": "string", "enum": ["usable", "questionable", "bad", "unknown"]},
            "mainCause": {"type": "string", "enum": list(ALLOWED_CAUSES)},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            "visibleObservations": {"type": "array", "items": {"type": "string"}, "maxItems": 8},
            "numericEvidence": {
                "type": "array",
                "maxItems": 12,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["field", "observedValue", "meaning"],
                    "properties": {
                        "field": {"type": "string"},
                        "observedValue": {"type": ["number", "string"]},
                        "meaning": {"type": "string"},
                    },
                },
            },
            "lesson": {"type": "string", "enum": list(ALLOWED_LESSONS)},
            "why": {"type": "string"},
            "requiredValidation": {"type": "array", "items": {"type": "string"}, "minItems": 1, "maxItems": 8},
            "keepNow": {"type": "boolean", "const": False},
        },
    }


def build_request(
    model: str,
    trace: dict[str, Any],
    images: list[Path],
    teacher_evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    content: list[dict[str, Any]] = [{
        "type": "input_text",
        "text": (
            "Inspect this one saved waist/hip failure. Identify the physical cause, not merely the final error. "
            "Use the images and exact evidence together. Do not invent a centimetre adjustment. Choose only one "
            "allowed lesson template. Any number must quote an existing evidence field. keepNow must be false because "
            "separate five-fold validation decides whether the lesson is kept.\n\nEVIDENCE:\n"
            + json.dumps({"studentTrace": trace, "teacherEvidence": teacher_evidence}, indent=2, sort_keys=True)
        ),
    }]
    content.extend(image_content(path) for path in images)
    return {
        "model": model,
        "store": False,
        "instructions": (
            "You are the visual cause trainer for a transparent waist-and-hip measurement student. "
            "Reason about body line, A-to-B width, front-to-back depth, 32-point shape, tape protocol and teacher quality. "
            "Your job is diagnosis and one bounded lesson proposal. You never directly change or approve the model."
        ),
        "input": [{"role": "user", "content": content}],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "waist_hip_named_lesson",
                "strict": True,
                "schema": lesson_schema(),
            }
        },
        "metadata": {"scan_id": str(trace["scanId"]), "target": str(trace["target"])},
    }


def output_text(response: dict[str, Any]) -> str:
    for item in response.get("output", []):
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                return str(content.get("text", ""))
    raise RuntimeError("OpenAI response did not contain output_text")


def call_openai(request_body: dict[str, Any], api_key: str) -> dict[str, Any]:
    request = urllib.request.Request(
        OPENAI_RESPONSES_URL,
        data=json.dumps(request_body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI Responses API returned HTTP {error.code}: {detail}") from error


def main() -> int:
    args = parse_args()
    evidence = json.loads(args.evidence.read_text())
    trace = find_trace(evidence, args.scan_id, args.target)
    teacher_evidence = None
    if args.teacher_evidence_jsonl:
        for line in args.teacher_evidence_jsonl.read_text().splitlines():
            item = json.loads(line)
            if item.get("scanId") == args.scan_id and item.get("target") == args.target:
                teacher_evidence = item
                break
        if teacher_evidence is None:
            raise ValueError(f"No teacher evidence for {args.scan_id} {args.target}")
    request_body = build_request(args.model, trace, args.image, teacher_evidence)
    if args.request_output:
        args.request_output.parent.mkdir(parents=True, exist_ok=True)
        safe_request = json.loads(json.dumps(request_body))
        for item in safe_request["input"][0]["content"]:
            if item["type"] == "input_image":
                item["image_url"] = "data:image/...;base64,[omitted from saved request]"
        args.request_output.write_text(json.dumps(safe_request, indent=2, sort_keys=True) + "\n")
    if args.prepare_only:
        print(json.dumps({"state": "request_prepared", "scanId": args.scan_id, "target": args.target, "images": len(args.image)}))
        return 0
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set; the local program cannot use the Codex/ChatGPT login")
    raw_response = call_openai(request_body, api_key)
    lesson = json.loads(output_text(raw_response))
    if lesson["scanId"] != args.scan_id or lesson["target"] != args.target or lesson["keepNow"] is not False:
        raise RuntimeError("OpenAI lesson failed the identity or acceptance safety check")
    payload = {
        "schemaVersion": "wear-openai-visual-cause-lesson/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "model": args.model,
        "responseId": raw_response.get("id"),
        "imagesInspected": [str(path) for path in args.image],
        "lesson": lesson,
        "validationState": "NOT_RUN",
        "acceptedIntoStudent": False,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
