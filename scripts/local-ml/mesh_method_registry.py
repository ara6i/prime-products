#!/usr/bin/env python3
"""Dependency and safety registry for the private 2D MHR proof.

This module is deliberately lightweight.  It does not import or initialize a
model, download a checkpoint, or select a GPU.  The execution runner consumes
these records and may run only methods whose status is ``ready`` on CPU.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
import subprocess
from typing import Iterable


@dataclass(frozen=True)
class Dependency:
    id: str
    available: bool
    detail: str
    path: str | None = None


@dataclass(frozen=True)
class MethodSpec:
    id: str
    label: str
    status: str
    execution_device: str | None
    summary: str
    dependencies: tuple[Dependency, ...]
    exact_prompt_contract: dict
    forbidden_postprocesses: tuple[str, ...]
    blocker_reasons: tuple[str, ...]
    requires_fresh_gpu_approval: bool = False
    executable: bool = False

    def to_dict(self) -> dict:
        payload = asdict(self)
        payload["dependencies"] = [asdict(item) for item in self.dependencies]
        payload["forbiddenPostprocesses"] = payload.pop("forbidden_postprocesses")
        payload["blockerReasons"] = payload.pop("blocker_reasons")
        payload["executionDevice"] = payload.pop("execution_device")
        payload["exactPromptContract"] = payload.pop("exact_prompt_contract")
        payload["requiresFreshGpuApproval"] = payload.pop(
            "requires_fresh_gpu_approval"
        )
        return payload


def _file_dependency(root: Path, relative: str, dependency_id: str) -> Dependency:
    path = root / relative
    return Dependency(
        id=dependency_id,
        available=path.is_file(),
        detail="present" if path.is_file() else "missing",
        path=str(path),
    )


def _directory_dependency(root: Path, relative: str, dependency_id: str) -> Dependency:
    path = root / relative
    return Dependency(
        id=dependency_id,
        available=path.is_dir(),
        detail="present" if path.is_dir() else "missing",
        path=str(path),
    )


def _module_available(python_executable: Path, module: str) -> bool:
    if not python_executable.is_file():
        return False
    command = (
        "import importlib.util,sys;"
        f"sys.exit(0 if importlib.util.find_spec({module!r}) else 1)"
    )
    completed = subprocess.run(
        [str(python_executable), "-c", command],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return completed.returncode == 0


def _module_dependency(
    python_executable: Path,
    module: str,
    dependency_id: str | None = None,
) -> Dependency:
    available = _module_available(python_executable, module)
    return Dependency(
        id=dependency_id or f"python-module:{module}",
        available=available,
        detail=(
            f"importable by {python_executable}"
            if available
            else f"not importable by {python_executable}"
        ),
        path=str(python_executable),
    )


def _prompt_config_dependencies(root: Path) -> tuple[Dependency, ...]:
    config_path = root / ".local-ml/checkpoints/sam-3d-body-vith/model_config.yaml"
    model_source = (
        root
        / ".local-ml/external/sam-3d-body/sam_3d_body/models/meta_arch/sam3d_body.py"
    )
    config_text = config_path.read_text() if config_path.is_file() else ""
    source_text = model_source.read_text() if model_source.is_file() else ""
    checks = (
        Dependency(
            id="vith-prompt-encoder-enabled",
            available="PROMPT_ENCODER:" in config_text and "ENABLE: true" in config_text,
            detail="model config enables the official prompt encoder",
            path=str(config_path),
        ),
        Dependency(
            id="vith-mask-prompt-supported",
            available=(
                "MASK_EMBED_TYPE: v2" in config_text
                and "MASK_PROMPT: v1" in config_text
                and "def _get_mask_prompt" in source_text
            ),
            detail="checkpoint config and official model source expose mask prompting",
            path=str(config_path),
        ),
        Dependency(
            id="vith-keypoint-prompt-supported",
            available=(
                "PROMPT_KEYPOINTS: mhr70" in config_text
                and "MAX_NUM_CLICKS: 2" in config_text
                and "def run_keypoint_prompt" in source_text
            ),
            detail=(
                "official MHR70 keypoint path is present; this checkpoint permits at most two clicks"
            ),
            path=str(model_source),
        ),
    )
    return checks


def _missing(dependencies: Iterable[Dependency]) -> tuple[str, ...]:
    return tuple(
        f"{item.id}: {item.detail}" for item in dependencies if not item.available
    )


def build_registry(
    repo_root: Path,
    python_executable: Path | None = None,
) -> list[MethodSpec]:
    """Return the five approved methods plus an explicit legacy RBF rejection."""

    root = repo_root.resolve()
    python_path = (
        python_executable
        or root / ".local-ml/venvs/sam-3d-body/bin/python"
    )
    common = (
        _directory_dependency(
            root, ".local-ml/external/sam-3d-body", "sam3d-official-checkout"
        ),
        _file_dependency(
            root,
            ".local-ml/checkpoints/sam-3d-body-vith/model.ckpt",
            "sam3d-vith-checkpoint",
        ),
        _file_dependency(
            root,
            ".local-ml/checkpoints/sam-3d-body-vith/assets/mhr_model.pt",
            "mhr-model",
        ),
        _module_dependency(python_path, "torch"),
        _module_dependency(python_path, "cv2"),
        _module_dependency(python_path, "numpy"),
    )
    raw_blockers = _missing(common)
    raw = MethodSpec(
        id="raw-meta-vith",
        label="Current raw Meta ViT-H baseline",
        status="ready" if not raw_blockers else "blocked",
        execution_device="cpu" if not raw_blockers else None,
        summary="Official SAM 3D Body RGB plus crop baseline with fixed MHR topology.",
        dependencies=common,
        exact_prompt_contract={
            "rgb": True,
            "personCrop": True,
            "maskPrompt": False,
            "keypointPromptCount": 0,
            "depth": False,
            "measurements": False,
        },
        forbidden_postprocesses=("RBF", "silhouette vertex snapping"),
        blocker_reasons=raw_blockers,
        executable=not raw_blockers,
    )

    prompt_dependencies = common + (
        _file_dependency(
            root,
            ".local-ml/checkpoints/sapiens2-pose-0.4b/model.safetensors",
            "sapiens2-pose-checkpoint",
        ),
        _file_dependency(
            root,
            ".local-ml/wear-mesh-overlay/photo-masks/delaram.png",
            "delaram-internal-mask",
        ),
        _file_dependency(
            root,
            ".local-ml/wear-mesh-overlay/photo-masks/delaram-2.png",
            "delaram-2-internal-mask",
        ),
    ) + _prompt_config_dependencies(root)
    prompt_blockers = _missing(prompt_dependencies)
    prompted_vith = MethodSpec(
        id="prompted-meta-vith",
        label="Prompted Meta ViT-H",
        status="ready" if not prompt_blockers else "blocked",
        execution_device="cpu" if not prompt_blockers else None,
        summary=(
            "Official mask conditioning plus at most two official MHR70 keypoint clicks; "
            "no post-hoc vertex warping."
        ),
        dependencies=prompt_dependencies,
        exact_prompt_contract={
            "rgb": True,
            "personCrop": True,
            "maskPrompt": True,
            "maskPurpose": "internal fitting evidence only",
            "keypointSource": "Sapiens2 MHR70",
            "keypointSelection": "up to two reliable key-body points with largest current error",
            "maximumKeypointPrompts": 2,
            "maximumReason": "the installed official checkpoint declares MAX_NUM_CLICKS: 2",
            "depth": False,
            "measurements": False,
        },
        forbidden_postprocesses=("RBF", "free-form vertex snapping", "mask triangulation"),
        blocker_reasons=prompt_blockers,
        executable=not prompt_blockers,
    )

    dino_candidates = (
        root / ".local-ml/checkpoints/sam-3d-body-dinov3/model.ckpt",
        root / ".local-ml/checkpoints/sam-3d-body-dinov3/model.safetensors",
    )
    dino_checkpoint = next((path for path in dino_candidates if path.is_file()), None)
    dino_dependencies = (
        Dependency(
            id="sam3d-dinov3-checkpoint",
            available=dino_checkpoint is not None,
            detail=(
                "present"
                if dino_checkpoint is not None
                else "not installed locally; official gated checkpoint was not downloaded in this CPU pilot"
            ),
            path=str(dino_checkpoint or dino_candidates[0]),
        ),
        _file_dependency(
            root,
            ".local-ml/checkpoints/sam-3d-body-vith/assets/mhr_model.pt",
            "mhr-model",
        ),
        _file_dependency(
            root,
            "scripts/local-ml/run_prompted_mhr_dinov3.py",
            "dinov3-prompted-executor",
        ),
    )
    dino_blockers = _missing(dino_dependencies)
    prompted_dino = MethodSpec(
        id="prompted-meta-dinov3",
        label="Prompted Meta DINOv3",
        status="ready" if not dino_blockers else "blocked",
        execution_device="cpu" if not dino_blockers else None,
        summary="Same prompt evidence as ViT-H, using the newer official DINOv3 checkpoint.",
        dependencies=dino_dependencies,
        exact_prompt_contract=prompted_vith.exact_prompt_contract,
        forbidden_postprocesses=prompted_vith.forbidden_postprocesses,
        blocker_reasons=dino_blockers,
        executable=not dino_blockers,
    )

    dense_dependencies = (
        _file_dependency(
            root,
            ".local-ml/checkpoints/sapiens2-pose-0.4b/model.safetensors",
            "sapiens2-pose-checkpoint",
        ),
        _module_dependency(python_path, "detectron2"),
        _module_dependency(python_path, "densepose"),
        _module_dependency(python_path, "pytorch3d"),
        _file_dependency(
            root,
            "scripts/local-ml/run_dense_constrained_mhr_fit.py",
            "dense-constrained-fit-executor",
        ),
    )
    dense_blockers = _missing(dense_dependencies)
    dense = MethodSpec(
        id="dense-constrained-mhr",
        label="Dense constrained MHR fit",
        status="ready" if not dense_blockers else "blocked",
        execution_device="cpu" if not dense_blockers else None,
        summary=(
            "Sapiens body evidence plus DensePose correspondences, parametric MHR optimization, "
            "and topology-preserving part-aware ARAP residuals."
        ),
        dependencies=dense_dependencies,
        exact_prompt_contract={
            "rgb": True,
            "sapiensPose": True,
            "sapiensPartSegmentation": True,
            "densePoseCorrespondence": True,
            "optimizedParameters": ["MHR identity", "MHR pose", "camera"],
            "residual": "small part-aware 2D ARAP",
            "depthUsedForMatching": False,
            "measurements": False,
        },
        forbidden_postprocesses=("unconstrained warp", "mask triangulation", "RBF"),
        blocker_reasons=dense_blockers,
        executable=not dense_blockers,
    )

    wear_fallback = MethodSpec(
        id="wear-trained-fallback",
        label="WEAR-trained fixed-topology fallback",
        status="blocked",
        execution_device=None,
        summary=(
            "Fallback training from standing WEAR renders is not authorized while the global GPU stop is active."
        ),
        dependencies=(),
        exact_prompt_contract={
            "standingWearOnly": True,
            "fixedMhrOutput": True,
            "circumferenceInput": False,
            "depthInput": False,
            "tapeInput": False,
        },
        forbidden_postprocesses=("target leakage", "RBF", "mask triangulation"),
        blocker_reasons=(
            "Fresh explicit GPU approval is required.",
            "The global GPU stop remains active.",
            "Training may start only after every pretrained CPU candidate fails honest validation.",
        ),
        requires_fresh_gpu_approval=True,
        executable=False,
    )

    rejected_rbf = MethodSpec(
        id="legacy-meta-sapiens-rbf",
        label="Legacy Meta plus 70-point RBF",
        status="rejected",
        execution_device=None,
        summary=(
            "Excluded from the proof: it improves sparse joints while worsening the full visible outline."
        ),
        dependencies=(),
        exact_prompt_contract={
            "officialPromptPath": False,
            "postHocVertexWarp": "local linear RBF",
        },
        forbidden_postprocesses=("RBF",),
        blocker_reasons=(
            "Post-hoc RBF is not an official SAM 3D Body prompt path.",
            "Previously observed outline IoU regressed on both Delaram photos.",
            "It can never receive Passed status in this framework.",
        ),
        executable=False,
    )
    return [raw, prompted_vith, prompted_dino, dense, wear_fallback, rejected_rbf]


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    registry = [item.to_dict() for item in build_registry(repo_root)]
    import json

    print(json.dumps({"methods": registry}, indent=2))


if __name__ == "__main__":
    main()
