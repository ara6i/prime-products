#!/usr/bin/env bash
set -Eeuo pipefail

: "${WEAR_JOB_ID:?WEAR_JOB_ID is required}"
: "${WEAR_INPUT_URL:?WEAR_INPUT_URL is required}"
: "${WEAR_INPUT_SHA256:?WEAR_INPUT_SHA256 is required}"
: "${WEAR_PROGRESS_UPLOAD_URL:?WEAR_PROGRESS_UPLOAD_URL is required}"
: "${WEAR_CHECKPOINT_UPLOAD_URL:?WEAR_CHECKPOINT_UPLOAD_URL is required}"
: "${WEAR_RESULT_UPLOAD_URL:?WEAR_RESULT_UPLOAD_URL is required}"
: "${WEAR_OVERLAY_UPLOAD_URL:?WEAR_OVERLAY_UPLOAD_URL is required}"
: "${WEAR_LOG_UPLOAD_URL:?WEAR_LOG_UPLOAD_URL is required}"

export OMP_NUM_THREADS=20
export MKL_NUM_THREADS=20
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

WORK_ROOT=/workspace/wear-fresh-runpod
ARCHIVE_PATH=/workspace/runpod-input.tar.gz
LOG_PATH=/workspace/runpod-training.log
install -d -m 0750 "$WORK_ROOT" "$WORK_ROOT/output"
exec > >(tee -a "$LOG_PATH") 2>&1

upload_log() {
  curl --fail --silent --show-error --retry 5 \
    -X PUT -H 'Content-Type: text/plain' --upload-file "$LOG_PATH" \
    "$WEAR_LOG_UPLOAD_URL" || true
}

finish() {
  exit_code=$?
  trap - EXIT
  set +e
  upload_log
  if [[ "$exit_code" -ne 0 ]]; then
    failure_path="$WORK_ROOT/output/runpod-failure.json"
    printf '{"schemaVersion":"wear3d-fresh-runpod-failure/v1","jobId":"%s","state":"failed","exitCode":%s,"freshInitialization":true,"previousWeightsUsed":false,"v9ArtifactUsed":false,"sealedTestSubjectsUsed":0}\n' \
      "$WEAR_JOB_ID" "$exit_code" > "$failure_path"
    curl --fail --silent --show-error --retry 5 \
      -X PUT -H 'Content-Type: application/json' --upload-file "$failure_path" \
      "$WEAR_PROGRESS_UPLOAD_URL" || true
  fi
  exit "$exit_code"
}
trap finish EXIT

curl --fail --location --silent --show-error --retry 5 \
  "$WEAR_INPUT_URL" --output "$ARCHIVE_PATH"
printf '%s  %s\n' "$WEAR_INPUT_SHA256" "$ARCHIVE_PATH" | sha256sum --check --strict

tar --extract --gzip --file "$ARCHIVE_PATH" --directory "$WORK_ROOT"
test "$(find "$WORK_ROOT/masks" -maxdepth 1 -type f -name '*.png' | wc -l)" -eq 34902
tar --list --gzip --file "$ARCHIVE_PATH" > "$WORK_ROOT/archive-files.txt"
if grep -Eiq '\.(pt|pth|onnx)$' "$WORK_ROOT/archive-files.txt"; then
  echo 'Refusing package containing old model weights' >&2
  exit 3
fi

nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
python - <<'PY'
import torch
if not torch.cuda.is_available():
    raise SystemExit("CUDA is unavailable")
properties = torch.cuda.get_device_properties(0)
print({
    "torch": torch.__version__,
    "cuda": torch.version.cuda,
    "device": properties.name,
    "memoryGiB": round(properties.total_memory / (1024 ** 3), 2),
})
PY

timeout --signal=TERM --kill-after=60 4800 \
  python "$WORK_ROOT/code/train_fresh_full_cpu.py" \
  --index "$WORK_ROOT/input/training-index.npz" \
  --index-metadata "$WORK_ROOT/input/training-index.json" \
  --output-dir "$WORK_ROOT/output" \
  --masks-dir "$WORK_ROOT/masks" \
  --job-id "$WEAR_JOB_ID" \
  --device cuda \
  --local-inputs-only \
  --progress-upload-url "$WEAR_PROGRESS_UPLOAD_URL" \
  --checkpoint-upload-url "$WEAR_CHECKPOINT_UPLOAD_URL" \
  --result-upload-url "$WEAR_RESULT_UPLOAD_URL" \
  --overlay-upload-url "$WEAR_OVERLAY_UPLOAD_URL" \
  --epochs 60 \
  --min-epochs 15 \
  --patience 10 \
  --batch-size 1024 \
  --torch-threads 20 \
  --decode-workers 20 \
  --max-wall-minutes 75

upload_log
