# Aiad ONNX Test Lab integration

Private diagnostic integration dated 2026-08-31. No training or RunPod changes.

For the complete uploaded-code audit and the distinction between Aiad's learned outputs, his guide helper and our comparisons, see [Aiad S3 handoff audit](aiad-s3-handoff-audit.md).

## Entry points

- `/try-on-test/wear-photo-test`: Aiad normal-photo tab, saved photo profiles and uploads.
- `/try-on-test/wear-photo-test?cohort=448`: frozen 448-person WEAR integration report and individual results.
- Older model tabs remain separate. Their pre-existing missing artifacts are not replaced by Aiad's model.

## Frozen handoff

`uploads/aiad/wear-student-2d-v1/onnx/wear_student_ensemble.onnx` from the existing private collaborator bucket.

SHA-256: `71420375dc581b79fd93feffceb6dd7e81ab6bd66d0991ddc31e558dc2de8a10`.

The 453,294,167-byte graph contains four ConvNeXt Tiny ensemble members. It is checked before loading, runs on CPU and is not modified. The reference fixture passes on both the Mac and staging host for all four output tensors. Maximum tape difference versus the supplied rounded reference is below 0.005 cm; this proves integration parity, not measurement accuracy.

## Normal-photo path

1. Saved front photo or upload, height, weight and gender. Existing tape checks are comparison-only.
2. Default segmentation: Aiad's `rembg/u2net_human_seg` (original weights), largest 8-connected component, hole filling and 5×5 closing. Phone EXIF rotation is honoured. MediaPipe remains an explicitly labelled alternative, not a silent replacement.
3. The binary silhouette is framed exactly to 192×256 using Aiad's scaling/padding rules and nearest-neighbour sampling. The five profile values follow the supplied normalizations.
4. Frozen ONNX produces six tape predictions, six uncertainty values, six width/depth pairs and ten latent shape coefficients. Male under-bust **tape** is unavailable by his package's rule; all six width/depth pairs and guides are retained.
5. Aiad's separate `row_endpoints` algorithm supplies **all six** torso-edge guides at fixed height fractions, including shoulder. These are **not learned anatomical landmarks**. Original canonical pixels, guide heights, image widths and full-row extents are retained separately from the ONNX width/depth head.
6. The full-screen editor puts the large photo left and controls right. Mouse dragging moves a guide; dragging either invisible endpoint changes its span. Width/depth previews update during dragging. Manual cm depth and depth/width ratio are supported. There is no Apply step. Raw tape never changes. "Restore Aiad original" clears manual edits and optional camera mode without modifying the model.
7. Optional Apple Vision / Depth Pro comparison uses the displayed lines. Width can change; hidden depth is scaled with the model's depth/width ratio. This does **not** rectify the silhouette or recompute tape. Raw values remain available.

Width/depth ellipses are illustrative, not decoded 3D contours. The handoff contains no fitted PCA decoder for reconstructing its ten-value body representation. Model uncertainty is not a guaranteed accuracy bound.

## 448-person path

The unchanged existing index supplies exactly 448 unique test-role people and their front-50 render paths. Input is the thresholded render silhouette plus profile. Teacher geometry, recorded tape and line positions do not enter inference. Tape labels are read only after inference for scoring; mesh perimeter is not substituted for tape.

`scripts/local-ml/evaluate-aiad-448.ts` generated one report with exclusive-create semantics at `.local-ml/aiad-wear-student-2d-v1/benchmark-448.json`. It does not overwrite an existing report. All 448 completed with zero inference failures. There are 447 usable waist labels and 447 usable hip labels; missing labels do not remove people from the cohort.

| Measure | Scored | MAE cm | P95 cm | Worst cm | Within 1.27 cm |
| --- | ---: | ---: | ---: | ---: | ---: |
| Waist | 447 | 2.695 | 6.404 | 18.796 | 31.99% |
| Hips | 447 | 1.535 | 4.081 | 11.610 | 54.81% |
| Chest | 448 | 2.533 | 6.705 | 13.653 | 31.47% |
| Under-bust | 224 | 2.000 | 4.867 | 14.127 | 37.05% |
| Neck | 448 | 1.573 | 4.013 | 11.399 | 50.22% |
| Thigh | 448 | 1.587 | 3.915 | 11.880 | 51.34% |

Preprocessing ID: `threshold127-largest8-fill4-close5-aiad-framing`. This integration run uses the existing app renders and is not an exact reproduction of Aiad's differently segmented benchmark. It is not a normal-photo benchmark. The 487-person BodyM benchmark is a different dataset. The WEAR cohort was inspected in earlier project work, so it is not a new pristine blind test.

The preserved report predates the exact NPZ framing and OpenCV reciprocal-order corrections. Current inference identifies itself as `aiad-framing-npz-exact-opencv-v2`; future explicitly requested reports receive that revision in their preprocessing ID. The UI labels the earlier aggregate as historical. Clicking one person performs a current-adapter diagnostic but does not overwrite the original report or saved per-person rows. No full-cohort rerun was performed for the editor/source-audit update.

Apple / Depth Pro are absent from this benchmark. Display-only line edits never change its saved predictions or scores. There is no tuning or calibration loop.

## Private Mac camera worker

Apple Vision cannot execute on the Linux staging host. `scripts/local-ml/aiad-camera-worker.ts` reuses the existing three camera routes on macOS. It requires a private bearer credential and listens only on `127.0.0.1:19031`. The staging route is site-authenticated and forwards only those three actions through an SSH reverse tunnel. It refuses held-out scan IDs and arbitrary actions. No credentials are sent to the browser.

Initialize the credential once (never print or commit it):

```sh
node_modules/.bin/tsx scripts/local-ml/aiad-camera-worker.ts --init-key
node_modules/.bin/tsx scripts/local-ml/aiad-camera-worker.ts
```

The shared credential is stored in a mode-600 file outside source control. `WEAR_AIAD_CAMERA_TOKEN_FILE` can override its location. The default worker URL is loopback-only; `WEAR_AIAD_CAMERA_URL` cannot point at a public host.

```sh
ssh -NT -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 127.0.0.1:19031:127.0.0.1:19031 primestyleai-droplet
```

The Mac must stay awake, connected and have its existing Depth Pro environment/weights available. On this workstation the Depth Pro environment depends on the connected PrimeStorage USB volume. No public worker port or automatic startup is installed. Camera failures keep the raw model output visible. Depth Pro has a bounded runtime and an Apple-only fallback. Native math threads are limited to two in the private worker's child processes, leaving other services unchanged.

## Runtime / checks

- Model directory override: `WEAR_AIAD_MODEL_DIR`.
- Segmentation venv override: `WEAR_AIAD_SEGMENT_RUNTIME`; model weights live below its `models/` directory.
- Large local model/runtime files live on the external PrimeStorage volume, not in the repository.
- Server inference artifacts are under `.local-ml/`, not publicly served static files.
- `scripts/local-ml/verify-aiad-runtime.ts`: supplied male/female fixture parity for all output heads.
- `scripts/local-ml/verify-aiad-guide-parity.ts`: checksum-pinned original Python compared to our adapter. 102 masks and 612 full helper outputs match exactly, including cleaned/canonical pixels and Python rounding. No training/checkpoint code is executed.
- `app/try-on-test/wear-photo-test/aiadPreprocessing.test.ts`: normalization, exact framing, mask cleanup, coverage gates and torso-run extraction.
- `app/try-on-test/wear-photo-test/WearV6PhotoLab.aiad.test.tsx`: atomic photo/profile switching, ignoring stale image loads, and retaining the Aiad tab for uploads. Together with preprocessing, workbench geometry, the serialized camera queue and full-screen editor tests, 29 checks pass.
- TypeScript and scoped ESLint checks cover the new handlers, worker and UI.
- Browser checks reproduce Aiad's saved-photo results for Shahnaz 2 (waist 102.33 cm, hips 111.52 cm) and Delaram (waist 75.88 cm, hips 103.93 cm), exercise mouse dragging and endpoint resizing, and preserve raw tape after applying edits.
- The Mac Apple + Depth Pro path completed for Shahnaz 2 and Delaram, including valid waist/hip depth samples. Delaram also completed through the authenticated staging proxy: waist width 29.2 → 29.9 cm, hip width 37.5 → 36.8 cm, with raw tape unchanged at 75.88 / 103.93 cm. These are operational checks, not evidence that the adjusted widths are more accurate.
- Live staging checks are required after each build activation; a passing local test alone is not a deployment claim.

## Full-screen/source-audit staging activation

The current test build is `.next-aiad-editor-20260831-r2`, build ID `G6KIuwmOLdmEx8I3jRBo3`, activated on 2026-08-31 in **only** PM2 `prime-products-test`. The previous `.next-aiad-20260831-fix` remains available for rollback. An initial 1280 MB JavaScript-heap attempt failed without activation. The clean retry used a 1536 MB heap, low-memory build mode, one page worker and a 2880 MB systemd memory cap; compilation, TypeScript, all 181 static pages and tracing completed successfully. Next-generated `tsconfig.json` additions were checked and restored from the pre-build copy. Other PM2 process IDs and stopped states were unchanged across activation.

Live authenticated verification passed for:

- Shahnaz 2's original rembg path: six guide kinds, zero guide dots, tape 102.33 / 111.52 cm, and a 1920×902 full-screen dialog.
- Switching to Delaram cleared the prior result and loaded her correct 168 cm / 70.8 kg profile. Her fresh staging result was 75.88 / 103.93 cm tape, with original mode restored and all six body-row controls present.
- A real mouse endpoint drag: waist width 35.6 → 43.8 cm immediately; entering 29 cm depth updated the preview without changing either tape prediction. Moving the guide vertically changed its photo position from 41.2% to 44.2% without changing its span. Restore returned the original output.
- Apple + Depth Pro through the private Mac proxy: 5/5 valid sampled rows, waist width 31.2 cm and hips width 34.7 cm, with raw tape unchanged. Switching to Apple Vision retained manual depth. Large neck/under-bust changes remain visible review warnings, not accepted accuracy claims.
- The preserved 448 report, its historical-preprocessing banner and worst-hip sorting. One current-adapter diagnostic for `IT-4028-A` completed and displayed all six original guide records; no full-cohort rerun was performed.
- The supplied male/female ONNX fixture on Linux, checking all four heads: maximum tape differences 0.004972 / 0.003009 cm from the rounded reference.
- HTTP 401 for unauthenticated model access and HTTP 200 for `/shop`. The three loaded CSS assets and webpack bootstrap matched the active build's SHA-256s. All 22 staged source/test/document files matched local copies before activation; this deployment note was then updated separately.

The ONNX checksum remains `71420375dc581b79fd93feffceb6dd7e81ab6bd66d0991ddc31e558dc2de8a10`. The saved report checksum remains `e86f3ee696ec2a12a9d9170fc74672b80c62f983658f04646a88b15d0a93b519`. No weights, teachers, labels or training splits were edited. The full-screen mouse checks are desktop checks, not a mobile-device acceptance claim. Native file-picker upload remains covered by the component regression test, not a completed browser picker test.

## Prior staging activation and live verification

The earlier build `.next-aiad-20260831-fix` completed on 2026-08-31 and was activated only in PM2 `prime-products-test`; it is now retained for rollback. An attempted cached rebuild exceeded its memory limit; retrying without the copied cache and with a smaller Node heap passed compilation, TypeScript, static generation and tracing. Other PM2 process IDs remained unchanged. Both the original `.next-shop-0403ce1` and first Aiad build are retained for rollback.

Post-activation checks passed: photo switching followed immediately by Run completes with Delaram's correct profile and reference outputs; the live Apple/Depth Pro comparison completes; the 448 report still shows 448/448 with zero failures and unchanged scores; worst-waist/hip sorting works; unauthenticated model access remains HTTP 401; `/shop` remains HTTP 200. All 18 runtime source files checked match their local SHA-256 hashes. Uploaded-photo routing is covered by the component regression test, not a completed native file-picker browser test.

This is a test integration, not an SDK release or a half-inch accuracy claim. No message was sent to Slack.
