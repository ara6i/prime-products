#!/usr/bin/env python3
"""Best-effort status update when EC2 bootstrap fails outside the pipeline."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone

import boto3


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--key", required=True)
    parser.add_argument("--detail", required=True)
    args = parser.parse_args()
    s3 = boto3.client("s3")
    response = s3.get_object(Bucket=args.bucket, Key=args.key)
    status = json.loads(response["Body"].read())
    status.update(
        {
            "state": "failed",
            "currentStageLabel": "AWS worker setup failed",
            "detail": args.detail,
            "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
    )
    for stage in status.get("stages", []):
        if stage.get("key") == status.get("currentStage"):
            stage["state"] = "failed"
    s3.put_object(
        Bucket=args.bucket,
        Key=args.key,
        Body=json.dumps(status, indent=2).encode("utf-8"),
        ContentType="application/json",
        ServerSideEncryption="AES256",
    )


if __name__ == "__main__":
    main()
