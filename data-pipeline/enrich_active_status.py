"""
Cross-reference Bears draft picks against the most recent NFL season's
roster data so the frontend can answer "is this player still in the NFL?"
empirically rather than from a backward-looking PFR last-season heuristic.

Two empirical signals get merged onto each pick:

  1. Sleeper player record (already populated by enrich_photos.py): provides
     `current_team` and `current_status` (Active / Practice Squad / Injured
     Reserve / etc). Sleeper refreshes daily.

  2. nflreadpy.load_rosters() for the most recent season: per-week roster
     entries for every player on every team. If a Bears draft pick appears
     on ANY 2025 roster, they were on an NFL active list in the most recent
     completed season.

The output is a `roster_status` field on each pick with one of:
  - "active"           — currently on an NFL roster (Sleeper says so)
  - "ir_or_pup"        — currently rostered but on IR / PUP / Suspended
  - "practice_squad"   — currently on a practice squad
  - "rostered_2025"    — appeared on a 2025 roster (last season) but Sleeper
                         shows no current team (likely a recent retiree or
                         in free-agency limbo)
  - "rookie"           — drafted this year, hasn't played yet
  - "retired"          — last season older than the most recent
  - "unknown"          — couldn't be matched against either source

Run after enrich_photos.py.
"""

from __future__ import annotations

import json
from pathlib import Path

import nflreadpy as nfl
import polars as pl

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "public"
PICKS_FILE = PUBLIC_DIR / "bears_draft_history.json"


# Sleeper status values that mean "currently on a roster, just not the active 53"
ON_ROSTER_BUT_INACTIVE = {
    "Injured Reserve",
    "Physically Unable to Perform",
    "Non Football Injury",
    "Suspended",
    "Reserve/Retired",  # offseason "Reserve" list — Sleeper sometimes uses this
    "Inactive",
}
PRACTICE_SQUAD_STATUSES = {"Practice Squad"}


def status_from_sleeper(team: str | None, status: str | None) -> str | None:
    if not team:
        return None
    if status in PRACTICE_SQUAD_STATUSES:
        return "practice_squad"
    if status in ON_ROSTER_BUT_INACTIVE:
        return "ir_or_pup"
    if status == "Active" or status is None:
        return "active"
    # Any other status with a team — treat as on-roster.
    return "active"


def main() -> None:
    if not PICKS_FILE.exists():
        raise SystemExit(f"Missing {PICKS_FILE}; run earlier pipeline steps first.")

    picks = json.loads(PICKS_FILE.read_text())
    latest_season = max((p.get("season") or 0) for p in picks)
    last_completed = latest_season - 1  # for 2026 draft year, last completed = 2025

    # Pull rosters for the most recent completed season.
    print(f"Pulling NFL rosters for {last_completed}…")
    rosters = nfl.load_rosters([last_completed])
    # Build a set of pfr_ids and gsis_ids that appeared on any roster.
    pfr_set: set[str] = set()
    gsis_set: set[str] = set()
    name_set: set[tuple[str, str]] = set()
    for row in rosters.iter_rows(named=True):
        pfr = (row.get("pfr_id") or "").strip()
        if pfr:
            pfr_set.add(pfr)
        gsis = (row.get("gsis_id") or "").strip()
        if gsis:
            gsis_set.add(gsis)
        first = (row.get("first_name") or "").strip().lower()
        last = (row.get("last_name") or "").strip().lower()
        if first and last:
            name_set.add((last, first))
    print(f"  {rosters.height:,} roster entries · {len(pfr_set):,} unique PFR ids")

    # Score each pick
    counts = {"active": 0, "practice_squad": 0, "ir_or_pup": 0,
              "rostered_2025": 0, "rookie": 0, "retired": 0, "unknown": 0}
    for p in picks:
        season = p.get("season") or 0
        sleeper_team = p.get("current_team")
        sleeper_status = p.get("current_status")

        # 2026 rookies — overwrite to "rookie" unless Sleeper actually shows them on a team.
        if season >= latest_season and not p.get("games") and (p.get("to") is None):
            sleeper_kind = status_from_sleeper(sleeper_team, sleeper_status)
            if sleeper_kind:
                p["roster_status"] = sleeper_kind
                p["roster_evidence"] = "sleeper"
            else:
                p["roster_status"] = "rookie"
                p["roster_evidence"] = "draft_year"
            counts[p["roster_status"]] += 1
            continue

        sleeper_kind = status_from_sleeper(sleeper_team, sleeper_status)
        if sleeper_kind:
            p["roster_status"] = sleeper_kind
            p["roster_evidence"] = "sleeper"
            counts[sleeper_kind] += 1
            continue

        # Check rosters for the last completed season — STRICTLY by ID.
        # Name-only matching is removed: too many same-name collisions across
        # eras (e.g. a 1981 Lonnie Johnson collides with an active 2025 one).
        pfr = (p.get("pfr_player_id") or "").strip()
        gsis = (p.get("gsis_id") or "").strip()
        on_2025 = (pfr and pfr in pfr_set) or (gsis and gsis in gsis_set)

        if on_2025:
            p["roster_status"] = "rostered_2025"
            p["roster_evidence"] = f"nflverse_{last_completed}"
            counts["rostered_2025"] += 1
            continue

        p["roster_status"] = "retired"
        p["roster_evidence"] = "no_recent_roster"
        counts["retired"] += 1

    # Coverage report
    print("\nRoster status counts:")
    for k, v in counts.items():
        bar = "█" * int(60 * v / max(1, len(picks)))
        print(f"  {k:<18} {v:>3}  {bar}")

    PICKS_FILE.write_text(json.dumps(picks, indent=2, default=str))
    print(f"\nUpdated {PICKS_FILE.name} with roster_status field.")


if __name__ == "__main__":
    main()
