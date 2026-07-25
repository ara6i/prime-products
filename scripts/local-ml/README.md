# Local front-sizing ML

This test-lab-only experiment is built in two honest stages.

1. `wear-1d-row-prior-v1` is available now. It predicts the vertical Y position of natural waist, an abdominal-extension proxy for trouser waist, and buttock/hip height. MediaPipe supplies temporary visible-mask endpoints. `wear-1d-direct-depth-cohorts-v1` then supplies a direct median of measured WEAR depth divided by measured WEAR breadth for people in the same fixed gender, 5 cm height, and 2 BMI box. The sizing lab reuses the Manual Coordinate Apple/Depth front-width scale and ellipse-circumference calculator. This stage has no depth regression and never loads a named person's saved answer.
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

Only the small aggregate coefficient checkpoint is committed for the protected test lab. It also contains anonymous height/BMI cohort medians (minimum five people per cohort) so the UI can translate old WEAR columns and show a nearby example without exposing a subject row. These examples are display-only and never calibrate a prediction. Raw licensed WEAR files, reports, virtual environments, and passwords remain under ignored `.local-ml/` paths and must never be committed.

## Build the direct WEAR depth groups

This is not model fitting. It groups real WEAR measurements into fixed, reusable boxes and stores the median and middle 80% of each group's measured depth-to-breadth ratios:

```bash
python3 scripts/local-ml/build_wear_depth_cohorts.py \
  --wear-root .local-ml/wear-1d \
  --output app/try-on-test/sizing-lab/models/wear-1d-direct-depth-cohorts-v1.json
```

Each group must contain at least five measured people. A person must match the exact gender, 5 cm height box, and 2 BMI box. If any body row has no safe group, Local ML blocks the circumference result; it does not fall back to a regression formula or a saved target answer. The trouser-waist row remains an abdomen/stomach proxy because WEAR does not contain the exact trouser waistband plane.

Only anonymous aggregate counts, medians, P10/P90 ratios, and survey names are committed. Raw subject rows and identifiers remain local and ignored.

## Meta SAM 3D Body shape experiment

This is a separate local/test-lab shape experiment. It reconstructs one 3D body mesh, uses the person mask and Apple camera intrinsics when available, and cuts the mesh at the three exact active red-row image heights. It never moves the red lines or receives a dataset circumference target.

Two selectable circumference paths use each row's same locked geometry:

- `Superellipse`: fits a shape exponent `n` to Meta's slice, then evaluates a superellipse using the exact red-line breadth and selected WEAR/manual depth.
- `Meta 3D contour`: scales Meta's reconstructed X/Z slice to that exact breadth and depth, then walks the resulting closed contour directly. It does not use an ellipse formula.

The `Apple + Meta + WEAR` superellipse option is stricter than either shape source alone. Apple Vision camera intrinsics align Meta's predicted body mesh; Apple does not directly predict the body-surface shape number. The app decodes Meta's body into a neutral pose, fits five very local nearby slices (`-2`, `-1`, `0`, `+1`, `+2` cm), rejects unstable slice outliers, and combines that median `n` with the independent survey-balanced WEAR 1D v2 shape prior using their measured uncertainty. A row remains unavailable if either primary source is missing. The shown confidence is evidence stability, not a probability that the circumference is correct. Dataset targets are judges only and never enter the fusion.

If a compatible cached Depth Pro map already exists, its front-surface curve can act as an optional cross-check. Low-confidence curves receive zero weight, and accepted curves are capped at 15% of the final `n`; they never override the Apple-aligned Meta and WEAR evidence.

Meta does not natively accept breadth/depth constraints. The app applies those constraints after reconstruction so the visual mesh and circumference calculator share the same explicit inputs. Raw Meta dimensions remain comparison evidence only.

The gated model files and official checkout stay ignored under:

```text
.local-ml/external/sam-3d-body
.local-ml/checkpoints/sam-3d-body-vith/model.ckpt
.local-ml/checkpoints/sam-3d-body-vith/assets/mhr_model.pt
.local-ml/venvs/sam-3d-body
```

After installing the official project into the Python 3.11 environment, apply the reproducible Apple-silicon patch:

```bash
.local-ml/venvs/sam-3d-body/bin/python \
  scripts/local-ml/patch_sam3d_apple_silicon.py
```

The image transformer runs on Apple MPS. Meta's released TorchScript MHR decoder performs a float64 operation that MPS cannot run, so only the final mesh-decoding step runs on CPU. This Mac's completed end-to-end proof is recorded by the ignored `.local-ml/checkpoints/sam-3d-body-vith/.mps-ready` marker used by the test-lab status endpoint.

### Local runtime stability

Depth Pro, Apple Vision 3D, and Meta share one local inference scheduler. Memory-heavy jobs run one at a time, identical in-flight requests share one job, and successful deterministic results stay in a small short-lived cache. This prevents the normal and full-screen panels from loading duplicate models and prevents Meta from competing with Depth Pro for Apple-silicon memory. The scheduler does not change images, coordinates, depth maps, mesh outputs, or measurement formulas.

Current limitations are displayed in the UI: clothing can change the inferred surface, Apple intrinsics can describe the camera but cannot reveal body shape hidden by a front photo, and a good mesh row on one holdout does not approve the other rows. Shane 2 and Nadia remain test-only judges and are never model inputs.

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
