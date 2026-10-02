import pathlib, re, json, sys, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
IDX = ROOT / "index.html"
REPORT = ROOT / "reports" / "drive_alive_report.json"
CHECK = ROOT / "scripts" / "checks" / "check_drive_alive.py"
PATCH = ROOT / "scripts" / "data" / "patch_alive_from_report.py"

print("=== Daily Drive check start ===")
# 1. check
r = subprocess.run([sys.executable, str(CHECK)], capture_output=True, text=True, timeout=300)
print(r.stdout[-3000:] if r.stdout else "")
print(r.stderr[-1000:] if r.stderr else "")
if r.returncode != 0:
    print(f"check failed {r.returncode}")
    sys.exit(1)
# 2. patch
r2 = subprocess.run([sys.executable, str(PATCH)], capture_output=True, text=True, timeout=30)
print(r2.stdout)
print(r2.stderr)
if r2.returncode != 0:
    sys.exit(1)
# 3. sync collections_merged.json ให้ตรงกับ index.html (source of truth)
try:
    r3 = subprocess.run(["node", "tools/collection_data.js", "extract"], capture_output=True, text=True, timeout=30, cwd=str(ROOT))
    print(r3.stdout)
    print(r3.stderr)
except FileNotFoundError:
    print("WARN: node not found — skip collections_merged.json sync")
# 4. verify
s = IDX.read_text(encoding="utf-8")
m = re.search(r"const XBEP_COLLECTION = (\[.*?\]);", s, flags=re.DOTALL)
coll = json.loads(m.group(1))
alive = sum(1 for c in coll if not c.get("dead"))
dead = len(coll) - alive
print(f"coll {len(coll)} alive {alive} dead {dead}")
# 5. git push if changed
import subprocess as sp
def sh(cmd): return sp.run(cmd, shell=True, capture_output=True, text=True, cwd=str(ROOT))
r = sh("git status --porcelain")
print(r.stdout[:500])
if "index.html" in r.stdout or "drive_alive_report.json" in r.stdout or "M" in r.stdout:
    sh("git add index.html reports/drive_alive_report.json collections_merged.json")
    msg = f"chore: daily Drive alive {alive}/{len(coll)} (dead {dead})"
    r = sh(f'git commit -m "{msg}"')
    print(r.stdout[:500])
    print(r.stderr[:500])
    r = sh("git push origin HEAD")
    print(r.stdout[:500])
    print(r.stderr[:500])
else:
    print("no changes to push")
print("=== Daily done ===")
