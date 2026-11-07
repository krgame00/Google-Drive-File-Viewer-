import datetime
import json
import os
import pathlib
import re
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "collections-data.js"
INDEX_FILE = ROOT / "index.html"
REPORT = ROOT / "reports" / "drive_alive_report.json"
CHECK = ROOT / "scripts" / "checks" / "check_drive_alive.py"
PATCH = ROOT / "scripts" / "data" / "patch_alive_from_report.py"
TAGGER = ROOT / "tools" / "tag_categories.py"
ENV = dict(os.environ, PYTHONIOENCODING="utf-8")

NO_PUSH = "--no-push" in sys.argv or "--dry" in sys.argv

print("=== Daily Drive check start ===")


def run_proc(cmd, timeout=60):
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        env=ENV,
        cwd=str(ROOT),
    )


# 1. Probe Google Drive link statuses
print("\n[1/5] Checking Google Drive links...")
r1 = run_proc([sys.executable, str(CHECK)], timeout=600)
print(r1.stdout[-2500:] if r1.stdout else "")
if r1.stderr:
    print(r1.stderr[-1000:], file=sys.stderr)
if r1.returncode != 0:
    print(f"ERROR: check_drive_alive.py failed with code {r1.returncode}", file=sys.stderr)
    sys.exit(r1.returncode)

# 2. Patch dead status and Thai timestamp into collections-data.js
print("\n[2/5] Patching collections-data.js from report...")
r2 = run_proc([sys.executable, str(PATCH)], timeout=60)
print(r2.stdout)
if r2.stderr:
    print(r2.stderr, file=sys.stderr)
if r2.returncode != 0:
    print(f"ERROR: patch_alive_from_report.py failed with code {r2.returncode}", file=sys.stderr)
    sys.exit(r2.returncode)

# 3. Tag categories so 'dead' is added to category array
print("\n[3/5] Updating categories via tag_categories.py...")
r3 = run_proc([sys.executable, str(TAGGER)], timeout=60)
print(r3.stdout)
if r3.stderr:
    print(r3.stderr, file=sys.stderr)
if r3.returncode != 0:
    print(f"ERROR: tag_categories.py failed with code {r3.returncode}", file=sys.stderr)
    sys.exit(r3.returncode)

# 4. Sync collections-data.js into collections_merged.json and verify sync
print("\n[4/5] Syncing collections_merged.json and verifying...")
try:
    r4 = run_proc(["node", "tools/collection_data.js", "extract"], timeout=30)
    print(r4.stdout)
    if r4.returncode != 0:
        print(f"ERROR: collection_data.js extract failed with code {r4.returncode}", file=sys.stderr)
        sys.exit(r4.returncode)

    r5 = run_proc(["node", "tools/collection_data.js", "check"], timeout=30)
    print(r5.stdout)
    if r5.returncode != 0:
        print(f"ERROR: collection_data.js check failed with code {r5.returncode}", file=sys.stderr)
        sys.exit(r5.returncode)
except FileNotFoundError:
    print("WARN: node not found — skipping tools/collection_data.js extract & check")

# 5. Read collection summary
s = DATA_FILE.read_text(encoding="utf-8")
m = re.search(r"const XBEP_COLLECTION = (\[.*?\]);", s, flags=re.DOTALL)
if not m:
    print("ERROR: could not parse XBEP_COLLECTION from collections-data.js", file=sys.stderr)
    sys.exit(1)
coll = json.loads(m.group(1))
alive = sum(1 for c in coll if not c.get("dead"))
dead = len(coll) - alive
print(f"\n[5/5] Final summary: Total={len(coll)} Alive={alive} Dead={dead}")


def sh(cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(ROOT),
    )


status = sh("git status --porcelain")
print("\nGit porcelain status:\n" + (status.stdout.strip() if status.stdout else "(clean)"))

data_modified = any(
    f in status.stdout
    for f in ["collections-data.js", "drive_alive_report.json", "collections_merged.json"]
)

if data_modified:
    # Bump cache buster for collections-data.js in index.html
    tz_bkk = datetime.timezone(datetime.timedelta(hours=7))
    today_str = datetime.datetime.now(tz_bkk).strftime("%Y%m%d")
    index_text = INDEX_FILE.read_text(encoding="utf-8")
    cb_match = re.search(r'collections-data\.js\?v=(\d{8})-r(\d+)', index_text)
    if cb_match:
        cur_date, cur_rev = cb_match.group(1), int(cb_match.group(2))
        new_rev = (cur_rev + 1) if cur_date == today_str else 1
        new_tag = f"collections-data.js?v={today_str}-r{new_rev}"
        index_text = re.sub(r'collections-data\.js\?v=\d{8}-r\d+', new_tag, index_text)
        INDEX_FILE.write_text(index_text, encoding="utf-8")
        print(f"Bumped cache buster: {new_tag}")

    if NO_PUSH:
        print("Dry run / --no-push requested. Skipping git commit & push.")
    else:
        sh("git add collections-data.js reports/drive_alive_report.json collections_merged.json index.html")
        msg = f"chore: daily Drive alive {alive}/{len(coll)} (dead {dead})"
        c = sh(f'git commit -m "{msg}"')
        print(c.stdout)
        if c.stderr:
            print(c.stderr, file=sys.stderr)
        sh("git pull --rebase origin main")
        p = sh("git push origin HEAD:main")
        print(p.stdout)
        if p.stderr:
            print(p.stderr, file=sys.stderr)
        if p.returncode != 0:
            print(f"ERROR: git push failed with returncode {p.returncode}", file=sys.stderr)
            sys.exit(p.returncode)
else:
    print("No link status or collection changes to push.")

print("=== Daily done ===")
