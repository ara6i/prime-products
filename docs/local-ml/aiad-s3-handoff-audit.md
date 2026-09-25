# Aiad S3 handoff: source audit and integration boundary

Audit date: 2026-08-31. Read-only inspection of Aiad's uploaded release; no Slack message, training, GPU allocation, weight changes or dataset changes.

## Exact delivery reviewed

Private prefix: `s3://primestyleai-wear-aiad-921049726279-us-east-1/uploads/aiad/wear-student-2d-v1/`.

The prefix contained 12 objects: top-level README and checksums; `code/deployment.tar.gz`; ONNX model, preprocessing specification, input fixture and expected outputs; four PyTorch checkpoints; and frozen `deploy_bundle.npz`. No additional model release was found under `uploads/aiad/` at audit time.

- Deployment archive SHA-256: `646cf9bd992d5264a3f0437b3b4b6113582361f697d5195fdfefbfe5ecb8012a`.
- ONNX SHA-256: `71420375dc581b79fd93feffceb6dd7e81ab6bd66d0991ddc31e558dc2de8a10` (453,294,167 bytes).
- Preprocessing document SHA-256: `c0e532cb1bb0aa9fed831a69ae3145f8ae3695c4dda61fb51e97b7d56f7da85e`.

All Python source in the archive was read, along with both READMEs, requirements, export documentation and reference outputs. The NPZ was inspected with `allow_pickle=False`. The checkpoints were listed, not deserialized; inference uses the hash-verified ONNX. This is an audit of the **S3 inference handoff**, not a claim to have reproduced all training experiments or reviewed every file on his GitHub branch.

| Archive file | What it supplies |
| --- | --- |
| `wear_measure/constants.py` | Six tape names, female-only under-bust rule, six fixed-height guide levels, profile normalization and interval multiplier. |
| `wear_measure/frontend.py` | `rembg/u2net_human_seg`, largest component, hole filling, 5×5 closing, and OpenCV nearest-neighbour canonical framing. |
| `wear_measure/model.py` | Model/checkpoint architecture and loading: image/profile fusion with circumference, width/depth and shape heads. |
| `wear_measure/predict.py` | Public `Measurer`, profile vector, ensemble aggregation and calibrated uncertainty, plus **`_torso_run` and `row_endpoints`**. |
| `wear_measure/__init__.py` | Public package export. |
| `export_onnx.py` | Four-member ensemble export, full-width/depth conversion, uncertainties and ten shape coefficients. |
| `cli.py` | Photo/profile command-line interface. |
| `example.py` | Example inference, canonical silhouette and guide/width-depth visualization. |
| `verify.py` | Package verification against supplied cases. |

## What he actually provided

The neural-network graph takes only a **256×192 front silhouette plus five profile values** (normalized height, weight, BMI, female and male flags). It returns:

1. Six circumference predictions: waist, hips, chest, under-bust, neck and thigh.
2. Six estimated uncertainties. The public package marks male under-bust tape unavailable; this is intentional, not an integration error.
3. Width and inferred depth at six levels: neck, shoulder, chest, under-bust, waist and hips.
4. A ten-value shape code.

**He also provided automatic A/B lines and edges.** They are supplied by his Python helper, not by an ONNX landmark head. Saying “he did not deliver lines” would be incorrect.

`predict.py:76–111` calculates each guide at a fixed fraction of silhouette stature: neck .87, shoulder .82, chest .72, under-bust .66, waist .60 and hips .49. At that row it examines a five-pixel vertical band, chooses the foreground run crossing the body center (otherwise the widest run), and returns its left/right endpoints. Detached arms can be excluded; an arm touching the torso cannot be separated by this algorithm. Its own docstring explicitly says these are not detected tape-placement landmarks.

The original helper returns `row_px`, `row_cm_from_floor`, `A_px`, `B_px`, `width_image_cm` and `full_extent_cm`. These are preserved in the Aiad result's `aiad.levels[].endpoints`. Original canonical coordinates are also mapped back to the displayed photo by our adapter; that inverse mapping is UI integration, not another learned model output.

### Three values must not be conflated

- **Helper image width:** A/B pixel span scaled by supplied height. Assumes image-scale geometry; no camera-angle correction.
- **ONNX width/depth:** Independently predicted physical dimensions. These need not equal the helper's image-width estimate.
- **ONNX tape:** A direct learned circumference head. It is not obtained by walking our drawn ellipse, and edited A/B lines are not inputs to it.

## What is not present in this particular release

- No learned anatomical row-position/A/B endpoint output in its ONNX contract.
- No edited-line or manually entered depth input to the graph.
- No explicit camera-pose/lens output or perspective-rectification stage in the supplied photo pipeline.
- No fitted body decoder/basis/topology for turning the ten-value shape code into a full mesh. The NPZ contains normalizers, framing and band scales, not that decoder.
- It predicts six named tape quantities, not every anthropometric field in WEAR.

These are release-contract limits, not claims that Aiad never implemented anything else elsewhere. Likewise, the Python `Measurer.measure()` result currently does not include the shape code even though `export_onnx.py` does. Our integration uses the delivered ONNX's four output tensors, including shape code.

## Issues on our integration side, corrected

1. The original adapter showed only five guides. All **six original helper guides** are now retained, including shoulder. All six width/depth pairs are preserved even for male profiles; male under-bust tape remains unavailable.
2. Canonical framing initially used rounded constants from the prose specification. It now uses the exact NPZ values: `person_h=0.91015625`, `top=0.05078125`.
3. Algebraically rearranging nearest-neighbour sampling changed some boundary pixels versus OpenCV. The adapter now uses the same reciprocal/multiplication order. The concrete regression is resizing width 153 to 85, where a destination position may sample source pixel 26 instead of 27. See [OpenCV's original resizeNN implementation](https://github.com/opencv/opencv/blob/4.x/modules/imgproc/src/resize.cpp).
4. Original helper metadata is displayed separately from ONNX dimensions, and optional camera/manual previews cannot overwrite original tape, shape code or guide data. Displayed tape ratios are our arithmetic on his predictions, not extra learned outputs.

The artifact, teachers, training splits and existing 448-person report were not overwritten to make results look better. The saved 448 report retains its historical preprocessing ID and scores; it is not re-labelled as a new exact-preprocessing run.

## Reproducible evidence

```sh
node_modules/.bin/tsx scripts/local-ml/verify-aiad-guide-parity.ts
node_modules/.bin/tsx scripts/local-ml/verify-aiad-runtime.ts
```

The first check reads the checksum-pinned original Python functions directly from the archive. It compares the supplied reference mask, an exact-framing regression and 100 deterministic synthetic cases: **102 masks, 612 complete helper outputs, zero cleanup/canonical pixel differences and zero helper-field differences**. It does not import the checkpoint loader, execute training or write data. This is adapter parity, not proof of anatomical accuracy or all possible camera/segmentation cases.

The ONNX fixture check compares all four output tensors for supplied male/female profiles. The current implementation matches the supplied rounded references within their stated tolerances; tape differences are below 0.005 cm. This is not a real-body error measurement.

## Fair assessment

The delivery is a working inference package that includes silhouette extraction, learned measurements, uncertainty, shape coefficients, and automatic guide generation. Its fixed-height helper must be evaluated as supplied, including visibly incorrect placements, not silently replaced with our own anatomical estimates. Our optional Apple/Depth Pro and manual tools are labelled separately.

In the unedited, original-mode staging check on Shahnaz 2, the neck guide crossed the lower face and the shoulder guide appeared near the neck. These are observed guide-placement problems in the original-helper/photo mapping, not missing line code. Exact helper parity does not establish anatomical accuracy, and the integration does not secretly reposition these guides to make them appear better.

Aiad's uploaded README reports a 448-person tape evaluation with waist MAE 2.45 cm / worst 18.1 cm, and hips MAE 1.54 cm / worst 11.4 cm. Those are **his reported metrics**, not newly reproduced scores in this audit, and do not establish the requested worst-case 1.27 cm accuracy. The 487-person BodyM report is a different cohort. See `aiad-onnx-test-lab.md` for our separately labelled historical integration report.

No missing ONNX endpoint head should be described as “missing line code.” Conversely, successful integration and matching outputs should not be described as proof that the original anatomical guides or tape estimates meet the product goal.
