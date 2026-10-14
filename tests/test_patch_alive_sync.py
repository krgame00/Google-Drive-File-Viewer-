import json
import pathlib
import subprocess
import sys
import tempfile
import unittest


PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
PATCH_SCRIPT = PROJECT_ROOT / "scripts" / "data" / "patch_alive_from_report.py"


class PatchAliveSyncTests(unittest.TestCase):
    def test_patch_updates_module_and_json_from_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / "scripts" / "data").mkdir(parents=True)
            (root / "reports").mkdir()
            script = root / "scripts" / "data" / "patch_alive_from_report.py"
            script.write_text(PATCH_SCRIPT.read_text(encoding="utf-8"), encoding="utf-8")

            records = [
                {"id": "alive-id", "dead": True, "dead_status": 404, "drive_name": None},
                {"id": "dead-id", "dead": False, "dead_status": None, "drive_name": "old name"},
                {"id": "unreported-id", "dead": False, "dead_status": None},
                {"id": "uncertain-id", "dead": False, "dead_status": None, "drive_name": "keep this"},
            ]
            module = (
                "// fixture\n"
                "const COLL_CHECKED_AT = \"old stamp\";\n"
                "const XBEP_COLLECTION = " + json.dumps(records, ensure_ascii=False) + ";\n"
            )
            (root / "collections-data.js").write_text(module, encoding="utf-8")
            (root / "collections_merged.json").write_text(json.dumps(records), encoding="utf-8")
            report = {
                "alive-id": {"ok": True, "trashed": False, "name": "New 1.2.69"},
                "dead-id": {"ok": False, "code": 404},
                "uncertain-id": {"ok": False, "code": 0, "body": "timeout"},
            }
            (root / "reports" / "drive_alive_report.json").write_text(
                json.dumps(report), encoding="utf-8"
            )

            result = subprocess.run(
                [sys.executable, str(script)],
                cwd=root,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            updated_source = (root / "collections-data.js").read_text(encoding="utf-8")
            start = updated_source.index("const XBEP_COLLECTION = ") + len("const XBEP_COLLECTION = ")
            end = updated_source.index(";", start)
            module_records = json.loads(updated_source[start:end])
            json_records = json.loads((root / "collections_merged.json").read_text(encoding="utf-8"))

            self.assertEqual(module_records, json_records)
            self.assertFalse(module_records[0]["dead"])
            self.assertEqual(module_records[0]["drive_name"], "New 1.2.69")
            self.assertTrue(module_records[1]["dead"])
            self.assertEqual(module_records[1]["dead_status"], 404)
            self.assertFalse(module_records[2]["dead"])
            self.assertFalse(module_records[3]["dead"])
            self.assertEqual(module_records[3]["drive_name"], "keep this")
            self.assertIn("uncertain results skipped 1", result.stdout)
            self.assertIn("synced 4 records", result.stdout)


if __name__ == "__main__":
    unittest.main()
