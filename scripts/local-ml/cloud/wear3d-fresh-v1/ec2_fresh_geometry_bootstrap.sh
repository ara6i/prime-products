#!/usr/bin/env bash
set -Eeuo pipefail

: "${WEAR_BUCKET:?WEAR_BUCKET is required}"
: "${WEAR_JOB_ID:?WEAR_JOB_ID is required}"
: "${WEAR_SHARD_ID:?WEAR_SHARD_ID is required}"
: "${WEAR_MANIFEST_KEY:?WEAR_MANIFEST_KEY is required}"
: "${WEAR_OUTPUT_PREFIX:?WEAR_OUTPUT_PREFIX is required}"
: "${WEAR_REPORT_PREFIX:?WEAR_REPORT_PREFIX is required}"
: "${WEAR_CODE_PREFIX:?WEAR_CODE_PREFIX is required}"
: "${WEAR_BLENDER_ARCHIVE_KEY:?WEAR_BLENDER_ARCHIVE_KEY is required}"
: "${WEAR_EXPECTED_SUBJECTS:?WEAR_EXPECTED_SUBJECTS is required}"
: "${WEAR_WORKERS:?WEAR_WORKERS is required}"
: "${WEAR_DOWNLOAD_WORKERS:?WEAR_DOWNLOAD_WORKERS is required}"
: "${WEAR_CHUNK_SIZE:=4}"
: "${WEAR_SHUTDOWN_MINUTES:=90}"

export AWS_DEFAULT_REGION="${AWS_REGION:-us-east-1}"
export AWS_REGION="$AWS_DEFAULT_REGION"
export AWS_PAGER=""
install -d -m 0750 /opt/primestyle/code /opt/primestyle/fresh-v1 /opt/primestyle/wear3d/raw
LOG_PATH="/var/log/primestyle-wear3d-fresh-${WEAR_SHARD_ID}.log"
exec > >(tee -a "$LOG_PATH") 2>&1

shutdown -h "+${WEAR_SHUTDOWN_MINUTES}"

finish() {
  exit_code=$?
  trap - EXIT
  set +e
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "$LOG_PATH" \
      "s3://${WEAR_BUCKET}/${WEAR_REPORT_PREFIX%/}/${WEAR_SHARD_ID}/bootstrap.log" \
      --sse AES256 --content-type text/plain --only-show-errors
  fi
  if [[ "$exit_code" -ne 0 ]] && python3 -c 'import boto3' >/dev/null 2>&1; then
    python3 - "$exit_code" <<'PY'
import json
import os
import sys
from datetime import datetime, timezone

import boto3

payload = {
    "schemaVersion": "wear3d-fresh-bootstrap-failure/v1",
    "jobId": os.environ["WEAR_JOB_ID"],
    "shardId": os.environ["WEAR_SHARD_ID"],
    "state": "failed",
    "exitCode": int(sys.argv[1]),
    "completedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    "v9ArtifactUsed": False,
}
boto3.client("s3").put_object(
    Bucket=os.environ["WEAR_BUCKET"],
    Key=f"{os.environ['WEAR_REPORT_PREFIX'].rstrip('/')}/{os.environ['WEAR_SHARD_ID']}/bootstrap-failure.json",
    Body=(json.dumps(payload, indent=2) + "\n").encode(),
    ContentType="application/json",
    ServerSideEncryption="AES256",
)
PY
  fi
  shutdown -h now
  exit "$exit_code"
}
trap finish EXIT

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  awscli ca-certificates python3-boto3 python3-numpy python3-pil \
  libdbus-1-3 libegl1 libgl1 libice6 libsm6 libwayland-client0 libx11-6 \
  libxfixes3 libxi6 libxkbcommon0 libxrender1 libxxf86vm1 xauth xvfb xz-utils
apt-get clean

BLENDER_ARCHIVE="/tmp/blender-5.2.0-linux-x64.tar.xz"
aws s3 cp "s3://${WEAR_BUCKET}/${WEAR_BLENDER_ARCHIVE_KEY}" "$BLENDER_ARCHIVE" --only-show-errors
echo "96f6c181a30f4950607839dc84d42a354b250d8a0231b098b59b7bc69c351c48  $BLENDER_ARCHIVE" | sha256sum --check --strict
tar --extract --xz --file "$BLENDER_ARCHIVE" --directory /opt
ln --symbolic --force /opt/blender-5.2.0-linux-x64/blender /usr/local/bin/blender
rm -f "$BLENDER_ARCHIVE"
hash -r

aws s3 cp "s3://${WEAR_BUCKET}/${WEAR_CODE_PREFIX%/}/" /opt/primestyle/code/ \
  --recursive --only-show-errors
chmod +x /opt/primestyle/code/*.py

python3 -c 'import boto3, numpy, PIL; print({"numpy": numpy.__version__, "pillow": PIL.__version__})'
blender --version | head -n 1 | grep --fixed-strings --line-regexp "Blender 5.2.0 LTS"

export LIBGL_ALWAYS_SOFTWARE=1
export LP_NUM_THREADS=2
xvfb-run --auto-servernum --server-args="-screen 0 1280x1024x24 -nolisten tcp" \
  blender --background --factory-startup --python-expr \
  "import bpy; scene=bpy.context.scene; engines={item.identifier for item in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items}; scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'; scene.render.resolution_x=8; scene.render.resolution_y=8; scene.render.resolution_percentage=100; bpy.ops.render.render(); print('WEAR_FRESH_HEADLESS_EEVEE_OK')"

python3 /opt/primestyle/code/run_fresh_geometry.py \
  --bucket "$WEAR_BUCKET" \
  --job-id "$WEAR_JOB_ID" \
  --shard-id "$WEAR_SHARD_ID" \
  --manifest-key "$WEAR_MANIFEST_KEY" \
  --output-prefix "$WEAR_OUTPUT_PREFIX" \
  --report-prefix "$WEAR_REPORT_PREFIX" \
  --expected-subjects "$WEAR_EXPECTED_SUBJECTS" \
  --workers "$WEAR_WORKERS" \
  --download-workers "$WEAR_DOWNLOAD_WORKERS" \
  --chunk-size "$WEAR_CHUNK_SIZE"
