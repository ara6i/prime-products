#!/usr/bin/env bash
set -Eeuo pipefail

: "${WEAR_BUCKET:?WEAR_BUCKET is required}"
: "${WEAR_PIPELINE_ID:?WEAR_PIPELINE_ID is required}"

ROOT=/opt/primestyle
PYTHON="$ROOT/train-venv/bin/python"
SCRIPT="$ROOT/code/audit_wear_front_observability_v1.py"
MANIFEST="$ROOT/v6/non-test-source-manifest-all.jsonl"
OUTPUT="$ROOT/model/front-observability-audit-v1.json"
LOG="$ROOT/model/front-observability-audit-v1.log"
THREADS="${WEAR_THREADS:-192}"
TREES="${WEAR_TREES:-512}"
PREFIX="reports/$WEAR_PIPELINE_ID"

shutdown -c >/dev/null 2>&1 || true
shutdown -h +180

export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1
export OPENBLAS_NUM_THREADS=1
export NUMEXPR_NUM_THREADS=1

status=0
"$PYTHON" "$SCRIPT" \
  --manifest "$MANIFEST" \
  --output "$OUTPUT" \
  --threads "$THREADS" \
  --trees "$TREES" \
  >"$LOG" 2>&1 || status=$?

if [[ -f "$OUTPUT" ]]; then
  aws s3 cp "$OUTPUT" "s3://$WEAR_BUCKET/$PREFIX/front-observability-audit-v1.json" \
    --sse AES256 --only-show-errors || true
fi
aws s3 cp "$LOG" "s3://$WEAR_BUCKET/$PREFIX/front-observability-audit-v1.log" \
  --sse AES256 --only-show-errors || true

sync
shutdown -h now
exit "$status"
