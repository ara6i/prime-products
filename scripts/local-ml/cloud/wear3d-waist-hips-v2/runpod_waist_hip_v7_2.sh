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
: "${WEAR_OVERFIT_UPLOAD_URL:?WEAR_OVERFIT_UPLOAD_URL is required}"
: "${WEAR_ONNX_UPLOAD_URL:?WEAR_ONNX_UPLOAD_URL is required}"
: "${WEAR_RUNTIME_UPLOAD_URL:?WEAR_RUNTIME_UPLOAD_URL is required}"
: "${WEAR_ARTIFACT_UPLOAD_URL:?WEAR_ARTIFACT_UPLOAD_URL is required}"

export OMP_NUM_THREADS=20
export MKL_NUM_THREADS=20
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

WORK_ROOT=/workspace/wear-waist-hips-v7-2
ARCHIVE_PATH=/workspace/wear-waist-hips-v7-2-input.tar.gz
LOG_PATH=/workspace/wear-waist-hips-v7-2-training.log
rm -rf -- "$WORK_ROOT"
install -d -m 0750 "$WORK_ROOT" "$WORK_ROOT/output" "$WORK_ROOT/overfit" "$WORK_ROOT/export"
: > "$LOG_PATH"
exec > >(tee -a "$LOG_PATH") 2>&1

put_file() {
  local path=$1
  local content_type=$2
  local url=$3
  curl --fail --silent --show-error --retry 5 \
    -X PUT -H "Content-Type: $content_type" --upload-file "$path" "$url"
}

upload_log() {
  put_file "$LOG_PATH" text/plain "$WEAR_LOG_UPLOAD_URL" || true
}

finish() {
  exit_code=$?
  trap - EXIT
  set +e
  upload_log
  if [[ "$exit_code" -ne 0 ]]; then
    failure_path="$WORK_ROOT/output/runpod-failure.json"
    printf '{"schemaVersion":"wear3d-waist-hips-v7-2-failure/v1","jobId":"%s","state":"failed","exitCode":%s,"teacherInputsReadOnly":true,"previousWeightsUsed":false,"sealed448SubjectsUsedForTraining":0}\n' \
      "$WEAR_JOB_ID" "$exit_code" > "$failure_path"
    put_file "$failure_path" application/json "$WEAR_PROGRESS_UPLOAD_URL" || true
  fi
  exit "$exit_code"
}
trap finish EXIT

curl --fail --location --silent --show-error --retry 5 \
  "$WEAR_INPUT_URL" --output "$ARCHIVE_PATH"
printf '%s  %s\n' "$WEAR_INPUT_SHA256" "$ARCHIVE_PATH" | sha256sum --check --strict
tar --extract --gzip --file "$ARCHIVE_PATH" --directory "$WORK_ROOT"
test "$(find "$WORK_ROOT/masks" -maxdepth 1 -type f -name '*.png' | wc -l)" -eq 34902
test -f "$WORK_ROOT/input/teacher-audit.json"
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

PYTHONPATH="$WORK_ROOT/code" python -m unittest \
  "$WORK_ROOT/code/waist_hip_student_test.py" \
  "$WORK_ROOT/code/waist_hip_student_v4_test.py" \
  "$WORK_ROOT/code/waist_hip_student_v5_test.py" \
  "$WORK_ROOT/code/waist_hip_student_v6_test.py" \
  "$WORK_ROOT/code/waist_hip_student_v7_test.py" \
  "$WORK_ROOT/code/waist_hip_student_v7_1_test.py" \
  "$WORK_ROOT/code/waist_hip_student_v7_2_test.py" -v

echo 'Starting mandatory ten-person V7.2 overfit proof'
timeout --signal=TERM --kill-after=60 2400 \
  env PYTHONPATH="$WORK_ROOT/code" python "$WORK_ROOT/code/train_waist_hip_v7_2.py" \
  --index "$WORK_ROOT/input/training-index.npz" \
  --index-metadata "$WORK_ROOT/input/training-index.json" \
  --masks-dir "$WORK_ROOT/masks" \
  --teacher-audit "$WORK_ROOT/input/teacher-audit.json" \
  --output-dir "$WORK_ROOT/overfit" \
  --job-id "${WEAR_JOB_ID}-overfit10" \
  --device cuda \
  --local-output-only \
  --overfit-subjects 10 \
  --epochs 1100 \
  --min-epochs 350 \
  --patience 250 \
  --batch-size 90 \
  --learning-rate 0.0008 \
  --torch-threads 20 \
  --decode-workers 20 \
  --max-wall-minutes 34
PYTHONPATH="$WORK_ROOT/code" python "$WORK_ROOT/code/verify_overfit_v7_2.py" \
  --result "$WORK_ROOT/overfit/final-result.json"
put_file "$WORK_ROOT/overfit/final-result.json" application/json "$WEAR_OVERFIT_UPLOAD_URL"

echo 'V7.2 proof passed; starting fresh 3451/427 canonical training'
timeout --signal=TERM --kill-after=60 7800 \
  env PYTHONPATH="$WORK_ROOT/code" python "$WORK_ROOT/code/train_waist_hip_v7_2.py" \
  --index "$WORK_ROOT/input/training-index.npz" \
  --index-metadata "$WORK_ROOT/input/training-index.json" \
  --masks-dir "$WORK_ROOT/masks" \
  --teacher-audit "$WORK_ROOT/input/teacher-audit.json" \
  --output-dir "$WORK_ROOT/output" \
  --job-id "$WEAR_JOB_ID" \
  --device cuda \
  --progress-upload-url "$WEAR_PROGRESS_UPLOAD_URL" \
  --checkpoint-upload-url "$WEAR_CHECKPOINT_UPLOAD_URL" \
  --result-upload-url "$WEAR_RESULT_UPLOAD_URL" \
  --overlay-upload-url "$WEAR_OVERLAY_UPLOAD_URL" \
  --epochs 240 \
  --min-epochs 70 \
  --patience 45 \
  --batch-size 288 \
  --learning-rate 0.0003 \
  --torch-threads 20 \
  --decode-workers 20 \
  --max-wall-minutes 120

if ! python -c 'import onnx; print({"onnx": onnx.__version__})'; then
  python -m pip install --quiet 'onnx>=1.16,<2'
fi

env PYTHONPATH="$WORK_ROOT/code" python "$WORK_ROOT/code/export_waist_hip_v7_2_onnx.py" \
  --checkpoint "$WORK_ROOT/output/best-checkpoint.pt" \
  --final-result "$WORK_ROOT/output/final-result.json" \
  --validation-overlay "$WORK_ROOT/output/validation-overlay.jpg" \
  --output-dir "$WORK_ROOT/export" \
  --model-version "wear3d-waist-hips-v7-2-${WEAR_JOB_ID}"

put_file "$WORK_ROOT/export/model.onnx" application/octet-stream "$WEAR_ONNX_UPLOAD_URL"
put_file "$WORK_ROOT/export/runtime.json" application/json "$WEAR_RUNTIME_UPLOAD_URL"
tar --create --gzip --file "$WORK_ROOT/artifact-bundle.tar.gz" \
  --directory "$WORK_ROOT" output overfit export
put_file "$WORK_ROOT/artifact-bundle.tar.gz" application/gzip "$WEAR_ARTIFACT_UPLOAD_URL"
upload_log
echo 'WEAR_V7_2_COMPLETE_AND_READY_TO_STOP'
