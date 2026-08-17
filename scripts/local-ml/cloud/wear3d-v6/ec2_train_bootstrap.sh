#!/usr/bin/env bash
set -Eeuo pipefail

: "${WEAR_BUCKET:?WEAR_BUCKET is required}"
: "${WEAR_PIPELINE_ID:?WEAR_PIPELINE_ID is required}"
: "${WEAR_TEACHER_PIPELINE_ID:?WEAR_TEACHER_PIPELINE_ID is required}"
: "${WEAR_STATUS_KEY:?WEAR_STATUS_KEY is required}"
: "${WEAR_CODE_PREFIX:?WEAR_CODE_PREFIX is required}"

install -d -m 0750 /opt/primestyle/code /opt/primestyle/v6
exec > >(tee -a /var/log/primestyle-wear3d-v6-train.log) 2>&1
shutdown -h +240

# The compact loader should stay in RAM. This bounded temporary swap is only a
# final guard against the Linux OOM killer while a checkpoint is being copied.
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
  fallocate -l 8G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
fi

finish() {
  exit_code=$?
  trap - EXIT
  set +e
  if [ "$exit_code" -ne 0 ]; then
    status_python="${train_python:-python3}"
    "$status_python" - "$exit_code" <<'PY'
import json
import os
import sys
from datetime import datetime, timezone

import boto3

try:
    s3 = boto3.client("s3")
    bucket = os.environ["WEAR_BUCKET"]
    key = os.environ["WEAR_STATUS_KEY"]
    payload = json.loads(s3.get_object(Bucket=bucket, Key=key)["Body"].read())
    if payload.get("state") != "failed":
        payload.update({
            "state": "failed",
            "currentStageLabel": "Virginia GPU training stopped safely",
            "detail": f"The GPU worker exited with code {sys.argv[1]}. Logs and any artifacts were preserved; private real-photo testing remains blocked.",
            "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        })
        for stage in payload.get("stages", []):
            if stage.get("key") == payload.get("currentStage"):
                stage["state"] = "failed"
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=(json.dumps(payload, indent=2) + "\n").encode(),
        ContentType="application/json",
        ServerSideEncryption="AES256",
    )
except Exception as error:
    print(f"status_failure_update_warning={type(error).__name__}: {error}")
PY
  fi
  aws s3 cp /var/log/primestyle-wear3d-v6-train.log \
    "s3://${WEAR_BUCKET}/reports/${WEAR_PIPELINE_ID}/ec2-train.log" \
    --sse AES256 --only-show-errors
  shutdown -h now
  exit "$exit_code"
}
trap finish EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends awscli ca-certificates curl python3-boto3 python3-pip python3-venv
apt-get clean

aws s3 cp "s3://${WEAR_BUCKET}/${WEAR_CODE_PREFIX%/}/" /opt/primestyle/code/ \
  --recursive --only-show-errors
chmod +x /opt/primestyle/code/*.py

train_python=""
for candidate in /opt/conda/envs/pytorch/bin/python /opt/conda/bin/python; do
  if [[ -x "$candidate" ]] && "$candidate" -c 'import torch' >/dev/null 2>&1; then
    train_python="$candidate"
    break
  fi
done
if [[ -z "$train_python" ]]; then
  python3 -m venv /opt/primestyle/train-venv
  train_python=/opt/primestyle/train-venv/bin/python
  "$train_python" -m pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cu128
fi
if ! "$train_python" -c 'import torchvision' >/dev/null 2>&1; then
  "$train_python" -m pip install --no-cache-dir torchvision --index-url https://download.pytorch.org/whl/cu128
fi
"$train_python" -m pip install --no-cache-dir boto3 Pillow onnx onnxscript
nvidia-smi
"$train_python" -c 'import torch, torchvision; assert torch.cuda.is_available(); print({"torch": torch.__version__, "torchvision": torchvision.__version__, "device": torch.cuda.get_device_name(0)})'
"$train_python" /opt/primestyle/code/train_wear3d_v6.py --startup-smoke

"$train_python" /opt/primestyle/code/run_v6_train.py \
  --bucket "$WEAR_BUCKET" \
  --pipeline-id "$WEAR_PIPELINE_ID" \
  --teacher-pipeline-id "$WEAR_TEACHER_PIPELINE_ID" \
  --status-key "$WEAR_STATUS_KEY" \
  --train-python "$train_python" \
  --epochs 15 \
  --batch-size 64 \
  --workers 2
