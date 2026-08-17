# WEAR 3D v6r5 — private Test Lab candidate

This pipeline is intentionally separate from the existing v5 checkpoint.
It keeps v5 available as a baseline while rebuilding the training evidence
from the standing WEAR meshes.

## Product contract

- One standing front photo.
- Height, weight, and gender are known.
- Apple Vision supplies shoulder/hip anchors before mask-free WEAR edge
  inference. A row-specific Apple/camera scale then converts each selected
  photo span to cm.
- A user may keep the predicted row and correct only its left/right endpoints.
- The primary circumference result is learned directly from WEAR labels. It is
  never produced by an ellipse or superellipse calculator.

## Data contract

For every subject, preprocessing must preserve a subject-disjoint role and
produce several perspective views. Each accepted row contains:

- anatomical height and projected torso-only endpoints;
- row-specific camera scale and corrected visible width;
- raw mesh breadth and depth;
- a closed, resampled mesh cross-section;
- mesh contour perimeter and the independent WEAR tape measurement;
- explicit quality and reconstruction evidence.

Chest, waist, and maximum-hip heights are recorded WEAR fields. Neck uses a
tilted 3D plane through clavicale, suprasternale, and cervicale so it follows
the documented sloped neck-base chain instead of pretending the tape was
horizontal. WEAR supplies under-bust circumference but no direct under-bust
height, so Substernale is the anatomical height anchor; the disclosed 20%
chest-to-waist fallback is used only when that landmark is unavailable.

`tape_calibrated_depth_mm` is forbidden as a v6 target. Recorded tape values
may supervise direct circumference, but they may not be inverted through an
ellipse to manufacture depth.

`render_wear3d_multiview.py` creates camera-aware RGB views and labels from the
standing PLY/LND/XLS records. `audit_wear3d_labels_cloud.py` is the canonical
full-data gate: it checks geometry, 32-point cross-section coverage, raw-depth
coverage, torso-only edge evidence, protocol-valid mesh/tape comparisons, and
subject splits. It then creates a diverse contact sheet whose content hash must
be explicitly approved before GPU training. `audit_wear3d_labels.mjs` is only a small local preview
check and cannot authorize a training launch.

The bounded Virginia CPU stage uses the largest instance allowed by the
current Standard On-Demand quota: one `c7i.8xlarge` with 16 isolated Blender
workers, four-person checkpoint shards, encrypted temporary storage, and an
eight-hour self-termination cap. A targeted recovery worker reuses clean S3
shards and has a separate two-hour self-termination cap.

The generated body mask is training-only. It randomizes backgrounds and paints
fitted top/bottom colors and textures inside the unchanged WEAR silhouette. It
is never a runtime input and never supplies a row, edge, depth, or circumference
label; those labels come from the projected 3D contour and WEAR records.

The customer flow is standing-only. The eight fields identified by WEAR's
CAESAR Volume II seated protocol are excluded from supervision: acromial
height sitting, buttock-knee length, elbow height sitting, eye height sitting,
hip breadth sitting, knee height sitting, sitting height, and maximum thigh
circumference sitting. Standing scanner-derived knee heights and the other
standing measurements remain targets.

Six standing records contain a real maximum-hip tape value but omit that
tape's height. Their circumference remains a training target; only the
ambiguous hip row edge/depth/shape is masked instead of fabricating a plane.

Sparse landmark files are oriented from all available named bilateral WEAR
pairs, not only one shoulder/pelvis trio. If a posterior anchor is absent, the
front axis is resolved from the available anterior landmarks relative to the
raw mesh centre. This keeps the orientation source-grounded and avoids an
identity/scanner-axis guess.

A small source subset places the Substernale under-bust anchor above or within
10 mm of the recorded chest plane, and one source record places its waist plane below its
maximum-hip plane. Those inverted geometry rows are explicitly tagged and
masked for edge/depth/shape supervision; their independent WEAR tape values
remain direct circumference targets. The strict audit rejects every other mask
reason, requires the tape target to be preserved, and checks the pre-audited
full-manifest exception range by unique-subject count.

Every core row has a separate measurement head. It receives the mask-free RGB
body-shape embedding, Apple pose, profile, and only that row's corrected width;
chest cannot read hip width, and waist cannot read chest width. This lets the
model learn the photo-to-WEAR depth relationship instead of reducing it to a
profile/width cohort mapping. Core depth, shape, and circumference use only the
exact front-50 view for each person. The other eight views still train
non-core landmarks, segments, sleeves, inseams, and all other eligible standing
outputs without changing the core front-photo rows. Small camera-scale and endpoint jitter represents normal
Apple/manual-edit error.

Every core row also has a separate RGB edge head. Apple Vision is run on the
exact approved front RGB teacher for all 4,326 standing people, so the model
learns row height, span, and centre in the same Apple shoulder/hip coordinate
frame used on an uploaded photo. There is no guessed WEAR-landmark-to-Apple
correction formula. Core edge supervision is front-only and has its own Apple
pose projection; angled-view WEAR pose features cannot overwrite it. Audited
front-view WEAR priors bound all three values so a torso edge cannot silently
jump onto an arm or a different anatomical level. Early
ImageNet blocks remain frozen and later blocks use a lower learning rate to
preserve real-photo features while learning WEAR.

## Proof gates

1. Full S3 vault inventory matches the protected upload.
2. Only neutral standing-A scans enter training.
3. Every subject belongs to exactly one train/validation/test role.
4. A body-diverse visual contact sheet and numerical label audit pass before
   GPU training, including chest/under-bust arm-exclusion consistency and raw
   depth coverage for every core torso row. Both the launcher and GPU worker
   require exactly 4,326 subjects / 38,934 successful views with zero failed
   views; the worker recomputes the manifest SHA-256 and matches it to both the
   numerical audit and the approved contact-sheet review before downloading
   training images.
   A second hash-locked gate requires 4,326/4,326 accepted Apple Vision
   shoulder/hip detections on those exact front teachers plus a diverse
   Apple-versus-WEAR overlay contact sheet.
5. Every core circumference, raw-mesh depth, and pose-aware RGB edge passes its strict
   error limit and beats the train-mean baseline. At least 75% of all eligible
   row, landmark, segment, shape, depth, and standing-measurement targets also
   beat that baseline on unseen WEAR subjects.
6. Real-photo results are scored separately and may not read saved answers.
7. The GPU instance terminates after artifacts are saved.

After the synthetic gates pass, install the candidate for Test Lab with the
same Python environment used for the ONNX smoke test. The installer also
accepts exactly one diagnostic exception: an official synthetic failure may
run privately when a separate uploaded review hash proves that only the
under-bust shoulder/hip-ratio target tied its baseline within `0.001`, still
passed its absolute hard limit, and every other hard check passed. This does
not convert the official result to a pass.

```bash
.local-ml/venv-wear-v6/bin/python \
  scripts/local-ml/cloud/wear3d-v6/install_v6_candidate.py \
  --project-root "$PWD"
```

The installer checks the single-file ONNX package, hashes every artifact and
the diagnostic review when present, and keeps `releaseAuthorized=false`,
`publishAuthorized=false`, `deployAuthorized=false`, and `sdkReady=false`.
This run is private: passing Shane/Shahnaz/Negar and the paired real-photo
checks does not publish, deploy, or create an SDK release.

The private acceptance gate remains fail-closed: Shane 2, Shahnaz 2, and Negar
2 must use mask-free inference, Apple camera geometry, manual visible-edge
review, and answer-free predictions. At least eight independent tape checks
are required, no single error may exceed 5 cm, and mean real-photo error may
not exceed 4 cm. Even a full pass remains Test Lab-only.

Run `run_v6_real_photo_suite.py` after the candidate is installed. It calls the
same local Test Lab RGB and Apple APIs, withholds saved tape answers until both
model passes are complete, and generates a three-person contact sheet. Its edge
checks and `visual_review_complete` flag are false on purpose, so it cannot pass
accidentally. Set them true only after reviewing the generated WEAR lines.

```bash
.local-ml/venv-wear-v6/bin/python \
  scripts/local-ml/cloud/wear3d-v6/run_v6_real_photo_suite.py \
  --project-root "$PWD"
```

After reviewing the three-panel contact sheet, record the boolean edge checks
in a separate review JSON and run the read-only private gate:

```bash
.local-ml/venv-wear-v6/bin/python \
  scripts/local-ml/cloud/wear3d-v6/validate_v6_private_candidate.py \
  --project-root "$PWD" \
  --report .local-ml/reports/wear3d-v6-real-photo-pending.json \
  --visual-review .local-ml/reports/wear3d-v6r5-visual-review.json
```

This creates an immutable private report and contact sheet under
`.local-ml/reports/`. It does not create an SDK bundle and does not publish or
deploy anything.

## 2026-08-16 completed private result

- Training completed on all `4,326` approved standing people and `38,934` RGB
  views; the Virginia GPU terminated after upload.
- Official synthetic pass is false. The sole failure was
  `row.underbust.y_shoulder_hip_ratio`: `0.02937` MAE versus `0.02925` baseline,
  a `0.00012` gap while the `0.06` absolute limit passed.
- The hash-locked diagnostic ran Shane 2, Shahnaz 2, and Negar 2 without saved
  answers, a runtime mask, or a circumference formula.
- The real-photo gate failed: `6.0722 cm` mean error, `13.40 cm` maximum error,
  and Shahnaz/Shane hip rows failed the tight-edge visual review.
- The candidate remains private and blocked. It was not released, published,
  deployed, or promoted to an SDK.
