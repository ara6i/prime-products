#!/usr/bin/env bash
set -Eeuo pipefail

: "${WEAR_BUCKET:?WEAR_BUCKET is required}"
: "${WEAR_PIPELINE_ID:?WEAR_PIPELINE_ID is required}"
: "${WEAR_TEACHER_PIPELINE_ID:?WEAR_TEACHER_PIPELINE_ID is required}"
: "${WEAR_CODE_PREFIX:?WEAR_CODE_PREFIX is required}"
: "${WEAR_THREADS:=192}"
: "${WEAR_BATCH_SIZE:=32}"
: "${WEAR_SPATIAL_STEPS:=600}"
: "${WEAR_GEOMETRY_STEPS:=700}"
: "${WEAR_ADAPT_STEPS:=700}"
: "${WEAR_EVAL_EVERY:=50}"
: "${WEAR_SHUTDOWN_MINUTES:=90}"
: "${WEAR_MANIFEST_KEY:=processed/${WEAR_TEACHER_PIPELINE_ID}/render-manifest-all.jsonl}"
: "${WEAR_RUN_KIND:=canary}"

install -d -m 0750 /opt/primestyle/code /opt/primestyle/v6/rendered /opt/primestyle/model
log_path="/var/log/${WEAR_PIPELINE_ID}.log"
exec > >(tee -a "$log_path") 2>&1

# This instance stops instead of terminating, so the environment and the
# rendered WEAR cards remain on its encrypted EBS disk for the next iteration.
shutdown -h "+${WEAR_SHUTDOWN_MINUTES}"

finish() {
  exit_code=$?
  trap - EXIT
  set +e
  aws s3 cp "$log_path" \
    "s3://${WEAR_BUCKET}/reports/${WEAR_PIPELINE_ID}/ec2-cpu-train.log" \
    --sse AES256 --only-show-errors
  if [[ -d /opt/primestyle/model ]]; then
    aws s3 cp /opt/primestyle/model "s3://${WEAR_BUCKET}/models/${WEAR_PIPELINE_ID}/" \
      --recursive --sse AES256 --only-show-errors
    aws s3 cp /opt/primestyle/model "s3://${WEAR_BUCKET}/reports/${WEAR_PIPELINE_ID}/" \
      --recursive --exclude '*' \
      --include 'validation-metrics.json' --include 'validation-contact-sheet.jpg' \
      --include 'training-history.json' \
      --sse AES256 --only-show-errors
  fi
  shutdown -h now
  exit "$exit_code"
}
trap finish EXIT

export DEBIAN_FRONTEND=noninteractive
if ! command -v aws >/dev/null || ! command -v python3 >/dev/null; then
  apt-get update
  apt-get install -y --no-install-recommends awscli ca-certificates python3-pip python3-venv
  apt-get clean
fi

# Install SSM once so this stopped reusable instance can receive the next
# iteration without rebuilding its 150 GB persistent environment.
if ! systemctl list-unit-files 2>/dev/null | grep -q amazon-ssm-agent; then
  snap install amazon-ssm-agent --classic || true
fi
systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service 2>/dev/null \
  || systemctl enable --now amazon-ssm-agent 2>/dev/null \
  || true

train_python=/opt/primestyle/train-venv/bin/python
if [[ ! -x "$train_python" ]]; then
  python3 -m venv /opt/primestyle/train-venv
fi
if ! "$train_python" -c 'import boto3, numpy, PIL, torch' >/dev/null 2>&1; then
  "$train_python" -m pip install --upgrade pip
  "$train_python" -m pip install torch --index-url https://download.pytorch.org/whl/cpu
  "$train_python" -m pip install boto3 numpy Pillow
fi

aws s3 cp "s3://${WEAR_BUCKET}/${WEAR_CODE_PREFIX%/}/" /opt/primestyle/code/ \
  --recursive --only-show-errors
chmod +x /opt/primestyle/code/*.py
"$train_python" /opt/primestyle/code/train_wear_waist_hips_geometry_v4.py --startup-smoke

# `cp` refreshes the small metadata. `sync` reuses every already-downloaded
# render on later starts and downloads only missing/changed files.
aws s3 cp \
  "s3://${WEAR_BUCKET}/${WEAR_MANIFEST_KEY}" \
  /opt/primestyle/v6/active-manifest.jsonl --only-show-errors
aws s3 sync \
  "s3://${WEAR_BUCKET}/processed/${WEAR_TEACHER_PIPELINE_ID}/rendered/" \
  /opt/primestyle/v6/rendered/ --only-show-errors

rm -rf /opt/primestyle/model/*
export OMP_NUM_THREADS="$WEAR_THREADS"
export MKL_NUM_THREADS="$WEAR_THREADS"
export OMP_PROC_BIND=spread
export OMP_PLACES=cores
echo "Starting WEAR waist/hip v8 ${WEAR_RUN_KIND} with ${WEAR_THREADS} AWS vCPUs"
"$train_python" /opt/primestyle/code/train_wear_waist_hips_geometry_v4.py \
  --manifest /opt/primestyle/v6/active-manifest.jsonl \
  --output-dir /opt/primestyle/model \
  --batch-size "$WEAR_BATCH_SIZE" \
  --spatial-steps "$WEAR_SPATIAL_STEPS" \
  --geometry-steps "$WEAR_GEOMETRY_STEPS" \
  --adapt-steps "$WEAR_ADAPT_STEPS" \
  --eval-every "$WEAR_EVAL_EVERY" \
  --threads "$WEAR_THREADS"
