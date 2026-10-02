"""Shared maintenance paths. Importing this module never runs a job."""
import json
import os
import pathlib

SCRIPTS_ROOT = pathlib.Path(__file__).resolve().parents[1]
ROOT = SCRIPTS_ROOT.parent


def get_settings(scripts_root=SCRIPTS_ROOT):
    scripts_root = pathlib.Path(scripts_root).resolve()
    try:
        settings = json.loads((scripts_root / "config.example.json").read_text(encoding="utf-8-sig"))
        if not isinstance(settings, dict):
            raise ValueError("config.example.json must contain an object")
        local = scripts_root / "config.local.json"
        if local.exists():
            overrides = json.loads(local.read_text(encoding="utf-8-sig"))
            if not isinstance(overrides, dict):
                raise ValueError("config.local.json must contain an object")
            if set(overrides) - set(settings):
                raise ValueError("Unknown setting in config.local.json")
            settings.update(overrides)
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError("Cannot read scripts configuration; check paths and JSON syntax") from exc
    for key in ("rclonePath", "downloadRoot", "logRoot", "driveRemote", "remoteRoot", "linkSourceRoot"):
        if not isinstance(settings.get(key), str) or not settings[key].strip():
            raise ValueError(f"Setting {key} must be a nonempty string")
    import re
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", settings["driveRemote"]):
        raise ValueError("driveRemote must be a remote name without a colon or spaces")
    if re.search(r"[:\r\n]", settings["remoteRoot"]) or settings["remoteRoot"].startswith("/"):
        raise ValueError("remoteRoot must be a relative remote folder without a colon")
    for key in ("rclonePath", "downloadRoot", "logRoot", "linkSourceRoot"):
        value = os.path.expandvars(settings[key])
        if re.search(r"%[^%]+%", value):
            raise ValueError(f"Environment variable in {key} is not defined; set an explicit path")
        value = pathlib.Path(value)
        settings[key] = value if value.is_absolute() else scripts_root / value
    return settings
