#!/usr/bin/env bash
set -Eeuo pipefail

: "${WEAR_BUCKET:?WEAR_BUCKET is required}"
: "${WEAR_JOB_ID:?WEAR_JOB_ID is required}"
: "${WEAR_CODE_PREFIX:?WEAR_CODE_PREFIX is required}"
: "${WEAR_INDEX_KEY:?WEAR_INDEX_KEY is required}"
: "${WEAR_INDEX_METADATA_KEY:?WEAR_INDEX_METADATA_KEY is required}"
: "${WEAR_REPORT_PREFIX:?WEAR_REPORT_PREFIX is required}"
: "${WEAR_SHUTDOWN_MINUTES:=125}"

export AWS_DEFAULT_REGION="${AWS_REGION:-us-east-1}"
export AWS_REGION="$AWS_DEFAULT_REGION"
export AWS_PAGER=""
install -d -m 0750 /opt/primestyle/code /opt/primestyle/input /opt/primestyle/output /opt/primestyle/masks
LOG_PATH="/var/log/primestyle-${WEAR_JOB_ID}.log"
exec > >(tee -a "$LOG_PATH") 2>&1

shutdown -h "+${WEAR_SHUTDOWN_MINUTES}"

finish() {
  exit_code=$?
  trap - EXIT
  set +e
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "$LOG_PATH" \
      "s3://${WEAR_BUCKET}/${WEAR_REPORT_PREFIX%/}/bootstrap.log" \
      --sse AES256 --content-type text/plain --only-show-errors
    if [[ -d /opt/primestyle/output ]]; then
      aws s3 cp /opt/primestyle/output/ \
        "s3://${WEAR_BUCKET}/${WEAR_REPORT_PREFIX%/}/" \
        --recursive --sse AES256 --only-show-errors
    fi
  fi
  if [[ "$exit_code" -ne 0 ]] && [[ -x /opt/primestyle/venv/bin/python ]]; then
    /opt/primestyle/venv/bin/python - "$exit_code" <<'PY'
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import boto3

payload = {
    "schemaVersion": "wear3d-fresh-full-cpu-failure/v1",
    "jobId": os.environ["WEAR_JOB_ID"],
    "state": "failed",
    "exitCode": int(sys.argv[1]),
    "completedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    "freshInitialization": True,
    "previousWeightsUsed": False,
    "v9ArtifactUsed": False,
    "sealedTestSubjectsUsed": 0,
}
path = Path("/opt/primestyle/output/bootstrap-failure.json")
path.write_text(json.dumps(payload, indent=2) + "\n")
boto3.client("s3").put_object(
    Bucket=os.environ["WEAR_BUCKET"],
    Key=f"{os.environ['WEAR_REPORT_PREFIX'].rstrip('/')}/bootstrap-failure.json",
    Body=path.read_bytes(),
    ContentType="application/json",
    ServerSideEncryption="AES256",
)
PY
  fi
  shutdown -h now
  exit "$exit_code"
}
trap finish EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  awscli ca-certificates libgomp1 python3-pip python3-venv
apt-get clean

# Keep a live copy of the bootstrap log in S3 so progress is observable even
# before the Python trainer begins publishing epoch metrics.
(
  while true; do
    sleep 30
    aws s3 cp "$LOG_PATH" \
      "s3://${WEAR_BUCKET}/${WEAR_REPORT_PREFIX%/}/bootstrap-live.log" \
      --sse AES256 --content-type text/plain --only-show-errors || true
  done
) &
LOG_SYNC_PID=$!

python3 -m venv /opt/primestyle/venv
/opt/primestyle/venv/bin/python -m pip install --no-cache-dir --upgrade pip
/opt/primestyle/venv/bin/python -m pip install --no-cache-dir \
  boto3==1.37.38 filelock==3.18.0 fsspec==2025.3.0 jinja2==3.1.6 \
  networkx==3.4.2 numpy==1.26.4 pillow==11.1.0 sympy==1.13.1 \
  typing-extensions==4.13.0
/opt/primestyle/venv/bin/python -m pip install --no-cache-dir --no-deps \
  --index-url https://download.pytorch.org/whl/cpu torch==2.6.0+cpu

aws s3 cp "s3://${WEAR_BUCKET}/${WEAR_CODE_PREFIX%/}/" /opt/primestyle/code/ \
  --recursive --only-show-errors
aws s3 cp "s3://${WEAR_BUCKET}/${WEAR_INDEX_KEY}" /opt/primestyle/input/training-index.npz \
  --only-show-errors
aws s3 cp "s3://${WEAR_BUCKET}/${WEAR_INDEX_METADATA_KEY}" /opt/primestyle/input/training-index.json \
  --only-show-errors

chmod +x /opt/primestyle/code/*.py
/opt/primestyle/venv/bin/python - <<'PY'
import boto3
import numpy
import PIL
import torch
print({
    "torch": torch.__version__,
    "numpy": numpy.__version__,
    "pillow": PIL.__version__,
    "boto3": boto3.__version__,
    "cpu_threads": torch.get_num_threads(),
})
PY

timeout --signal=TERM --kill-after=60 6900 \
  /opt/primestyle/venv/bin/python /opt/primestyle/code/train_fresh_full_cpu.py \
  --index /opt/primestyle/input/training-index.npz \
  --index-metadata /opt/primestyle/input/training-index.json \
  --output-dir /opt/primestyle/output \
  --masks-dir /opt/primestyle/masks \
  --bucket "$WEAR_BUCKET" \
  --report-prefix "$WEAR_REPORT_PREFIX" \
  --job-id "$WEAR_JOB_ID" \
  --epochs 60 \
  --min-epochs 15 \
  --patience 10 \
  --batch-size 512 \
  --torch-threads 96 \
  --download-workers 96 \
  --decode-workers 48 \
  --max-wall-minutes 100

kill "$LOG_SYNC_PID" 2>/dev/null || true
