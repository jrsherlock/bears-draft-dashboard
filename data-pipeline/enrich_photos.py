"""
Enrich bears_draft_history.json with player photo URLs by matching against
the Sleeper /v1/players/nfl directory. Sleeper exposes ESPN ID, Sleeper ID,
GSIS ID, and PFR ID for most players, so we can match cleanly off the IDs we
already have from nflverse.

Photo URL strategy (high-quality first, fall back gracefully):
  1. ESPN headshot:  https://a.espncdn.com/i/headshots/nfl/players/full/{espn_id}.png
  2. Sleeper thumb:  https://sleepercdn.com/content/nfl/players/thumb/{sleeper_id}.jpg

Run AFTER fetch_bears_draft.py. We mutate the JSON in place.

Usage:
    python enrich_photos.py
"""

from __future__ import annotations

import json
from pathlib import Path

import urllib.request

SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl"
SLEEPER_CACHE = Path(__file__).resolve().parent / ".cache" / "sleeper_players.json"
PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"
PICKS_FILE = PUBLIC_DIR / "bears_draft_history.json"


def load_sleeper_directory() -> dict:
    SLEEPER_CACHE.parent.mkdir(parents=True, exist_ok=True)
    if SLEEPER_CACHE.exists():
        print(f"Using cached Sleeper directory at {SLEEPER_CACHE}")
        return json.loads(SLEEPER_CACHE.read_text())

    print(f"Downloading Sleeper player directory ({SLEEPER_PLAYERS_URL})…")
    req = urllib.request.Request(
        SLEEPER_PLAYERS_URL, headers={"User-Agent": "bears-draft-dashboard/1.0"}
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read().decode("utf-8")
    data = json.loads(raw)
    SLEEPER_CACHE.write_text(raw)
    print(f"  cached to {SLEEPER_CACHE} ({len(data):,} players)")
    return data


def build_indexes(directory: dict) -> tuple[dict, dict, dict]:
    """Index the Sleeper directory by gsis_id, pfr_id, and (last, first)."""
    by_gsis: dict[str, dict] = {}
    by_pfr: dict[str, dict] = {}
    by_name: dict[tuple[str, str], dict] = {}

    for sleeper_id, p in directory.items():
        if not isinstance(p, dict):
            continue
        p["_sleeper_id"] = sleeper_id
        gsis = (p.get("gsis_id") or "").strip()
        pfr = (p.get("pfr_id") or "").strip()
        first = (p.get("first_name") or "").strip().lower()
        last = (p.get("last_name") or "").strip().lower()

        if gsis:
            by_gsis[gsis] = p
        if pfr:
            by_pfr[pfr] = p
        if first and last:
            by_name.setdefault((last, first), p)

    return by_gsis, by_pfr, by_name


def find_match(pick: dict, by_gsis: dict, by_pfr: dict, by_name: dict) -> dict | None:
    gsis = pick.get("gsis_id")
    if gsis and gsis in by_gsis:
        return by_gsis[gsis]
    pfr = pick.get("pfr_player_id")
    if pfr and pfr in by_pfr:
        return by_pfr[pfr]

    name = pick.get("display_name") or ""
    parts = name.strip().split()
    if len(parts) >= 2:
        first = parts[0].lower()
        last = parts[-1].lower()
        cand = by_name.get((last, first))
        if cand and (cand.get("position") or "").upper() == (pick.get("position") or "").upper():
            return cand
    return None


def photo_urls_for(sleeper_player: dict) -> dict:
    espn_id = sleeper_player.get("espn_id")
    sleeper_id = sleeper_player.get("_sleeper_id")
    out = {}
    if espn_id:
        out["espn"] = f"https://a.espncdn.com/i/headshots/nfl/players/full/{espn_id}.png"
    if sleeper_id:
        out["sleeper"] = f"https://sleepercdn.com/content/nfl/players/thumb/{sleeper_id}.jpg"
    return out


def main() -> None:
    if not PICKS_FILE.exists():
        raise SystemExit(f"Run fetch_bears_draft.py first — missing {PICKS_FILE}")

    picks = json.loads(PICKS_FILE.read_text())

    directory = load_sleeper_directory()
    by_gsis, by_pfr, by_name = build_indexes(directory)

    matched = 0
    espn_count = 0
    sleeper_count = 0

    for p in picks:
        m = find_match(p, by_gsis, by_pfr, by_name)
        if not m:
            p["photos"] = None
            continue
        urls = photo_urls_for(m)
        if not urls:
            p["photos"] = None
            continue
        p["photos"] = urls
        p["sleeper_id"] = m.get("_sleeper_id")
        if m.get("espn_id"):
            p["espn_id"] = m["espn_id"]
        matched += 1
        if "espn" in urls:
            espn_count += 1
        if "sleeper" in urls:
            sleeper_count += 1

    PICKS_FILE.write_text(json.dumps(picks, indent=2, default=str))
    print(
        f"Matched {matched}/{len(picks)} picks · "
        f"{espn_count} ESPN headshots · {sleeper_count} Sleeper thumbs"
    )


if __name__ == "__main__":
    main()
