#!/usr/bin/env python3
"""Run Apple Vision anchor extraction in resumable crash-isolated batches."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import tempfile


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--swift-source", type=Path, required=True)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--input-list", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--status", type=Path, required=True)
    parser.add_argument("--expected", type=int, default=4_326)
    parser.add_argument("--batch-size", type=int, default=125)
    parser.add_argument("--maximum-rounds", type=int, default=80)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def accepted_scans(path: Path) -> tuple[set[str], dict[str, str]]:
    accepted: set[str] = set()
    latest_errors: dict[str, str] = {}
    if not path.is_file():
        return accepted, latest_errors
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            record = json.loads(line)
            scan_id = str(record.get("scan_id") or "")
            if not scan_id:
                continue
            if record.get("accepted") is True:
                accepted.add(scan_id)
                latest_errors.pop(scan_id, None)
            elif scan_id not in accepted:
                latest_errors[scan_id] = str(record.get("error") or "unknown Apple Vision error")
    return accepted, latest_errors


def write_status(path: Path, **updates: object) -> None:
    current: dict[str, object] = {}
    if path.is_file():
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(value, dict):
                current = value
        except Exception:
            pass
    current.update({"schema_version": 1, "updated_at": now(), **updates})
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(current, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="wear-apple-pose-") as temporary:
        binary = Path(temporary) / "apple-vision-pose-batch"
        subprocess.run(
            ["xcrun", "swiftc", str(args.swift_source), "-o", str(binary)],
            check=True,
        )
        accepted, errors = accepted_scans(args.output)
        crash_count = 0
        if args.status.is_file():
            try:
                previous_status = json.loads(args.status.read_text(encoding="utf-8"))
                crash_count = int(previous_status.get("crash_count", 0))
            except Exception:
                pass
        write_status(
            args.status,
            state="running",
            expected=args.expected,
            accepted=len(accepted),
            failed=len(errors),
            percent=round(len(accepted) / args.expected * 100.0, 2),
            started_at=now(),
        )
        stagnant_rounds = 0
        for round_number in range(1, args.maximum_rounds + 1):
            if len(accepted) == args.expected:
                break
            before = len(accepted)
            result = subprocess.run(
                [
                    str(binary),
                    "--input-dir", str(args.input_dir),
                    "--input-list", str(args.input_list),
                    "--output", str(args.output),
                    "--max-new", str(args.batch_size),
                ],
                text=True,
                capture_output=True,
            )
            accepted, errors = accepted_scans(args.output)
            if result.returncode != 0:
                crash_count += 1
            stagnant_rounds = stagnant_rounds + 1 if len(accepted) == before else 0
            write_status(
                args.status,
                state="running" if len(accepted) < args.expected else "complete",
                expected=args.expected,
                accepted=len(accepted),
                failed=len(errors),
                percent=round(len(accepted) / args.expected * 100.0, 2),
                round=round_number,
                last_exit_code=result.returncode,
                last_stdout=result.stdout[-2_000:],
                last_stderr=result.stderr[-4_000:],
                crash_recovered=result.returncode not in (0,),
                crash_count=crash_count,
                failure_examples=dict(list(sorted(errors.items()))[:20]),
            )
            print(json.dumps({
                "round": round_number,
                "accepted": len(accepted),
                "expected": args.expected,
                "failed": len(errors),
                "exit_code": result.returncode,
            }), flush=True)
            if stagnant_rounds >= 3:
                break
        accepted, errors = accepted_scans(args.output)
        if len(accepted) != args.expected:
            write_status(
                args.status,
                state="failed",
                expected=args.expected,
                accepted=len(accepted),
                failed=len(errors),
                percent=round(len(accepted) / args.expected * 100.0, 2),
                failure_examples=dict(list(sorted(errors.items()))[:50]),
            )
            raise RuntimeError(
                f"Apple anchor coverage {len(accepted)}/{args.expected}; unresolved={dict(list(sorted(errors.items()))[:10])}"
            )
        write_status(
            args.status,
            state="complete",
            expected=args.expected,
            accepted=len(accepted),
            failed=0,
            percent=100.0,
            completed_at=now(),
            crash_count=crash_count,
        )
        print(json.dumps({"accepted": len(accepted), "expected": args.expected, "complete": True}))


if __name__ == "__main__":
    main()
