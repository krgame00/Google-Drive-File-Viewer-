"""Offline relocation and settings checks; no maintenance scripts run."""
import importlib.util
import json
import pathlib
import shutil
import tempfile
import unittest

REPO = pathlib.Path(__file__).resolve().parents[1]


class ProjectPathsTests(unittest.TestCase):
    def test_relocated_project_and_overrides(self):
        with tempfile.TemporaryDirectory(prefix="gdv-settings-") as tmp:
            moved = pathlib.Path(tmp) / "relocated project"
            shared = moved / "scripts" / "shared"
            shared.mkdir(parents=True)
            shutil.copy(REPO / "scripts/shared/project_paths.py", shared / "project_paths.py")
            shutil.copy(REPO / "scripts/config.example.json", shared.parent / "config.example.json")
            spec = importlib.util.spec_from_file_location("relocated_paths", shared / "project_paths.py")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            self.assertEqual(module.ROOT, moved)
            local = shared.parent / "config.local.json"
            local.write_text(json.dumps({"linkSourceRoot": "inputs", "driveRemote": "backup"}), encoding="utf-8")
            settings = module.get_settings()
            self.assertEqual(settings["linkSourceRoot"], shared.parent / "inputs")
            self.assertEqual(settings["driveRemote"], "backup")
            for invalid in ({"driveRemote": "bad:remote"}, {"linkSourceRoot": None}, {"typo": "x"}, []):
                local.write_text(json.dumps(invalid), encoding="utf-8")
                with self.assertRaises(ValueError):
                    module.get_settings()
            local.write_text("{invalid", encoding="utf-8")
            with self.assertRaises(ValueError):
                module.get_settings()


if __name__ == "__main__":
    unittest.main()
