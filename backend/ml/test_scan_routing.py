"""Check the actual analyze handler without loading model weights or services."""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock


class ScanRoutingTests(unittest.TestCase):
    def analyze(self, art_type, product):
        source = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        handler = next(node for node in source.body if isinstance(node, ast.FunctionDef) and node.name == "analyze_artwork")
        handler.decorator_list = []
        handler.args.args[0].annotation = None
        constants = {}
        for node in source.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id in {"PHYSICAL_MEDIUMS", "PHYSICAL_FEATURES", "TWOD_MEDIUMS"}:
                        constants[target.id] = ast.literal_eval(node.value)
        image = MagicMock()
        image.convert.return_value = image
        image.__enter__.return_value = image
        namespace = {
            **constants,
            "os": SimpleNamespace(path=SimpleNamespace(exists=lambda _: True)),
            "Image": SimpleNamespace(open=lambda _: image),
            "prepare_physical_art_scan": MagicMock(return_value=(image, image)),
            "extract_features": MagicMock(return_value=["landscape", "sculptures"]),
            "extract_mediums": MagicMock(return_value=["oil", "wood_sculpture"]),
            "extract_all_detailed_colors": MagicMock(return_value=["Blue"]),
        }
        exec(compile(ast.Module(body=[handler], type_ignores=[]), "main.py", "exec"), namespace)
        result = namespace["analyze_artwork"](SimpleNamespace(image_path="example.png", artwork_type=art_type, product=product))
        return result, namespace

    def test_photography_and_print_skip_medium_model(self):
        for category, product in [("photography", "image"), ("print", "image"), ("print", "3d_object"), ("physical", "image")]:
            with self.subTest(category=category, product=product):
                result, calls = self.analyze(category, product)
                calls["extract_mediums"].assert_not_called()
                calls["prepare_physical_art_scan"].assert_not_called()
                self.assertEqual(result["mediums"], [])
                self.assertEqual(result["features"], ["landscape"])
                self.assertEqual(result["colors"], ["Blue"])

    def test_digital_has_fixed_medium(self):
        result, calls = self.analyze("digital", "painting")
        calls["extract_mediums"].assert_not_called()
        self.assertEqual(result["mediums"], ["Digital"])
        self.assertFalse(result["is_3d"])

    def test_painting_and_flat_mixed_media_use_2d(self):
        for category in ["painting", "mixed media"]:
            with self.subTest(category=category):
                result, calls = self.analyze(category, "painting")
                self.assertFalse(calls["extract_mediums"].call_args.args[1])
                self.assertEqual(result["mediums"], ["oil"])
                self.assertFalse(result["is_3d"])

    def test_object_categories_use_3d(self):
        for category in ["sculpture", "architecture", "product", "mixed media"]:
            with self.subTest(category=category):
                result, calls = self.analyze(category, "3d_object")
                calls["prepare_physical_art_scan"].assert_called_once()
                self.assertTrue(calls["extract_mediums"].call_args.args[1])
                self.assertEqual(result["mediums"], ["wood_sculpture"])
                self.assertEqual(result["features"], ["sculptures"])


if __name__ == "__main__":
    unittest.main()
