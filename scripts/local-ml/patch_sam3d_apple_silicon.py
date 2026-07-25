#!/usr/bin/env python3
"""Apply the minimal SAM 3D Body device patch needed for Apple silicon.

Meta's released inference code accepts a ``device`` argument when loading the
model, but a few later operations still force tensors onto CUDA.  This script
keeps the external checkout reproducible and changes only those device locks.
It is intentionally idempotent.
"""

from __future__ import annotations

import os
from pathlib import Path


def replace_once_or_already_patched(
    source: str,
    old: str,
    new: str,
    *,
    label: str,
    expected_old_count: int = 1,
) -> str:
    old_count = source.count(old)
    if old_count == expected_old_count:
        return source.replace(old, new)
    if old_count == 0 and source.count(new) >= expected_old_count:
        return source
    raise RuntimeError(
        f"Cannot safely patch {label}: expected {expected_old_count} original "
        f"occurrence(s), found {old_count}."
    )


def patch_file(path: Path, replacements: list[tuple[str, str, str, int]]) -> bool:
    original = path.read_text(encoding="utf-8")
    patched = original
    for label, old, new, expected_count in replacements:
        patched = replace_once_or_already_patched(
            patched,
            old,
            new,
            label=f"{path.name}: {label}",
            expected_old_count=expected_count,
        )
    if patched == original:
        return False
    path.write_text(patched, encoding="utf-8")
    return True


def normalize_cuda_cache_clear(path: Path) -> bool:
    """Normalize the cache-clear block, including an older nested-patch state."""
    original = path.read_text(encoding="utf-8")
    marker = "        self.prev_prompt = []\n"
    next_block = "\n        if type(img) == str:"
    start = original.find(marker)
    if start < 0:
        raise RuntimeError(f"Cannot find estimator cache marker in {path}")
    start += len(marker)
    end = original.find(next_block, start)
    if end < 0:
        raise RuntimeError(f"Cannot find estimator image block in {path}")
    normalized = (
        original[:start]
        + "        if torch.cuda.is_available():\n"
        + "            torch.cuda.empty_cache()\n"
        + original[end:]
    )
    if normalized == original:
        return False
    path.write_text(normalized, encoding="utf-8")
    return True


def main() -> None:
    root = Path(
        os.environ.get(
            "PRIMESTYLE_SAM3D_ROOT",
            ".local-ml/external/sam-3d-body",
        )
    ).resolve()
    estimator_path = root / "sam_3d_body" / "sam_3d_body_estimator.py"
    meta_arch_path = (
        root
        / "sam_3d_body"
        / "models"
        / "meta_arch"
        / "sam3d_body.py"
    )
    mhr_head_path = (
        root
        / "sam_3d_body"
        / "models"
        / "heads"
        / "mhr_head.py"
    )
    if (
        not estimator_path.is_file()
        or not meta_arch_path.is_file()
        or not mhr_head_path.is_file()
    ):
        raise RuntimeError(f"SAM 3D Body checkout is incomplete at {root}")

    estimator_changed = normalize_cuda_cache_clear(estimator_path)
    estimator_changed = patch_file(
        estimator_path,
        [
            (
                "move inference batches to the loaded model device",
                'recursive_to(batch, "cuda")',
                "recursive_to(batch, self.device)",
                1,
            ),
        ],
    ) or estimator_changed
    meta_arch_changed = patch_file(
        meta_arch_path,
        [
            (
                "move optional hand batches to the loaded model device",
                'recursive_to(batch_lhand, "cuda")',
                "recursive_to(batch_lhand, self.device)",
                1,
            ),
            (
                "move optional right-hand batches to the loaded model device",
                'recursive_to(batch_rhand, "cuda")',
                "recursive_to(batch_rhand, self.device)",
                1,
            ),
            (
                "create ray grid on the active batch device",
                "            .cuda()\n"
                "        )  # B x N x H x W x 2\n",
                '            .to(batch["img"].device)\n'
                "        )  # B x N x H x W x 2\n",
                1,
            ),
            (
                "create low-arm indices on the active pose device",
                "torch.LongTensor([76, 40]).cuda()",
                "torch.LongTensor([76, 40]).to(joint_rotations.device)",
                2,
            ),
            (
                "create wrist indices on the active pose device",
                "torch.LongTensor([77, 41]).cuda()",
                "torch.LongTensor([77, 41]).to(joint_rotations.device)",
                2,
            ),
        ],
    )
    mhr_head_changed = patch_file(
        mhr_head_path,
        [
            (
                "run the float64 MHR mesh decoder on CPU when the main model uses MPS",
                "        curr_skinned_verts, curr_skel_state = self.mhr(\n"
                "            shape_params, model_params, expr_params\n"
                "        )\n",
                "        if model_params.device.type == \"mps\":\n"
                "            # The released TorchScript MHR decoder performs an internal\n"
                "            # float64 skeleton calculation. Apple MPS has no float64, so\n"
                "            # keep this small decoding step on CPU and return float32\n"
                "            # tensors to the main Apple-GPU model.\n"
                "            mhr_expr_params = (\n"
                "                expr_params.to(device=\"cpu\", dtype=torch.float32)\n"
                "                if expr_params is not None\n"
                "                else None\n"
                "            )\n"
                "            curr_skinned_verts, curr_skel_state = self.mhr(\n"
                "                shape_params.to(device=\"cpu\", dtype=torch.float32),\n"
                "                model_params.to(device=\"cpu\", dtype=torch.float32),\n"
                "                mhr_expr_params,\n"
                "            )\n"
                "            curr_skinned_verts = curr_skinned_verts.to(\n"
                "                device=model_params.device, dtype=torch.float32\n"
                "            )\n"
                "            curr_skel_state = curr_skel_state.to(\n"
                "                device=model_params.device, dtype=torch.float32\n"
                "            )\n"
                "        else:\n"
                "            curr_skinned_verts, curr_skel_state = self.mhr(\n"
                "                shape_params, model_params, expr_params\n"
                "            )\n",
                1,
            ),
        ],
    )
    state = (
        "patched"
        if estimator_changed or meta_arch_changed or mhr_head_changed
        else "already patched"
    )
    print(f"SAM 3D Body Apple-silicon compatibility: {state}")


if __name__ == "__main__":
    main()
