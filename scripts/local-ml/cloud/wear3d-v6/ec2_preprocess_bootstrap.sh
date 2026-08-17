#!/usr/bin/env bash
set -Eeuo pipefail

: "${WEAR_BUCKET:?WEAR_BUCKET is required}"
: "${WEAR_PIPELINE_ID:?WEAR_PIPELINE_ID is required}"
: "${WEAR_STATUS_KEY:?WEAR_STATUS_KEY is required}"
: "${WEAR_CODE_PREFIX:?WEAR_CODE_PREFIX is required}"
: "${WEAR_SOURCE_MANIFEST_KEY:?WEAR_SOURCE_MANIFEST_KEY is required}"
: "${WEAR_SHUTDOWN_MINUTES:=480}"

case "$WEAR_SHUTDOWN_MINUTES" in
  ''|*[!0-9]*)
    echo "WEAR_SHUTDOWN_MINUTES must be a positive integer" >&2
    exit 2
    ;;
esac
if (( WEAR_SHUTDOWN_MINUTES < 1 )); then
  echo "WEAR_SHUTDOWN_MINUTES must be at least 1" >&2
  exit 2
fi

install -d -m 0750 /opt/primestyle/code /opt/primestyle/v6 /opt/primestyle/wear3d
exec > >(tee -a /var/log/primestyle-wear3d-v6-preprocess.log) 2>&1

# Hard safety cap. Instance-initiated shutdown is configured to terminate.
# The full renderer receives 480 minutes; targeted recovery receives 120.
# The launcher's advertised runtime and the instance's real safety cap must
# always agree so a recovery worker cannot accidentally bill for eight hours.
shutdown -h "+${WEAR_SHUTDOWN_MINUTES}"

finish() {
  exit_code=$?
  trap - EXIT
  set +e
  if [ "$exit_code" -ne 0 ]; then
    python3 - "$exit_code" <<'PY'
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
    payload.update({
        "state": "failed",
        "currentStageLabel": "CPU preprocessing stopped safely",
        "detail": f"Virginia renderer exited with code {sys.argv[1]}. No GPU training was started; inspect the preserved log before retrying.",
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
  aws s3 cp /var/log/primestyle-wear3d-v6-preprocess.log \
    "s3://${WEAR_BUCKET}/reports/${WEAR_PIPELINE_ID}/ec2-preprocess.log" \
    --sse AES256 --only-show-errors
  if [[ -f /opt/primestyle/v6/audit/audit-summary.json ]]; then
    aws s3 cp /opt/primestyle/v6/audit/audit-summary.json \
      "s3://${WEAR_BUCKET}/reports/${WEAR_PIPELINE_ID}/label-audit.json" \
      --sse AES256 --only-show-errors
  fi
  if [[ -f /opt/primestyle/v6/audit/label-contact-sheet.jpg ]]; then
    aws s3 cp /opt/primestyle/v6/audit/label-contact-sheet.jpg \
      "s3://${WEAR_BUCKET}/reports/${WEAR_PIPELINE_ID}/label-contact-sheet.jpg" \
      --sse AES256 --only-show-errors
  fi
  shutdown -h now
  exit "$exit_code"
}
trap finish EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  awscli blender ca-certificates curl jq python3-boto3 python3-numpy python3-pil \
  xauth xvfb
apt-get clean

aws s3 cp "s3://${WEAR_BUCKET}/${WEAR_CODE_PREFIX%/}/" /opt/primestyle/code/ \
  --recursive --only-show-errors
chmod +x /opt/primestyle/code/*.py

python3 -c 'import boto3, numpy, PIL; print({"numpy": numpy.__version__, "pillow": PIL.__version__})'
blender --version

# Ubuntu's Blender 3 EEVEE renderer still needs an X/GL context even when
# Blender itself is started with --background. Prove that the software GL
# display works before downloading and processing the complete WEAR vault.
export LIBGL_ALWAYS_SOFTWARE=1
xvfb-run --auto-servernum --server-args="-screen 0 1280x1024x24 -nolisten tcp" \
  blender --background --factory-startup --python-expr \
  "import bpy; scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=8; scene.render.resolution_y=8; scene.render.resolution_percentage=100; bpy.ops.render.render(); print('WEAR_HEADLESS_EEVEE_OK')"

recovery_args=()
if [[ "${WEAR_RECOVERY:-0}" == "1" ]]; then
  recovery_args+=(--recovery)
fi

python3 /opt/primestyle/code/run_v6_preprocess.py \
  --bucket "$WEAR_BUCKET" \
  --pipeline-id "$WEAR_PIPELINE_ID" \
  --status-key "$WEAR_STATUS_KEY" \
  --source-manifest-key "$WEAR_SOURCE_MANIFEST_KEY" \
  --workers 16 \
  --chunk-size 4 \
  --views-per-subject 9 \
  --render-retries 1 \
  "${recovery_args[@]}"
