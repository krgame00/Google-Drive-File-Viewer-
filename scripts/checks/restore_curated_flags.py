#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Restore hand-curated flags that an automated scan overwrote.

tag_content_from_filenames.py used to write `squirting` from filename keyword
hits, which silently dropped two hand-set entries (dead folders the scan cannot
reach). This re-applies the values from git HEAD and refuses to touch anything
else.

Idempotent: run it after any script that might rewrite collections-data.js.
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(r"C:\Users\PC\ZCodeProject")
DATA = ROOT / "collections-data.js"
PROTECTED = ("squirting", "solo_squirt")


def load_head():
    out = subprocess.run(
        ["git", "show", "HEAD:collections_merged.json"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
    )
    if out.returncode != 0:
        raise SystemExit("cannot read git HEAD version: " + out.stderr.strip())
    return {i["id"]: i for i in json.loads(out.stdout)}


def main():
    raw = DATA.read_text(encoding="utf-8-sig")
    i = raw.index("XBEP_COLLECTION")
    start = raw.index("[", i)
    prefix = raw[: start + 1]
    items = json.loads(raw[start:].rstrip()[:-1])

    head = load_head()
    fixed = []
    for it in items:
        ref = head.get(it["id"])
        if not ref:
            continue
        for key in PROTECTED:
            want, have = ref.get(key), it.get(key)
            if want is True and have is not True:
                it[key] = want
                fixed.append((it["title"][:45], key, have, want))

    print(f"restored {len(fixed)} overwritten flag(s)")
    for title, key, have, want in fixed:
        print(f"  {title:47} {key}: {have!r} -> {want!r}")

    if not fixed:
        print("nothing to restore — data matches HEAD")
        return 0

    DATA.write_text(prefix + json.dumps(items, ensure_ascii=False)[1:] + ";\n",
                    encoding="utf-8")
    print(f"wrote {DATA}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
