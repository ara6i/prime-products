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

WORK_ROOT=/workspace/wear-waist-hips-v2
ARCHIVE_PATH=/workspace/wear-waist-hips-v2-input.tar.gz
LOG_PATH=/workspace/wear-waist-hips-v2-training.log
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
    printf '{"schemaVersion":"wear3d-waist-hips-v2-failure/v1","jobId":"%s","state":"failed","exitCode":%s,"teacherInputsReadOnly":true,"previousWeightsUsed":false,"sealed448SubjectsUsedForTraining":0}\n' \
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
  echo 'Refusing a package containing previous model weights' >&2
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

PYTHONPATH="$WORK_ROOT/code" python -m unittest "$WORK_ROOT/code/waist_hip_student_test.py" -v

timeout --signal=TERM --kill-after=60 6000 \
  env PYTHONPATH="$WORK_ROOT/code" python "$WORK_ROOT/code/train_waist_hip_v2.py" \
  --index "$WORK_ROOT/input/training-index.npz" \
  --index-metadata "$WORK_ROOT/input/training-index.json" \
  --masks-dir "$WORK_ROOT/masks" \
  --output-dir "$WORK_ROOT/output" \
  --job-id "$WEAR_JOB_ID" \
  --device cuda \
  --progress-upload-url "$WEAR_PROGRESS_UPLOAD_URL" \
  --checkpoint-upload-url "$WEAR_CHECKPOINT_UPLOAD_URL" \
  --result-upload-url "$WEAR_RESULT_UPLOAD_URL" \
  --overlay-upload-url "$WEAR_OVERLAY_UPLOAD_URL" \
  --epochs 160 \
  --min-epochs 40 \
  --patience 25 \
  --batch-size 512 \
  --learning-rate 0.0008 \
  --torch-threads 20 \
  --decode-workers 20 \
  --max-wall-minutes 90

upload_log
