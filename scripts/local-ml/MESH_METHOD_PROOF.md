# Private 2D MHR method proof

This framework is private, CPU-only, and cannot publish or mark a method
`Passed`. The held-out validator is the only quality judge.

## Audit dependencies without running a model

```bash
.local-ml/venvs/sam-3d-body/bin/python \
  scripts/local-ml/run_mesh_method_evaluation.py
```

The report is written to:

```text
.local-ml/wear-mesh-proof/method-run-report.json
```

## Run the locally available CPU candidates

```bash
.local-ml/venvs/sam-3d-body/bin/python \
  scripts/local-ml/run_mesh_method_evaluation.py \
  --execute \
  --photo both
```

The installed ViT-H checkpoint accepts the internal mask prompt and declares a
maximum of two keypoint clicks. The prompted adapter respects that limit. It
does not feed all 70 points, apply RBF, snap vertices to a silhouette, use
depth, or read measurements.

## Run honest validation

```bash
.local-ml/venvs/sam-3d-body/bin/python \
  scripts/local-ml/honest_mesh_validation.py \
  --manifest .local-ml/wear-mesh-proof/evaluation-manifest.json \
  --output .local-ml/wear-mesh-proof/evaluation-report.json
```

`evaluation-manifest.json` points at the method-run report and separately
declares the reference evidence. The method-run report alone is not a valid
quality-proof manifest.

Unavailable methods stay `Blocked` with exact dependency reasons. The legacy
Meta + Sapiens RBF method is always `Rejected`. WEAR fallback training remains
blocked until fresh GPU approval is given after all pretrained candidates fail.
