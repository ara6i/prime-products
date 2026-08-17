#!/usr/bin/env bash
set -Eeuo pipefail

: "${WEAR_BUCKET:?WEAR_BUCKET is required}"
: "${WEAR_PIPELINE_ID:?WEAR_PIPELINE_ID is required}"
: "${WEAR_STATUS_KEY:?WEAR_STATUS_KEY is required}"
: "${WEAR_CODE_PREFIX:?WEAR_CODE_PREFIX is required}"
: "${WEAR_PROCESSED_SOURCE_PIPELINE_ID:?WEAR_PROCESSED_SOURCE_PIPELINE_ID is required}"

install -d -m 0750 /opt/primestyle/code /opt/primestyle/wear3d
exec > >(tee -a /var/log/primestyle-wear3d-train.log) 2>&1

# The GPU is capped at four hours and terminates on completion or failure.
shutdown -h +240

pipeline_started=0
finish() {
  exit_code=$?
  set +e
  aws s3 cp /var/log/primestyle-wear3d-train.log \
    "s3://${WEAR_BUCKET}/reports/${WEAR_PIPELINE_ID}/ec2-gpu-train.log" \
    --sse AES256 --only-show-errors
  if [[ $exit_code -ne 0 && $pipeline_started -eq 0 && -f /opt/primestyle/code/report_failure.py ]]; then
    /usr/bin/python3 /opt/primestyle/code/report_failure.py \
      --bucket "$WEAR_BUCKET" \
      --key "$WEAR_STATUS_KEY" \
      --detail "AWS GPU setup exited with code ${exit_code}. See the protected GPU setup log."
  fi
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
for candidate in \
  /opt/conda/envs/pytorch/bin/python \
  /opt/conda/bin/python; do
  if [[ -x "$candidate" ]] && "$candidate" -c 'import torch' >/dev/null 2>&1; then
    train_python="$candidate"
    break
  fi
done
if [[ -z "$train_python" ]]; then
  python3 -m venv /opt/primestyle/train-venv
  train_python=/opt/primestyle/train-venv/bin/python
  "$train_python" -m pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cu128
fi
"$train_python" -m pip install --no-cache-dir boto3 Pillow onnx onnxscript

nvidia-smi
"$train_python" -c 'import torch; print({"torch": torch.__version__, "cuda": torch.cuda.is_available(), "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None})'

metadata_token=$(curl -fsS -X PUT \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600' \
  http://169.254.169.254/latest/api/token)
instance_id=$(curl -fsS \
  -H "X-aws-ec2-metadata-token: ${metadata_token}" \
  http://169.254.169.254/latest/meta-data/instance-id)

pipeline_started=1
/usr/bin/python3 /opt/primestyle/code/run_full_pipeline.py \
  --bucket "$WEAR_BUCKET" \
  --status-key "$WEAR_STATUS_KEY" \
  --pipeline-id "$WEAR_PIPELINE_ID" \
  --processed-source-pipeline-id "$WEAR_PROCESSED_SOURCE_PIPELINE_ID" \
  --train-python "$train_python" \
  --instance-id "$instance_id" \
  --instance-type g4dn.xlarge \
  --max-runtime-hours 4 \
  --epochs 32 \
  --train-only
