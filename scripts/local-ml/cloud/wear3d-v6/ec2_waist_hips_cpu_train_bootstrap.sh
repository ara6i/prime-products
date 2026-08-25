#!/usr/bin/env bash
set -Eeuo pipefail

: "${WEAR_BUCKET:?WEAR_BUCKET is required}"
: "${WEAR_PIPELINE_ID:?WEAR_PIPELINE_ID is required}"
: "${WEAR_TEACHER_PIPELINE_ID:?WEAR_TEACHER_PIPELINE_ID is required}"
: "${WEAR_STATUS_KEY:?WEAR_STATUS_KEY is required}"
: "${WEAR_CODE_PREFIX:?WEAR_CODE_PREFIX is required}"
: "${WEAR_SHUTDOWN_MINUTES:=90}"
: "${WEAR_THREADS:=64}"
: "${WEAR_TRAIN_SCRIPT:=train_wear_waist_hips_cpu.py}"
: "${WEAR_EPOCHS:=30}"
: "${WEAR_BATCH_SIZE:=128}"

install -d -m 0750 /opt/primestyle/code /opt/primestyle/v6/rendered /opt/primestyle/model
exec > >(tee -a /var/log/primestyle-wear-waist-hips-cpu-train.log) 2>&1
shutdown -h "+${WEAR_SHUTDOWN_MINUTES}"

finish() {
  exit_code=$?
  trap - EXIT
  set +e
  if [[ "$exit_code" -ne 0 ]]; then
    python3 - "$exit_code" <<'PY'
import json, os, sys
from datetime import datetime, timezone
import boto3
try:
    s3=boto3.client("s3"); bucket=os.environ["WEAR_BUCKET"]; key=os.environ["WEAR_STATUS_KEY"]
    payload=json.loads(s3.get_object(Bucket=bucket,Key=key)["Body"].read())
    payload.update({"state":"failed","currentStageLabel":"Waist/hips CPU training stopped safely","detail":f"CPU worker exited with code {sys.argv[1]}. Logs and partial artifacts were preserved; nothing was installed.","updatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z")})
    s3.put_object(Bucket=bucket,Key=key,Body=(json.dumps(payload,indent=2)+"\n").encode(),ContentType="application/json",ServerSideEncryption="AES256")
except Exception as error:
    print(f"status_failure_update_warning={type(error).__name__}: {error}")
PY
  fi
  aws s3 cp /var/log/primestyle-wear-waist-hips-cpu-train.log \
    "s3://${WEAR_BUCKET}/reports/${WEAR_PIPELINE_ID}/ec2-cpu-train.log" \
    --sse AES256 --only-show-errors
  if [[ -d /opt/primestyle/model ]]; then
    aws s3 cp /opt/primestyle/model "s3://${WEAR_BUCKET}/models/${WEAR_PIPELINE_ID}/" \
      --recursive --sse AES256 --only-show-errors
    aws s3 cp /opt/primestyle/model "s3://${WEAR_BUCKET}/reports/${WEAR_PIPELINE_ID}/" \
      --recursive --exclude '*' \
      --include 'validation-metrics.json' --include 'validation-contact-sheet.jpg' \
      --include 'test-metrics.json' --include 'test-contact-sheet.jpg' \
      --include 'training-history.json' --include 'runtime.json' \
      --sse AES256 --only-show-errors
  fi
  shutdown -h now
  exit "$exit_code"
}
trap finish EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends awscli ca-certificates python3-boto3 python3-pip python3-venv
apt-get clean

python3 -m venv /opt/primestyle/train-venv
train_python=/opt/primestyle/train-venv/bin/python
"$train_python" -m pip install --no-cache-dir --upgrade pip
"$train_python" -m pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
"$train_python" -m pip install --no-cache-dir boto3 numpy Pillow onnx onnxscript

aws s3 cp "s3://${WEAR_BUCKET}/${WEAR_CODE_PREFIX%/}/" /opt/primestyle/code/ --recursive --only-show-errors
chmod +x /opt/primestyle/code/*.py
"$train_python" "/opt/primestyle/code/${WEAR_TRAIN_SCRIPT}" --startup-smoke

aws s3 cp \
  "s3://${WEAR_BUCKET}/processed/${WEAR_TEACHER_PIPELINE_ID}/render-manifest-all.jsonl" \
  /opt/primestyle/v6/render-manifest-all.jsonl --only-show-errors
aws s3 cp \
  "s3://${WEAR_BUCKET}/reports/${WEAR_TEACHER_PIPELINE_ID}/label-audit.json" \
  /opt/primestyle/v6/label-audit.json --only-show-errors
aws s3 sync \
  "s3://${WEAR_BUCKET}/processed/${WEAR_TEACHER_PIPELINE_ID}/rendered/" \
  /opt/primestyle/v6/rendered/ --only-show-errors

"$train_python" "/opt/primestyle/code/${WEAR_TRAIN_SCRIPT}" \
  --manifest /opt/primestyle/v6/render-manifest-all.jsonl \
  --audit /opt/primestyle/v6/label-audit.json \
  --rendered-root /opt/primestyle/v6/rendered \
  --output-dir /opt/primestyle/model \
  --pipeline-id "$WEAR_PIPELINE_ID" \
  --epochs "$WEAR_EPOCHS" \
  --batch-size "$WEAR_BATCH_SIZE" \
  --threads "$WEAR_THREADS" \
  --status-bucket "$WEAR_BUCKET" \
  --status-key "$WEAR_STATUS_KEY"
