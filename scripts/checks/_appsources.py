"""Shared helpers for the daily maintenance scripts.

The app is being modularised: index.html keeps only the HTML shell and loads
styles.css, collections-data.js and the per-feature JS modules as <script src>.
Scripts must therefore never assume a symbol still lives inside index.html.
"""

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]

# index.html first (current layout), then the extracted modules (post-split).
APP_SOURCES = (
    "index.html",
    "collections-data.js",
    "collection-viewer.js",
    "media-lightbox.js",
    "video-player.js",
    "drive-explorer.js",
)


def app_sources():
    """Return (name, text) for every app source that exists on disk."""
    out = []
    for name in APP_SOURCES:
        path = ROOT / name
        if path.exists():
            out.append((name, path.read_text(encoding="utf-8")))
    return out


def grep_app(pattern):
    """Search every app source for pattern.

    Returns the first match (the app itself holds the first/authoritative
    definition). Raises AssertionError if no source matches, so a broken
    layout fails loudly instead of silently handing scripts a wrong value.
    """
    for name, text in app_sources():
        m = re.search(pattern, text)
        if m:
            return name, m
    raise AssertionError(
        f"pattern {pattern!r} not found in any of: "
        + ", ".join(n for n, _ in app_sources())
    )


def default_api_key():
    """DEFAULT_APIKEY from the app (index.html or its modules)."""
    _, m = grep_app(r'DEFAULT_APIKEY\s*=\s*"([^"]+)"')
    return m.group(1)


def collection():
    """XBEP_COLLECTION from collections-data.js (never from index.html)."""
    path = ROOT / "collections-data.js"
    if not path.exists():
        raise AssertionError("collections-data.js missing — run the Phase 2 split first")
    m = re.search(
        r"const XBEP_COLLECTION = (\[.*?\]);",
        path.read_text(encoding="utf-8"),
        flags=re.DOTALL,
    )
    if not m:
        raise AssertionError("XBEP_COLLECTION not found in collections-data.js")
    arr = json.loads(m.group(1))
    if not isinstance(arr, list) or not arr:
        raise AssertionError("XBEP_COLLECTION is empty or not a list")
    return arr


def load_collection():
    """Return (prefix, items) so callers can rewrite the file byte-identically.

    prefix is everything up to and including the array's opening `[`, so a
    round-trip through write_collection() preserves the header comments and
    the `const XBEP_COLLECTION = ` declaration.
    """
    path = ROOT / "collections-data.js"
    raw = path.read_text(encoding="utf-8-sig")
    key = raw.index("XBEP_COLLECTION")
    start = raw.index("[", key)
    body = raw[start:].rstrip()
    if not body.endswith("];"):
        raise AssertionError("XBEP_COLLECTION is not terminated by '];'")
    return raw[: start + 1], json.loads(body[:-1])


def write_collection(prefix, items):
    """Rewrite collections-data.js, keeping the one-line array shape.

    Matches tools/collection_data.js inject: `const XBEP_COLLECTION = [...];`
    """
    path = ROOT / "collections-data.js"
    body = json.dumps(items, ensure_ascii=False)[1:]  # drop the opening `[`
    path.write_text(prefix + body + ";\n", encoding="utf-8")