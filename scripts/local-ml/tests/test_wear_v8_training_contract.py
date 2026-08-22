#!/usr/bin/env python3
"""Regression tests for the connected WEAR v8 mesh-only training contract."""

from __future__ import annotations

import importlib.util
import inspect
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image, ImageDraw
import torch


ROOT = Path(__file__).resolve().parents[3]
TRAINER_PATH = ROOT / "scripts/local-ml/cloud/wear3d-v6/train_wear3d_v6.py"
SPEC = importlib.util.spec_from_file_location("wear_v8_trainer", TRAINER_PATH)
assert SPEC and SPEC.loader
TRAINER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(TRAINER)


class WearV8TrainingContractTest(unittest.TestCase):
    @staticmethod
    def row(*, accepted: bool, geometry: bool, shape: bool, tape: bool) -> dict:
        return {
            "accepted": accepted,
            "geometry_target_valid": geometry,
            "shape_target_valid": shape,
            "tape_target_valid": tape,
            "y_norm": 0.4,
            "wear_edge_left_x_norm": 0.3,
            "wear_edge_right_x_norm": 0.7,
            "mesh_width_mm": 400.0,
            "mesh_depth_mm": 200.0,
            "measurement_circumference_mm": 920.0,
            "contour_points_normalized": [
                [float(np.cos(index * 2 * np.pi / 32)), float(np.sin(index * 2 * np.pi / 32))]
                for index in range(32)
            ],
        }

    def test_runtime_forward_cannot_receive_true_rows_or_tape(self) -> None:
        parameters = list(inspect.signature(TRAINER.WearV8Model.forward).parameters)
        self.assertEqual(parameters, ["self", "mesh_channels", "profile"])

    def test_training_is_fail_closed_without_full_contract_reports(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "fail-closed"):
            TRAINER.require_full_contract_reports(None, None)

    def test_connected_circumference_walks_the_predicted_shape(self) -> None:
        shape_x = torch.tensor([[-1.0, 1.0, 1.0, -1.0]])
        shape_y = torch.tensor([[-1.0, -1.0, 1.0, 1.0]])
        walked = TRAINER.walk_resized_closed_shape_cm(
            shape_x,
            shape_y,
            torch.tensor([40.0]),
            torch.tensor([20.0]),
        )
        self.assertTrue(torch.allclose(walked, torch.tensor([120.0]), atol=1e-3))

    def test_connected_circumference_changes_when_breadth_or_depth_changes(self) -> None:
        shape_x = torch.tensor([[-1.0, 1.0, 1.0, -1.0]])
        shape_y = torch.tensor([[-1.0, -1.0, 1.0, 1.0]])
        baseline = TRAINER.walk_resized_closed_shape_cm(
            shape_x,
            shape_y,
            torch.tensor([40.0]),
            torch.tensor([20.0]),
        )
        wider = TRAINER.walk_resized_closed_shape_cm(
            shape_x,
            shape_y,
            torch.tensor([44.0]),
            torch.tensor([20.0]),
        )
        deeper = TRAINER.walk_resized_closed_shape_cm(
            shape_x,
            shape_y,
            torch.tensor([40.0]),
            torch.tensor([24.0]),
        )
        self.assertTrue(torch.all(wider > baseline))
        self.assertTrue(torch.all(deeper > baseline))

    def test_connected_circumference_changes_when_shape_changes(self) -> None:
        # Both contours have the same exact A-B breadth and C-D depth.  The
        # diamond walks a shorter path than the rectangle, proving the model
        # cannot ignore its learned closed shape and return a free tape value.
        rectangle_x = torch.tensor([[-1.0, 1.0, 1.0, -1.0]])
        rectangle_y = torch.tensor([[-1.0, -1.0, 1.0, 1.0]])
        diamond_x = torch.tensor([[0.0, 1.0, 0.0, -1.0]])
        diamond_y = torch.tensor([[-1.0, 0.0, 1.0, 0.0]])
        rectangle = TRAINER.walk_resized_closed_shape_cm(
            rectangle_x,
            rectangle_y,
            torch.tensor([40.0]),
            torch.tensor([20.0]),
        )
        diamond = TRAINER.walk_resized_closed_shape_cm(
            diamond_x,
            diamond_y,
            torch.tensor([40.0]),
            torch.tensor([20.0]),
        )
        self.assertTrue(torch.all(diamond < rectangle))

    def test_mesh_channels_are_fill_boundary_and_triangle_lines(self) -> None:
        with tempfile.TemporaryDirectory(prefix="wear-v8-contract-") as temporary:
            directory = Path(temporary)
            mask_path = directory / "mask.png"
            mesh_path = directory / "mesh.png"

            mask = Image.new("RGBA", (192, 256), (0, 0, 0, 0))
            ImageDraw.Draw(mask).rectangle((60, 30, 132, 230), fill=(255, 255, 255, 255))
            mask.save(mask_path)

            mesh = Image.new("RGB", (192, 256), (20, 20, 20))
            draw = ImageDraw.Draw(mesh)
            draw.rectangle((60, 30, 132, 230), fill=(20, 20, 20), outline=(255, 255, 255))
            draw.line((60, 30, 132, 230), fill=(255, 255, 255), width=1)
            mesh.save(mesh_path)

            channels = TRAINER.load_mesh_channels(mesh_path, mask_path)
            self.assertEqual(channels.shape, (3, 256, 192))
            self.assertEqual(float(channels[0, 100, 100]), 1.0)
            self.assertGreater(float(channels[1].sum()), 0.0)
            self.assertGreater(float(channels[2].sum()), 0.0)
            self.assertTrue(np.all(channels[2][channels[0] < 0.5] == 0.0))

    def test_rejected_teacher_contributes_no_row_or_tape_target(self) -> None:
        edges, measurements = TRAINER.flatten_targets({
            "rows": {"waist": self.row(accepted=False, geometry=False, shape=False, tape=False)},
            "measurements_mm": {"waist_circumference_mm": 920.0},
        })
        self.assertNotIn("row.waist.y_norm", edges)
        self.assertNotIn("row.waist.circumference_cm", measurements)
        self.assertNotIn("measurements_mm.waist_circumference_mm", measurements)

    def test_tape_target_exists_only_for_certified_connected_row(self) -> None:
        record = {
            "rows": {"waist": self.row(accepted=True, geometry=True, shape=True, tape=True)},
            "measurements_mm": {"waist_circumference_mm": 920.0},
        }
        edges, measurements = TRAINER.flatten_targets(record)
        self.assertEqual(edges["row.waist.y_norm"], 0.4)
        self.assertEqual(measurements["row.waist.breadth_cm"], 40.0)
        self.assertEqual(measurements["row.waist.depth_cm"], 20.0)
        self.assertEqual(measurements["row.waist.circumference_cm"], 92.0)
        self.assertNotIn("measurements_mm.waist_circumference_mm", measurements)


if __name__ == "__main__":
    unittest.main()
