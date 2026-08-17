# WEAR metric line assets

CPU-only generator:

```bash
.local-ml/venvs/sam-3d-body/bin/python \
  scripts/local-ml/build_wear_metric_line_assets.py
```

Canonical index:

```text
.local-ml/wear-mesh-overlay/metric-lines/index.json
```

## Truth boundary

- Geometry comes from each local real `PLY.GZ` surface.
- Orientation and anatomical anchors come from its paired local real `LND`.
- Profile and tape measurements come from the standing-A source manifest and
  remain independent comparisons. They are never used to solve the mesh.
- The WEAR archive has mixed PLY units. Every scan tests raw metres and raw
  millimetres against the LND surface positions and recorded stature, then
  records both scores and the selected unit.
- The browser front mesh uses only canonical X/Z. Depth is not used to create
  that overlay.
- The anatomical display frame is intentionally left-handed: X is subject
  right-to-left, Y is posterior-to-anterior, and Z is floor-to-head. The audit
  checks that anterior landmarks have positive Y relative to posterior ones.
- A circumference is certified only when the raw plane intersection supplies
  a central closed torso loop. A slab-hull fallback can still provide a
  diagnostic breadth/depth, but its circumference field stays `null`.

## Per-scan schema

- `provenance`: paths, source pointers and SHA-256 evidence.
- `scaleEvidence`: both unit hypotheses, LND nearest-surface errors and chosen
  factor.
- `canonicalFrame`: anatomical axes and floor alignment evidence.
- `canonicalProjectionAudit`: per-scan axis, scale and orientation checks. Yaw
  and translation are normalized; articulation is **not** normalized, so raw
  point-by-point mesh overlay is not valid for ranking.
- `frontProjection.outline`: browser-ready closed X/Z outline in centimetres.
- `frontProjection.mesh2d`: browser-ready decimated JSON with about 8,000
  projected triangles.
- `frontProjection.exactFullProjection`: compressed NPZ preserving the full
  PLY projection, depth and original triangles.
- `landmarks`: all source LND points in canonical 3D and front 2D centimetres.
- `rows`: neck, chest, under-bust, natural waist and maximum hips. Each row
  carries its WEAR plane, central torso contour, A-B breadth, C-D depth,
  independent recorded tape value, and quality flags.
- `measurements`: every numeric profile/extracted measurement. A-B or polyline
  geometry is included only when available landmarks support it; otherwise
  the value is preserved with an explicit unavailable reason.
- `leakageSafe2dDescriptor`: machine-readable front-2D matching features:
  - `defaultRankingFeatureVector` contains only central visible-outline widths
    at fixed fractions of known height;
  - `conditionalFeatureVector` contains the exact arm-excluded A-B X breadths
    at chest/under-bust/waist/hip WEAR planes, plus Acromion shoulder span. A
    query may use these only when it independently locates the same semantic
    row/landmark and the cross-model landmark bias is validated;
  - `auditOnlyUnsafeFeatureVector` contains articulation-dependent limb
    segments and the non-equivalent WEAR Trochanterion/Sapiens hip span. These
    are recorded for audit and must never be scored.

The matching vectors never contain Y/depth, circumference, tape, perimeter,
BMI, or weight as shape inputs. The aggregate contract and all nine scan
statuses are in:

```text
.local-ml/wear-mesh-overlay/metric-lines/leakage-safe-descriptor-audit.json
```

## Tests

```bash
.local-ml/venvs/sam-3d-body/bin/python -m unittest \
  scripts/local-ml/tests/test_wear_metric_line_assets.py -v
```

The tests cover LND parsing, mixed-unit detection, arm exclusion using the
central closed torso loop, browser mesh decimation, descriptor invariance to
arbitrary depth changes, unsafe-segment exclusion, one real local WEAR scan,
and checksum/leakage/orientation validation across all nine generated assets.
