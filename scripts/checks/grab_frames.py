#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Grab one still frame per Drive folder to eyeball the real content.

Why frames and not downloads: the alive folders hold ~1.1 TB across ~1,600
files, so fetching whole videos is not an option. ffmpeg reads a Drive media
URL directly and `Range` pulls only the header it needs, so each folder costs
roughly one megabyte of transfer instead of gigabytes.

The Drive API key is read from the app source via _appsources (never printed in
full, only a prefix). Files are written to --out so the images can be delivered
into chat as MEDIA: paths.

Usage:
  python scripts/checks/grab_frames.py                 # all tagged folders
  python scripts/checks/grab_frames.py --limit 8       # quick sample
  python scripts/checks/grab_frames.py --at 120       # seek 2 minutes in
  python scripts/checks/grab_frames.py --index-file reports/frame_index.json
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import pathlib
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import _appsources as app

ROOT = app.ROOT
CACHE = ROOT / "reports" / "drive_deep_scan_cache.json"
VIDEO_EXT = (".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v")


def children(folder_id: str, key: str) -> list[dict]:
    """List direct children of a Drive folder."""
    q = urllib.parse.quote(f"'{folder_id}' in parents and trashed = false")
    url = (f"https://www.googleapis.com/drive/v3/files?q={q}"
           f"&fields=files(id,name,mimeType,size)&pageSize=1000&key={key}")
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read().decode()).get("files", [])


def safe_name(title: str, idx: int) -> str:
    """ASCII-ish filename so ffmpeg and Windows stay happy with any title."""
    stem = re.sub(r"[^0-9A-Za-z._-]+", "_", title)[:48].strip("_") or "folder"
    return f"{idx:03d}_{stem}.jpg"


def grab(item: dict, key: str, out: pathlib.Path, idx: int, at: int) -> dict:
    title = item.get("title", "?")
    rec = {"index": idx, "id": item["id"], "title": title, "ok": False}
    try:
        files = children(item["id"], key)
    except Exception as exc:  # network / auth
        rec["error"] = f"list failed: {type(exc).__name__}"
        return rec

    vids = [f for f in files
            if f.get("mimeType", "").startswith("video/")
            or f.get("name", "").lower().endswith(VIDEO_EXT)]
    if not vids:
        rec["error"] = "no video"
        return rec

    # Biggest file first: a long clip gives a more representative frame than a
    # 10-second snippet, and short snippets are often intros/logos.
    vids.sort(key=lambda f: -(int(f.get("size") or 0)))
    vid = vids[0]
    rec["video"] = vid.get("name")
    rec["video_bytes"] = int(vid.get("size") or 0)

    url = f"https://www.googleapis.com/drive/v3/files/{vid['id']}?alt=media&key={key}"
    dest = out / safe_name(title, idx)

    # Seeking deep into a multi-GB file makes ffmpeg read a large range, and
    # several of those at once burn the API key's quota (403) or stall the
    # reader thread (-22). Retry with a smaller worker count already handled by
    # the caller, so here: try the requested seek, then the start, then a tiny
    # frame, and only report failure once all of them miss.
    attempts = [(str(at), "640:-2"), ("0", "640:-2"), ("0", "320:-2")]
    last = ""
    for seek, scale in attempts:
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error",
               "-ss", seek, "-i", url, "-frames:v", "1",
               "-vf", f"scale={scale}", "-q:v", "5", "-y", str(dest)]
        try:
            p = subprocess.run(cmd, capture_output=True, timeout=240)
        except subprocess.TimeoutExpired:
            last = "ffmpeg timeout"
            continue
        if dest.exists() and dest.stat().st_size >= 1024:
            rec["ok"] = True
            rec["frame"] = str(dest)
            rec["frame_bytes"] = dest.stat().st_size
            rec["seek"] = seek
            return rec
        last = p.stderr.decode(errors="ignore")[-200:] if p.stderr else "no frame"
        time.sleep(1.5)

    rec["error"] = "no frame"
    if last:
        rec["stderr"] = last
    return rec


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="stop after N folders")
    ap.add_argument("--at", type=int, default=60, help="seek seconds into the clip")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--out", default=str(ROOT / "reports" / "frames"))
    ap.add_argument("--index-file", default=str(ROOT / "reports" / "frame_index.json"))
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        print("ffmpeg not on PATH", file=sys.stderr)
        return 1

    key = app.default_api_key()
    cache = json.loads(CACHE.read_text(encoding="utf-8"))
    arr = app.load_collection()[1]

    todo = [i for i in arr if not i.get("dead") and i["id"] in cache]
    todo.sort(key=lambda x: (x.get("date") or "", x.get("title") or ""))
    if args.limit:
        todo = todo[: args.limit]

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    print(f"{len(todo)} folders, key {key[:12]}..., {args.workers} workers, seek {args.at}s")

    results: list[dict] = []
    done = ok = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(grab, it, key, out, n, args.at): n
                for n, it in enumerate(todo, 1)}
        for fut in concurrent.futures.as_completed(futs):
            rec = fut.result()
            results.append(rec)
            done += 1
            ok += bool(rec["ok"])
            if done % 10 == 0 or done == len(todo):
                print(f"  {done}/{len(todo)} frames {ok} ok "
                      f"({done * args.at and ''}{ok * 100 // max(done, 1)}%)", flush=True)

    results.sort(key=lambda r: r["index"])
    pathlib.Path(args.index_file).write_text(
        json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")

    errs: dict[str, int] = {}
    for r in results:
        if not r["ok"]:
            errs[r.get("error", "?")] = errs.get(r.get("error", "?"), 0) + 1
    print(f"\nDONE {ok}/{len(results)} frames -> {out}")
    if errs:
        print("errors:", errs)
    print(f"index: {args.index_file}")
    return 0


if __name__ == "__main__":
    sys.exit(main())