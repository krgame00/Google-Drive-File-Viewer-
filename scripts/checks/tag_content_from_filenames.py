#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tag collection items by ACTUAL content, derived from the real filenames
inside each Drive folder (reports/drive_deep_scan_cache.json).

Two orthogonal axes, because filenames show they co-occur rather than compete:

  content  what it depicts: cosplay / animation / liveaction / 3d / vtuber / asmr
  format   how it is stored: clip (video/audio) / photos / archive

Also records `creators` (the [handle]-style author tag) and `squirting`
(keyword hit in a real filename), so the squirt tag reflects evidence instead
of the hand-set `solo_squirt` field.

Only alive folders present in the cache are tagged; dead folders keep whatever
category they already have.

Usage:
  python scripts/checks/tag_content_from_filenames.py --dry
  python scripts/checks/tag_content_from_filenames.py
  python scripts/checks/tag_content_from_filenames.py --sample
"""
from __future__ import annotations

import argparse
import collections
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import _appsources as app

ROOT = app.ROOT
DATA = ROOT / "collections-data.js"
CACHE = ROOT / "reports" / "drive_deep_scan_cache.json"
OUT = ROOT / "reports" / "content_tag_report.json"

# ---------------------------------------------------------------- vocab ----
# CONTENT: what the media shows. All matching rules are kept, because
# filenames cross-tag ("ASMRLiveAction น้ำพุ่งๆ" is asmr + liveaction +
# squirt). `content_primary` is decided later by dominant evidence, not by
# the order of this table.
CONTENT_RULES = [
    ("liveaction", r"live\s?action|LiveAction|ASMR\s?Live|実写|จริง"),
    ("cosplay",     r"cosplay|คอสเป|コス"),
    ("vtuber",      r"vtuber|VTuber|にじさんじ|nijisanji|hololive|VShojo|VSPO"),
    ("animation",   r"animation|アニメ|動漫|การ์ตูน"),
    ("3d",          r"\b3D\b|\b3d\b|ASMR\s?3D|3DCG|Blender|เรนเดอร์"),
    ("asmr",        r"ASMR|asmr"),
]
# FORMAT: how it is stored, decided from the file extension (keyed bare, no dot).
VIDEO_EXT = r"mp4|mov|mkv|avi|webm|m4v|wmv|flv"
AUDIO_EXT = r"mp3|m4a|wav|flac|aac|opus|ogg"
IMAGE_EXT = r"jpg|jpeg|png|webp|gif|bmp"
ARCHIVE_EXT = r"zip|rar|7z|tar|gz"

SQUIRT_KW = re.compile(r"squirt|shiofuki|潮吹|น้ำพุ่ง|พุ่ง", re.I)
# "Nรูป" / "N รูป" / "Nรูป+Mคลิป" — the owner labels photo batches in filenames.
PHOTO_COUNT = re.compile(r"(\d[\d,]*)\s*รูป")
CLIP_COUNT = re.compile(r"(\d[\d,]*)\s*คลิป")
DURATION = re.compile(r"(\d+)\s*(?:นาที|ชม\.)(?:\s*(\d+)\s*วิ)?")
CREATOR_TAG = re.compile(r"\[([^\[\]]{2,60})\]")
# Bracket tags that are metadata, not an author handle.
NOISE_TAGS = re.compile(
    r"^\s*(?:มืด|อัพใหม่|รวม|คลิปสั้นๆ|รูป|ล่าสุด|สำรอง|คลิป)\s*$", re.I)
# "Nรูป", "Nคลิป", bare numbers, or a name glued onto a count phrase.
NOISE_COUNT = re.compile(r"^[\d\s.,:+-]*(?:รูป|คลิป|นาที|วิ|ชม\.|ไฟล์|อัน|P|1080|720|4K)?[\s\d.,:+-]*$", re.I)
# Distribution / fanbox tags, and adult-content catalog codes.
NOISE_HOSTS = re.compile(r"^(?:patreon|fanbox|twitter|fantasia|pixiv|dlsite|dmm|fc2|fc2-ppv|buyme)", re.I)
GLUED_COUNT = re.compile(r"\d[\d,]*\s*(?:รูป|คลิป)")


def extract_creators(names: list[str]) -> list[str]:
    """Author/series handles from [bracket] tags, keeping the most frequent.

    Drops metadata brackets ("มืด", "ล่าสุด"), count phrases glued onto the
    name ("26รูป KURU - Hololive"), distribution hosts, and catalog codes.
    """
    c: collections.Counter = collections.Counter()
    for n in names:
        for m in CREATOR_TAG.findall(n):
            t = m.strip()
            if NOISE_TAGS.match(t) or NOISE_COUNT.match(t) or NOISE_HOSTS.match(t):
                continue
            t = GLUED_COUNT.sub("", t).strip(" -–—")
            if len(t) < 2:
                continue
            c[t] += 1
    return [k for k, _ in c.most_common(8)]


def tag_folder(files: list[str]) -> dict:
    # Count whole-filename hits per rule (not per-file-any), so the dominant
    # content wins `content_primary` by evidence, not by table order.
    scores: collections.Counter = collections.Counter()
    for name, pat in CONTENT_RULES:
        rx = re.compile(pat, re.I)
        scores[name] = sum(1 for n in files if rx.search(n))
    content = [name for name, _ in CONTENT_RULES if scores[name]]
    content.sort(key=lambda name: (-scores[name], [r[0] for r in CONTENT_RULES].index(name)))
    # cosplay + animation in one filename ("คอสจาก Anime และเกม") is a real
    # crossover, so both are kept; content_primary only picks the sort group.

    exts = collections.Counter()
    for n in files:
        m = re.search(r"\.([a-z0-9]{2,5})$", n.strip().lower())
        exts[m.group(1) if m else "none"] += 1

    def ext_total(exts_rx):
        """Count files whose extension matches. Keyed on the extension itself,
        so a filename ending in `.getxfer.274.mega` counts as .mega, not .mp4."""
        rx = re.compile(exts_rx)
        return sum(v for k, v in exts.items() if rx.fullmatch(k))

    n_video, n_audio = ext_total(VIDEO_EXT), ext_total(AUDIO_EXT)
    n_image, n_zip = ext_total(IMAGE_EXT), ext_total(ARCHIVE_EXT)

    fmt = []
    if n_video:
        fmt.append("clip")
    if n_audio:
        fmt.append("audio")
    if n_image:
        fmt.append("photos")
    if n_zip:
        fmt.append("archive")
    if not fmt:
        fmt.append("other")

    squirt = [n for n in files if SQUIRT_KW.search(n)]
    uncen = [n for n in files if re.search(r"uncensored|uncen|decensored", n, re.I)]
    photos_n, clips_n, minutes = 0, 0, 0
    for n in files:
        m = PHOTO_COUNT.search(n)
        if m:
            photos_n = max(photos_n, int(m.group(1).replace(",", "")))
        m = CLIP_COUNT.search(n)
        if m:
            clips_n = max(clips_n, int(m.group(1).replace(",", "")))
        m = DURATION.search(n)
        if m:
            minutes += int(m.group(1))

    return {
        "content": content,
        "content_primary": content[0] if content else "",
        "format": fmt,
        "file_count": len(files),
        "clips": n_video + n_audio,
        "photos": n_image,
        "archives": n_zip,
        "creators": extract_creators(files),
        "squirt_evidence": bool(squirt),
        "squirt_files": squirt[:5],
        "uncensored": bool(uncen),
        "label_photo_count": photos_n,
        "label_clip_count": clips_n,
        "label_minutes": minutes,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--sample", action="store_true")
    args = ap.parse_args()

    prefix, items = app.load_collection()
    cache = json.loads(CACHE.read_text(encoding="utf-8"))

    tagged = 0
    skipped = 0
    for it in items:
        if it.get("dead") or it["id"] not in cache:
            skipped += 1
            continue
        info = tag_folder(cache[it["id"]].get("files", []))
        # Never overwrite the hand-curated flags (`squirting`, `solo_squirt`):
        # they carry the owner's own judgement, including for folders this
        # scan cannot reach (dead ones, or not yet cached). Filename evidence
        # lands in separate `squirt_evidence` / `squirt_files` keys instead.
        for k in ("content", "content_primary", "format", "file_count", "clips",
                  "photos", "archives", "creators", "squirt_evidence",
                  "squirt_files", "uncensored", "label_photo_count",
                  "label_clip_count", "label_minutes"):
            it[k] = info[k]
        tagged += 1

    content_c = collections.Counter(i["content_primary"] for i in items if "content_primary" in i)
    print(f"tagged {tagged} folders, skipped {skipped} (dead or not cached)")
    print("\ncontent_primary:")
    for k, v in content_c.most_common():
        print(f"  {k or '(unknown)':12} {v}")

    print("\nformat (item can carry several):")
    fmt_c = collections.Counter()
    for i in items:
        for f in i.get("format", []):
            fmt_c[f] += 1
    for k, v in fmt_c.most_common():
        print(f"  {k:10} {v}")

    multi = sum(1 for i in items if len(i.get("content", [])) > 1)
    print(f"\nitems with 2+ content tags: {multi}")
    print(f"squirt evidence in filenames: {sum(1 for i in items if i.get('squirt_evidence'))}")
    print(f"hand-set squirting flag:      {sum(1 for i in items if i.get('squirting'))}")
    print(f"uncensored in filenames:     {sum(1 for i in items if i.get('uncensored'))}")
    print(f"total clips: {sum(i.get('clips', 0) for i in items)}  "
          f"total photos: {sum(i.get('photos', 0) for i in items)}")

    if args.sample:
        print("\nsamples per content_primary:")
        seen: dict[str, int] = {}
        for i in items:
            cp = i.get("content_primary")
            if not cp or seen.get(cp, 0) >= 2:
                continue
            seen[cp] = seen.get(cp, 0) + 1
            print(f"\n  [{cp}] {i['title'][:50]}  ({i.get('file_count')} files, "
                  f"clips={i.get('clips')} photos={i.get('photos')})")
            print(f"    content={i.get('content')} format={i.get('format')}")
            print(f"    creators={i.get('creators')[:4]}")
            if i.get("squirt_files"):
                print(f"    squirt e.g. {i['squirt_files'][0][:80]}")

    if args.dry:
        print("\nDRY RUN — nothing written")
        return 0

    app.write_collection(prefix, items)
    print(f"\nwrote {DATA} ({len(items)} items)")
    OUT.write_text(json.dumps(
        [{k: i.get(k) for k in ("id", "title", "content", "format", "clips",
                                "photos", "creators", "squirt_evidence")}
         for i in items if "content" in i], ensure_ascii=False, indent=1),
        encoding="utf-8")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
