#!/usr/bin/env python3
"""Small contract tests for the full WEAR source preflight."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "scripts/local-ml/audit_wear_full_contract.py"
SPEC = importlib.util.spec_from_file_location("wear_full_contract", SCRIPT)
assert SPEC and SPEC.loader
CONTRACT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CONTRACT)


class WearFullContractTest(unittest.TestCase):
    def test_declared_source_schema_is_complete(self) -> None:
        self.assertEqual(len(CONTRACT.EXPECTED_RECORDED_FIELDS), 45)
        self.assertEqual(len(CONTRACT.EXPECTED_EXTRACTED_FIELDS), 43)
        self.assertEqual(len(CONTRACT.CANONICAL_LANDMARKS), 73)

    def test_circumference_contract_has_no_silent_target(self) -> None:
        all_circumferences = {
            name for name in CONTRACT.EXPECTED_RECORDED_FIELDS
            if "circumference" in name
        }
        classified = (
            CONTRACT.CONNECTED_CIRCUMFERENCES
            | (all_circumferences & CONTRACT.SITTING_FIELDS)
            | (all_circumferences - CONTRACT.CONNECTED_CIRCUMFERENCES - CONTRACT.SITTING_FIELDS)
        )
        self.assertEqual(classified, all_circumferences)
        self.assertEqual(len(all_circumferences), 13)

    def test_current_source_fails_closed_before_bulk_work(self) -> None:
        with tempfile.TemporaryDirectory(prefix="wear-full-contract-") as temporary:
            output = Path(temporary) / "report.json"
            report = CONTRACT.audit(
                CONTRACT.DEFAULT_MANIFEST,
                CONTRACT.DEFAULT_RENDERER,
                CONTRACT.DEFAULT_TRAINER,
            )
            output.write_text(json.dumps(report), encoding="utf-8")
            self.assertEqual(report["source"]["people"], 4_326)
            self.assertEqual(report["targets"]["recorded"], 45)
            self.assertEqual(report["targets"]["extractedStanding"], 43)
            self.assertFalse(report["trainingAllowed"])
            self.assertTrue(report["blockers"])


if __name__ == "__main__":
    unittest.main()
