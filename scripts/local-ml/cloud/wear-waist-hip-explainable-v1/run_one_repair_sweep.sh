#!/usr/bin/env bash
set -Eeuo pipefail

scan_id="${1:?scan id is required}"
row_name="${2:?waist or hips is required}"
project_root="${WEAR_PROJECT_ROOT:?WEAR_PROJECT_ROOT is required}"
source_root="${WEAR_REPAIR_SOURCE_ROOT:?WEAR_REPAIR_SOURCE_ROOT is required}"
output_root="${WEAR_REPAIR_OUTPUT_ROOT:?WEAR_REPAIR_OUTPUT_ROOT is required}"
manifest="$project_root/outputs/01a06248-b50b-76a2-84a4-42c427890703/model-training-walkthrough/wear-source-manifest.jsonl"
log_root="$output_root/logs"
mkdir -p "$log_root"
slug="$(printf '%s-%s' "$scan_id" "$row_name" | tr '[:upper:]' '[:lower:]')"

if blender --background \
  --python "$project_root/scripts/local-ml/diagnose_wear_ply_plane_sweep.py" -- \
  --scan-id "$scan_id" \
  --row "$row_name" \
  --radius-mm 60 \
  --step-mm 30 \
  --manifest "$manifest" \
  --source-root "$source_root" \
  --output-root "$output_root" \
  >"$log_root/$slug.log" 2>&1 \
  && [[ -s "$output_root/$slug.json" ]]
then
  printf 'passed\t%s\t%s\n' "$scan_id" "$row_name"
else
  printf 'failed\t%s\t%s\n' "$scan_id" "$row_name"
fi
