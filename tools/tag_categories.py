#!/usr/bin/env python3
"""Auto-tag collection items with a normalized `category` array.

Derives categories ONLY from fields already present in collections-data.js, so
the result is deterministic and reviewable. Idempotent: re-running overwrites
`category` rather than appending duplicates.

Category vocabulary (ordered, first match sets `category_primary`):
  squirt        squirting == true      -> 💦 squirt content (hand-set)
  solo          solo_squirt == true    -> solo post marker (NOT squirt)
  event         event not null and != 0 -> numbered event release
  single_file   kind == "file"          -> bare file, not a folder
  dead          dead == true            -> link verified dead
  approx        approx == true          -> event number inferred, unconfirmed
  mega          mega_url present        -> mirrored on MEGA
  mega_unchecked mega_url and mega_dead is None -> MEGA link never probed
  od            od_url present          -> mirrored on OneDrive
  mf            mf_url present          -> mirrored on MediaFire
  merge         dup_posts present       -> one Drive id seen in several source batches
  event0        event == 0              -> event number unknown, not event zero

Two naming traps this vocabulary avoids:
- `solo_squirt` does NOT mean squirt. It is the owner's "โพสต์เดี่ยว" marker
  (grey Solo badge). `squirting` is the real 💦 flag. Commits 5b5d3b4 (added)
  and ace00e3 (split the two apart).
- `archive` is NOT a category. It is only a `format` tag meaning "folder holds
  .zip". The `kind == "file"` items are bare .rar/.apk, so they are
  `single_file` instead.

Field semantics were read from the code that writes them, not from the names:
- `dup_posts` is written by scripts/data/merge_new_posts.py:85-86 when one Drive
  id turns up under several source post numbers, so it records a merge
  overlap, not a duplicate living in the library.
- `mega_dead` is null on all 55 MEGA links, i.e. never probed. The UI reads
  `!!c.mega_url && !c.mega_dead`, which is true for every link, so it shows a
  working MEGA button before anything has been verified. `mega_unchecked`
  marks those rows so that gap stays visible.
- `approx` items all carry `desc` ending in "ประมาณจากลำดับ": the event NUMBER
  was guessed from position, not read from the post.

Usage:
  python tools/tag_categories.py            # write collections-data.js
  python tools/tag_categories.py --dry      # report only, no write
  python tools/tag_categories.py --sample   # print one example per category
"""
from __future__ import annotations

import argparse
import collections
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "collections-data.js"

# Order matters: `category_primary` is the first category that matched, and it
# decides the sort group in the UI. Most specific / most actionable first.
SQUIRT, SOLO, EVENT, SINGLE_FILE = "squirt", "solo", "event", "single_file"
DEAD, APPROX, MEGA, MEGA_UNCHECKED = "dead", "approx", "mega", "mega_unchecked"
OD, MF, MERGE, EVENT0 = "od", "mf", "merge", "event0"

CATEGORY_ORDER = [SQUIRT, SOLO, EVENT, EVENT0, SINGLE_FILE, DEAD, APPROX,
                  MEGA, MEGA_UNCHECKED, OD, MF, MERGE]

CATEGORY_LABEL = {
    SQUIRT: "💦 Squirt",
    SOLO: "โพสต์เดี่ยว",
    EVENT: "อีเวนต์",
    EVENT0: "อีเวนต์ (เลขไม่ชัด)",
    SINGLE_FILE: "ไฟล์เดี่ยว",
    DEAD: "ลิงก์ตาย",
    APPROX: "เลขจากลำดับ",
    MEGA: "มีใน MEGA",
    MEGA_UNCHECKED: "MEGA ยังไม่ตรวจ",
    OD: "มีใน OneDrive",
    MF: "มีใน MediaFire",
    MERGE: "merge ทับ batch",
}


def load() -> tuple[str, list[dict]]:
    """Return (prefix, items). prefix is everything up to and including `[`."""
    raw = DATA.read_text(encoding="utf-8-sig")
    key = raw.index("XBEP_COLLECTION")
    start = raw.index("[", key)
    stripped = raw[start:].rstrip()
    assert stripped.endswith(";"), "expected trailing semicolon after the array"
    body = stripped[:-1]
    # keep the original declaration + comments, and the opening bracket, verbatim
    return raw[: start + 1], json.loads(body)


def tag(item: dict) -> list[str]:
    cats: list[str] = []

    if item.get("squirting") is True:
        cats.append(SQUIRT)

    if item.get("solo_squirt") is True:
        cats.append(SOLO)

    ev = item.get("event")
    if ev is not None:
        if str(ev) == "0":
            cats.append(EVENT0)
        else:
            cats.append(EVENT)

    if item.get("kind") == "file":
        cats.append(SINGLE_FILE)
    if item.get("dead") is True:
        cats.append(DEAD)
    if item.get("approx") is True:
        cats.append(APPROX)
    if item.get("mega_url"):
        cats.append(MEGA)
        # mega_dead is None until a probe runs, so `!mega_dead` reads as alive
        # in the UI (collection-viewer.js:236). Flag the unverified rows.
        if item.get("mega_dead") is None:
            cats.append(MEGA_UNCHECKED)
    if item.get("od_url"):
        cats.append(OD)
    if item.get("mf_url"):
        cats.append(MF)
    if item.get("dup_posts"):
        cats.append(MERGE)
    return cats


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true", help="report without writing")
    ap.add_argument("--sample", action="store_true", help="show an example per category")
    args = ap.parse_args()

    prefix, items = load()

    counts: collections.Counter = collections.Counter()
    primary: collections.Counter = collections.Counter()
    untagged: list[str] = []
    samples: dict[str, dict] = {}

    for item in items:
        cats = tag(item)
        # assign last so the keys land at the end of the object, not mid-dict
        item["category"] = cats
        item["category_primary"] = cats[0] if cats else ""
        for c in cats:
            counts[c] += 1
        if cats:
            primary[cats[0]] += 1
            samples.setdefault(cats[0], item)
        else:
            untagged.append(item.get("title", "?"))

    print(f"items: {len(items)}")
    print("\ncategory counts (item can carry several):")
    for c in CATEGORY_ORDER:
        if counts[c]:
            print(f"  {CATEGORY_LABEL[c]:22} {counts[c]:4}")
    print("\nprimary group (what the UI sorts by):")
    for c, n in primary.most_common():
        print(f"  {CATEGORY_LABEL.get(c, c):22} {n:4}")
    print(f"\nuntagged: {len(untagged)}")
    for t in untagged[:10]:
        print(f"  - {t}")

    if args.sample:
        print("\nsamples:")
        for c, it in samples.items():
            print(f"\n  [{CATEGORY_LABEL.get(c, c)}] {it.get('title')}")
            print(f"    dead={it.get('dead')} approx={it.get('approx')} "
                  f"event={it.get('event')} kind={it.get('kind')}")

    if args.dry:
        print("\nDRY RUN — no files written")
        return 0

    # Match the toolchain's shape: one-line array, `const XBEP_COLLECTION = [...];`
    # prefix already ends with the opening `[`, so json.dumps output starts at `{`.
    body = json.dumps(items, ensure_ascii=False)[1:]
    DATA.write_text(prefix + body + ";\n", encoding="utf-8")
    print(f"\nwrote {DATA} ({len(items)} items)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
