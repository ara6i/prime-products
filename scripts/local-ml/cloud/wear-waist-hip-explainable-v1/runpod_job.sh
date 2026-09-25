#!/usr/bin/env bash
set -Eeuo pipefail

: "${WEAR_JOB_ID:?WEAR_JOB_ID is required}"
: "${WEAR_INPUT_URL:?WEAR_INPUT_URL is required}"
: "${WEAR_INPUT_SHA256:?WEAR_INPUT_SHA256 is required}"
: "${WEAR_RESULT_UPLOAD_URL:?WEAR_RESULT_UPLOAD_URL is required}"
: "${WEAR_LOG_UPLOAD_URL:?WEAR_LOG_UPLOAD_URL is required}"
: "${WEAR_BUNDLE_UPLOAD_URL:?WEAR_BUNDLE_UPLOAD_URL is required}"

WEAR_MODE="${WEAR_MODE:-dry}"
WEAR_EPOCHS="${WEAR_EPOCHS:-2}"
WEAR_BATCH_SIZE="${WEAR_BATCH_SIZE:-512}"
WEAR_WARMUP_EPOCHS="${WEAR_WARMUP_EPOCHS:-1}"
WEAR_PATIENCE="${WEAR_PATIENCE:-12}"
WEAR_MAX_SUBJECTS="${WEAR_MAX_SUBJECTS:-64}"
WORK_ROOT=/workspace/prime-waist-hip-explainable
ARCHIVE_PATH=/workspace/prime-waist-hip-input.tar.gz
LOG_PATH=/workspace/prime-waist-hip-training.log
OUTPUT_DIR="$WORK_ROOT/output"
install -d -m 0750 "$WORK_ROOT" "$OUTPUT_DIR"
exec > >(tee -a "$LOG_PATH") 2>&1

upload_file() {
  local file="$1"
  local url="$2"
  local content_type="$3"
  if [[ -f "$file" ]]; then
    curl --fail --silent --show-error --retry 5 -X PUT -H "Content-Type: $content_type" --upload-file "$file" "$url"
  fi
}

finish() {
  exit_code=$?
  trap - EXIT
  set +e
  if [[ -f "$OUTPUT_DIR/cross-validation-summary.json" ]]; then
    result="$OUTPUT_DIR/cross-validation-summary.json"
  elif [[ -f "$OUTPUT_DIR/dry-run-result.json" ]]; then
    result="$OUTPUT_DIR/dry-run-result.json"
  elif [[ -f "$OUTPUT_DIR/fold-0/final-result.json" ]]; then
    result="$OUTPUT_DIR/fold-0/final-result.json"
  else
    result="$OUTPUT_DIR/failure.json"
    printf '{"schemaVersion":"wear-waist-hip-runpod-failure/v1","jobId":"%s","state":"failed","exitCode":%s,"heldoutPeopleUsed":0}\n' "$WEAR_JOB_ID" "$exit_code" > "$result"
  fi
  tar -czf "$OUTPUT_DIR/artifact-bundle.tar.gz" -C "$OUTPUT_DIR" --exclude artifact-bundle.tar.gz .
  upload_file "$result" "$WEAR_RESULT_UPLOAD_URL" application/json || true
  upload_file "$OUTPUT_DIR/artifact-bundle.tar.gz" "$WEAR_BUNDLE_UPLOAD_URL" application/gzip || true
  upload_file "$LOG_PATH" "$WEAR_LOG_UPLOAD_URL" text/plain || true
  exit "$exit_code"
}
trap finish EXIT

curl --fail --location --silent --show-error --retry 5 "$WEAR_INPUT_URL" --output "$ARCHIVE_PATH"
printf '%s  %s\n' "$WEAR_INPUT_SHA256" "$ARCHIVE_PATH" | sha256sum --check --strict
tar -xzf "$ARCHIVE_PATH" -C "$WORK_ROOT"
test "$(find "$WORK_ROOT/masks" -maxdepth 1 -type f -name '*.png' | wc -l)" -eq 34902
if tar -tzf "$ARCHIVE_PATH" | grep -Eiq '\.(pt|pth|onnx)$'; then
  echo 'Refusing an input package that contains old model weights' >&2
  exit 3
fi

nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
python - <<'PY'
import torch
if not torch.cuda.is_available():
    raise SystemExit("CUDA is unavailable")
print({"torch": torch.__version__, "cuda": torch.version.cuda, "device": torch.cuda.get_device_name(0)})
PY

cd "$WORK_ROOT/code"
python -m unittest -v test_model_contract.py
python train.py \
  --index "$WORK_ROOT/input/training-index.npz" \
  --masks-dir "$WORK_ROOT/masks" \
  --output-dir "$OUTPUT_DIR" \
  --job-id "$WEAR_JOB_ID" \
  --mode "$WEAR_MODE" \
  --device cuda \
  --epochs "$WEAR_EPOCHS" \
  --geometry-warmup-epochs "$WEAR_WARMUP_EPOCHS" \
  --patience "$WEAR_PATIENCE" \
  --batch-size "$WEAR_BATCH_SIZE" \
  --max-subjects "$WEAR_MAX_SUBJECTS"
