# WEAR front ranking, side choice, and size-guide validation

## Frozen data

- Catalog version: wear3d-standing-a-v3-20260813
- Source records: 4,326
- Usable people: 4,324
- NL-5419-A is excluded because gender, height, and weight are missing.
- NL-6289-A is excluded because gender, height, and weight are missing.
- Artifact version: wear-blender-canonical-v1-20260908
- Waist/hip chart snapshot: .local-ml/wear-side-selector/size-guide/catalog-20260908.json
- Snapshot SHA-256: 09d68ba3cd6a4d1619d77652d846c779e8868afb9ce6c3208d985121dd9b6e97
- Snapshot audit: 22,104 current display-ready US products inspected; 4,335 qualified numeric waist/hip products (1,408 female and 2,927 male).

## Ranking and reveal contract

The ranking request accepts one usable WEAR scan ID and excludes it from candidates. It returns an opaque run ID and ten exclusive rings. Ring 1 contains profile differences from 0 through 1. Ring N contains a maximum absolute height/weight difference greater than N-1 and at most N.

Each ring has six independent leaderboards: neck, chest, underbust, waist, hips, and overall torso. Overall uses the input's fixed available subset of chest, underbust, waist, and hips, requires at least two rows, and excludes a candidate from overall when that complete fixed row set is unavailable.

The ranking response contains profile and front-width metrics only. It contains no side depth, recorded tape, tape error, input-side URL, or input-side artifact permission.

Reveal must supply the run ID, active ring, mode, exact displayed leaderboard prefix, and one selected scan from that prefix. A changed order, mixed body, foreign scan, or expired/version-mismatched run is rejected. Only then are input side access, signed side-depth errors, signed recorded-tape errors, row coverage, MAE, worst-row error, and validation-only side/tape oracles returned.

## Size-guide contract

Only the selected complete WEAR analog is compared with the input's recorded waist/hip tape. The denominator is every same-gender frozen product where input tape produces a supported stocked reference size. Candidate missing, out-of-range, and no-decision results remain failures in that denominator.

The page reports exact same size, size up, size down, unordered change, no recommendation, denominator, nearest numeric chart boundary, and source numeric chart rows. All percentages are product-size agreement.

Manual mode runs 0 and plus/minus 1 through 7 cm plus a custom decimal error on waist, hips, or both through the same frozen charts. The adjacent-gap simulation uses editable positive spacing and passes only when both signed directions meet the selected target.

## Artifact batch

Run the resumable sequential batch:

    node scripts/local-ml/build-wear-blender-s3-artifacts.mjs --upload

Safe pilot and resume controls:

    node scripts/local-ml/build-wear-blender-s3-artifacts.mjs --limit 1
    node scripts/local-ml/build-wear-blender-s3-artifacts.mjs --start-after NA-0216-A --limit 1 --upload
    node scripts/local-ml/build-wear-blender-s3-artifacts.mjs --manifest-only --upload

Each person receives front/side 2D JSON, preview GLB, .blend, metadata, camera previews, and SHA-256 hashes for every artifact and source PLY/LND file. The default S3 destination is:

    s3://primestyleai-wear3d-921049726279-us-east-1/processed/wear-blender-canonical-v1-20260908/

Set `PRIMESTYLE_WEAR_USE_PREBUILT_S3=1` on Test Server so it restores and verifies every checksum before serving a body. Also set `PRIMESTYLE_WEAR_REQUIRE_PREBUILT_S3=1` on Test Server: an unfinished scan then returns a clear artifact-not-ready error and never falls back to Blender. Local Test Lab may omit the second flag to retain on-demand headless Blender generation while the batch is being built.

For an authenticated Test Server, set `PRIME_PRODUCTS_INTERNAL_ORIGIN` to its local Next listener (for example `http://127.0.0.1:3004`). Private mesh proxy calls then remain inside the host instead of re-entering the public login boundary.

As of 2026-09-08, NA-0217-A is the verified S3 pilot. The full batch is not complete until the root artifact manifest contains 4,324 unique successful scan IDs.
