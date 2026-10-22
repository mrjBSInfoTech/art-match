"""Offline checks for training dataset preparation; never import ML trainers."""

import ast
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import dataset_sync


class DatasetSyncTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="artmatch dataset tests ")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.environment = patch.dict(os.environ, {}, clear=True)
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def dataset(self, group="features"):
        directory = self.root / group
        (directory / "train").mkdir(parents=True, exist_ok=True)
        (directory / "val").mkdir(exist_ok=True)
        if group == "features":
            for name in ("train_annotations.csv", "val_annotations.csv"):
                (directory / name).write_text("image_path,trees\n", encoding="utf-8")
        return directory

    def report(self, group="features", **overrides):
        report = {"dataset": group, "root": str(self.root), "complete": True}
        report.update(overrides)
        return subprocess.CompletedProcess([], 0, "loader notice\n" + json.dumps(report) + "\n")

    def test_default_sync_uses_absolute_paths_and_preserves_spaces(self):
        expected = self.dataset()
        with patch.object(dataset_sync.subprocess, "run", return_value=self.report()) as run:
            self.assertEqual(dataset_sync.prepare_dataset("features"), expected.resolve())
        arguments, options = run.call_args
        self.assertEqual(arguments[0], [
            "node", str(dataset_sync.SYNC_SCRIPT), "--dataset", "features", "--json"
        ])
        self.assertTrue(dataset_sync.SYNC_SCRIPT.is_absolute())
        self.assertEqual(options["cwd"], str(dataset_sync.BACKEND_DIR))
        self.assertEqual(options["stdout"], subprocess.PIPE)
        self.assertNotIn("stderr", options)  # Progress/errors stream to the caller.
        self.assertNotIn("shell", options)

    def test_node_executable_with_spaces_is_one_argument(self):
        self.dataset("mediums_2d")
        binary = "C:/Program Files/nodejs/node.exe"
        with patch.dict(os.environ, {"NODE_BINARY": binary}), patch.object(
            dataset_sync.subprocess, "run", return_value=self.report("mediums_2d")
        ) as run:
            dataset_sync.prepare_dataset("mediums_2d")
        self.assertEqual(run.call_args.args[0][0], binary)

    def test_local_override_does_not_run_sync(self):
        expected = self.dataset("mediums_3d")
        with patch.dict(os.environ, {
            "ML_DATASET_SOURCE": "local", "ML_DATASET_DIR": str(self.root)
        }), patch.object(dataset_sync.subprocess, "run") as run:
            self.assertEqual(dataset_sync.prepare_dataset("mediums_3d"), expected.resolve())
        run.assert_not_called()

    def test_local_default_uses_original_datasets(self):
        expected = self.dataset()
        with patch.dict(os.environ, {"ML_DATASET_SOURCE": "local"}), patch.object(
            dataset_sync, "BASE_DIR", self.root.parent
        ), patch.object(dataset_sync, "_validate_dataset", return_value=expected) as validate:
            self.assertEqual(dataset_sync.prepare_dataset("features"), expected)
        validate.assert_called_once_with((self.root.parent / "datasets").resolve(), "features")

    def test_local_relative_override_is_backend_relative(self):
        with patch.dict(os.environ, {
            "ML_DATASET_SOURCE": "local", "ML_DATASET_DIR": "custom datasets"
        }), patch.object(dataset_sync, "BACKEND_DIR", self.root), patch.object(
            dataset_sync, "_validate_dataset", return_value=self.root
        ) as validate:
            dataset_sync.prepare_dataset("features")
        validate.assert_called_once_with((self.root / "custom datasets").resolve(), "features")

    def test_invalid_source_and_group_fail_before_process(self):
        with patch.object(dataset_sync.subprocess, "run") as run:
            with self.assertRaises(ValueError):
                dataset_sync.prepare_dataset("../features")
            with patch.dict(os.environ, {"ML_DATASET_SOURCE": "automatic"}):
                with self.assertRaises(ValueError):
                    dataset_sync.prepare_dataset("features")
        run.assert_not_called()

    def test_missing_node_stops_training_with_actionable_error(self):
        with patch.object(dataset_sync.subprocess, "run", side_effect=FileNotFoundError):
            with self.assertRaisesRegex(RuntimeError, "Node.js is required"):
                dataset_sync.prepare_dataset("features")

    def test_sync_failure_does_not_fall_back_to_local_files_or_expose_stdout(self):
        self.dataset()
        failed = subprocess.CompletedProcess([], 1, "credential-like-sensitive-output")
        with patch.object(dataset_sync.subprocess, "run", return_value=failed):
            with self.assertRaisesRegex(RuntimeError, "Training was stopped") as caught:
                dataset_sync.prepare_dataset("features")
        self.assertNotIn("credential-like-sensitive-output", str(caught.exception))

    def test_invalid_or_incomplete_reports_stop_training(self):
        self.dataset()
        reports = [
            "", "not json", "{}", "null", "[]",
            self.report(complete=False).stdout,
            self.report(dataset="all").stdout,
            self.report(root=None).stdout,
            self.report(root="relative/cache").stdout,
        ]
        for output in reports:
            with self.subTest(output=output), patch.object(
                dataset_sync.subprocess, "run",
                return_value=subprocess.CompletedProcess([], 0, output)
            ):
                with self.assertRaises(RuntimeError):
                    dataset_sync.prepare_dataset("features")

    def test_missing_split_stops_training_after_successful_sync(self):
        (self.root / "mediums_2d" / "train").mkdir(parents=True)
        with patch.object(dataset_sync.subprocess, "run", return_value=self.report("mediums_2d")):
            with self.assertRaisesRegex(RuntimeError, "Dataset folder not found"):
                dataset_sync.prepare_dataset("mediums_2d")

    def test_missing_feature_annotations_stop_training(self):
        directory = self.dataset()
        (directory / "val_annotations.csv").unlink()
        with patch.object(dataset_sync.subprocess, "run", return_value=self.report()):
            with self.assertRaisesRegex(RuntimeError, "Dataset annotations not found"):
                dataset_sync.prepare_dataset("features")


class TrainingWiringTests(unittest.TestCase):
    def test_all_active_trainers_and_calibrators_prepare_correct_dataset(self):
        scripts = {
            "train_feature_scanner.py": "features",
            "train_medium_2d_scanner.py": "mediums_2d",
            "train_medium_3d_scanner.py": "mediums_3d",
            "calibrate_feature_thresholds.py": "features",
            "calibrate_medium_2d_threshold.py": "mediums_2d",
            "calibrate_medium_3d_threshold.py": "mediums_3d",
        }
        for filename, group in scripts.items():
            with self.subTest(script=filename):
                tree = ast.parse((dataset_sync.BASE_DIR / filename).read_text(encoding="utf-8-sig"))
                preparations = [node for node in ast.walk(tree) if (
                    isinstance(node, ast.Call)
                    and isinstance(node.func, ast.Name)
                    and node.func.id == "prepare_dataset"
                )]
                self.assertEqual(len(preparations), 1)
                self.assertEqual(preparations[0].args[0].value, group)
                data_loads = [node for node in ast.walk(tree) if (
                    isinstance(node, ast.Call)
                    and (
                        isinstance(node.func, ast.Attribute) and node.func.attr == "ImageFolder"
                        or isinstance(node.func, ast.Name)
                        and node.func.id in {"FeatureDataset", "FeatureValidationDataset"}
                    )
                )]
                self.assertTrue(data_loads)
                self.assertLess(preparations[0].lineno, min(node.lineno for node in data_loads))

    def test_feature_helpers_only_sync_when_entry_points_run(self):
        for filename, entry in (
            ("train_feature_scanner.py", "train_feature_model"),
            ("calibrate_feature_thresholds.py", "main"),
        ):
            with self.subTest(script=filename):
                tree = ast.parse((dataset_sync.BASE_DIR / filename).read_text(encoding="utf-8-sig"))
                function = next(node for node in tree.body if (
                    isinstance(node, ast.FunctionDef) and node.name == entry
                ))
                self.assertTrue(any(
                    isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                    and node.func.id == "prepare_dataset"
                    for node in ast.walk(function)
                ))
                self.assertFalse(any(
                    isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                    and node.func.id == "prepare_dataset"
                    for statement in tree.body if not isinstance(statement, ast.FunctionDef)
                    for node in ast.walk(statement)
                ))


if __name__ == "__main__":
    unittest.main()
