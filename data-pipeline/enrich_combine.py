"""
Pull every player's NFL Combine measurements from nflverse, compute their
position-specific percentile for each of the six athletic tests, and attach
the result to every Bears pick. The frontend renders this as a radar chart.

We score each measurement as a 0..100 percentile *within the player's
position group*, so a 4.55 forty looks elite for a tackle but average for a
cornerback. Lower-is-better metrics (forty, cone, shuttle) flip the percentile.

Usage:
    python enrich_combine.py
"""

from __future__ import annotations

import json
from pathlib import Path

import nflreadpy as nfl
import polars as pl

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "public"
PICKS_FILE = PUBLIC_DIR / "bears_draft_history.json"

# Position-grouping for percentiles. We bucket related positions so a sample
# isn't pathologically thin. (e.g. all interior O-line tested together.)
POSITION_GROUPS = {
    "QB": "QB",
    "RB": "RB", "FB": "RB", "HB": "RB",
    "WR": "WR",
    "TE": "TE",
    "OT": "OL", "OG": "OL", "OC": "OL", "C": "OL", "G": "OL", "T": "OL", "OL": "OL",
    "DT": "DL", "DE": "DL", "DL": "DL", "NT": "DL", "EDGE": "DL",
    "LB": "LB", "ILB": "LB", "OLB": "LB", "MLB": "LB",
    "CB": "DB", "S": "DB", "FS": "DB", "SS": "DB", "DB": "DB", "SAF": "DB",
    "K": "ST", "P": "ST", "LS": "ST",
}

# Metric defs: (column, lower_is_better)
METRICS = [
    ("forty", True),
    ("vertical", False),
    ("broad_jump", False),
    ("bench", False),
    ("cone", True),
    ("shuttle", True),
]

DISPLAY_LABELS = {
    "forty": "40 yd",
    "vertical": "Vertical",
    "broad_jump": "Broad",
    "bench": "Bench",
    "cone": "3-cone",
    "shuttle": "Shuttle",
}


def position_group(pos: str | None) -> str | None:
    if not pos:
        return None
    return POSITION_GROUPS.get(pos.upper(), None)


def main() -> None:
    if not PICKS_FILE.exists():
        raise SystemExit(f"Missing {PICKS_FILE}; run fetch_bears_draft.py first.")

    print("Loading combine data from nflverse…")
    df = nfl.load_combine()
    print(f"  {df.height:,} combine records, {df['season'].min()}–{df['season'].max()}")

    # Normalise the position column into a group, drop rows we can't classify.
    df = df.with_columns(
        pl.col("pos")
        .map_elements(lambda p: position_group(p), return_dtype=pl.String)
        .alias("pos_group")
    ).filter(pl.col("pos_group").is_not_null())

    # Compute percentiles within each pos_group for every metric.
    for col, lower_better in METRICS:
        # Rank within group; rank=1 means smallest. We want: score 100 = elite.
        ranked = df.with_columns(
            pl.col(col).rank("ordinal").over("pos_group").alias("__rank"),
            pl.col(col)
            .is_not_null()
            .cast(pl.Int32)
            .sum()
            .over("pos_group")
            .alias("__count"),
        )
        # Percentile in [0..1]. Null values stay null.
        pct_expr = (
            pl.when(pl.col(col).is_null())
            .then(None)
            .otherwise(
                # If lower is better, invert.
                (pl.col("__count") - pl.col("__rank") + 1) / pl.col("__count")
                if lower_better
                else pl.col("__rank") / pl.col("__count")
            )
        )
        df = ranked.with_columns(pct_expr.alias(f"{col}_pct")).drop(
            ["__rank", "__count"]
        )

    # Build a lookup keyed by pfr_id (best) and (lower(name), season) (fallback).
    by_pfr: dict[str, dict] = {}
    by_name_season: dict[tuple[str, int], dict] = {}
    for row in df.iter_rows(named=True):
        pfr = (row.get("pfr_id") or "").strip()
        record = {
            "position_group": row["pos_group"],
            "height": row.get("ht"),
            "weight": row.get("wt"),
            "metrics": {
                m: {
                    "value": row.get(m),
                    "percentile": row.get(f"{m}_pct"),
                    "label": DISPLAY_LABELS[m],
                    "lower_better": lower_better,
                }
                for m, lower_better in METRICS
                if row.get(m) is not None
            },
        }
        if pfr:
            by_pfr[pfr] = record
        name = (row.get("player_name") or "").strip().lower()
        season = row.get("season")
        if name and season:
            by_name_season.setdefault((name, int(season)), record)

    picks = json.loads(PICKS_FILE.read_text())

    matched = 0
    for p in picks:
        if p.get("season", 0) < 2000:
            p["combine"] = None
            continue
        pfr = (p.get("pfr_player_id") or "").strip()
        record = None
        if pfr and pfr in by_pfr:
            record = by_pfr[pfr]
        else:
            name = (p.get("display_name") or "").strip().lower()
            key = (name, p.get("season") or 0)
            record = by_name_season.get(key)

        if record and record["metrics"]:
            p["combine"] = record
            matched += 1
        else:
            p["combine"] = None

    PICKS_FILE.write_text(json.dumps(picks, indent=2, default=str))

    # Coverage report
    by_decade: dict[str, list[int]] = {}
    for p in picks:
        d = p.get("decade") or "?"
        slot = by_decade.setdefault(d, [0, 0])
        slot[1] += 1
        if p.get("combine"):
            slot[0] += 1
    print(f"\nMatched combine data for {matched}/{len(picks)} picks.")
    print("Coverage by decade (combine itself starts 2000):")
    for d in sorted(by_decade):
        ok, total = by_decade[d]
        bar = "█" * int(20 * ok / total) if total else ""
        print(f"  {d}: {ok:>3}/{total:<3}  {bar}")


if __name__ == "__main__":
    main()
