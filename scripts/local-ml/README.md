# Local front-sizing ML

This local-only experiment is built in two honest stages.

1. `wear-1d-row-prior-v1` is available now. It predicts only the vertical Y position of natural waist, an abdominal-extension proxy for trouser waist, and buttock/hip height. MediaPipe supplies temporary visible-mask endpoints. Circumference is disabled because 1D data has no photos or body surface.
2. `front-multitask-v1` is the future photo + 3D model. It will learn visual endpoints, front-to-back depth ratios, and confidence. Apple still owns the separate pixel-to-centimetre scale check.

Neither stage changes Manual Coordinate saved presets.

## Train the WEAR 1D row prior

The licensed WEAR archive must be extracted locally to `.local-ml/wear-1d`. Use a Python runtime with NumPy installed, then run:

```bash
python3 scripts/local-ml/train_wear_row_prior.py \
  --wear-root .local-ml/wear-1d \
  --output app/try-on-test/sizing-lab/models/wear-1d-row-prior-v1.json \
  --report .local-ml/reports/wear-1d-row-prior-v1.json
```

The trainer excludes child/youth and duplicate derived survey folders, applies physical plausibility filters, and validates by held-out survey where the data supports it. The trouser proxy currently comes from one female survey, so male predictions are marked as extrapolation in the UI.

Only the small aggregate coefficient checkpoint is committed for the protected test lab. Raw licensed WEAR files, reports, virtual environments, and passwords remain under ignored `.local-ml/` paths and must never be committed.

## Dataset rule

Every `subject_id` must have exactly one role: `train`, `validation`, or `test`. If Shane 2 or Nadia is moved into training, they cannot remain an independent test.

Manual photo labels teach line placement. Future 3D scan renders provide line placement plus true front-to-back depth ratios. Each 3D subject should be rendered with multiple camera heights, focal lengths, distances, tilts, backgrounds, and clothing/silhouette conditions while retaining one subject-level split.

Copy `manifest.example.jsonl` to `.local-ml/data/manifest.jsonl` and replace every example path, landmark, row, and depth value with reviewed evidence. Every record needs all 33 MediaPipe landmarks. A manual photo may omit `depth_ratio`; a 3D-derived record should include it. Include rejected or unusable photos with `accepted: false` so confidence can learn when to reject.

The example file is schema guidance only; it is not training data.

## Train the future photo + 3D model

```bash
python3 -m venv .local-ml/venv
.local-ml/venv/bin/pip install -r scripts/local-ml/requirements.txt
.local-ml/venv/bin/python scripts/local-ml/train_front_multitask.py \
  --manifest .local-ml/data/manifest.jsonl \
  --output .local-ml/checkpoints/front-multitask-v1.onnx \
  --pretrained
```

The Local ML sizing-lab mode detects the most complete available checkpoint automatically and performs inference locally.
