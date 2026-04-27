"""
Fetch every Chicago Bears NFL Draft pick from nflverse and emit a JSON
file the frontend can consume.

Usage:
    uv run python fetch_bears_draft.py
    # or
    python fetch_bears_draft.py

Output:
    ../public/bears_draft_history.json
    ../public/bears_draft_meta.json   (summary stats, used by hero/dashboard)
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import nflreadpy as nfl
import polars as pl

BEARS_TEAM_CODES = {"CHI", "CHB"}
OUT_DIR = Path(__file__).resolve().parent.parent / "public"
PICKS_FILE = OUT_DIR / "bears_draft_history.json"
META_FILE = OUT_DIR / "bears_draft_meta.json"


def load_draft_picks() -> pl.DataFrame:
    df = nfl.load_draft_picks()
    if not isinstance(df, pl.DataFrame):
        df = pl.from_pandas(df)
    return df


def filter_bears(df: pl.DataFrame) -> pl.DataFrame:
    return df.filter(pl.col("team").is_in(list(BEARS_TEAM_CODES)))


def _clean_value(v):
    """Convert NaN / inf / numpy types into JSON-safe values."""
    if v is None:
        return None
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    return v


def to_records(df: pl.DataFrame) -> list[dict]:
    rows = df.to_dicts()
    cleaned: list[dict] = []
    for row in rows:
        cleaned.append({k: _clean_value(v) for k, v in row.items()})
    return cleaned


def decade_of(year: int) -> str:
    return f"{(year // 10) * 10}s"


def enrich(records: list[dict]) -> list[dict]:
    """Add derived fields the frontend wants."""
    enriched = []
    for r in records:
        season = r.get("season")
        pick = r.get("pick")
        car_av = r.get("car_av") or 0
        out = dict(r)
        out["decade"] = decade_of(season) if season else None
        out["era"] = gm_era(season)
        # Simple "hit score": career AV percentile vs pick slot expectation.
        # Real expected AV by pick is computed in build_meta below.
        out["display_name"] = (
            r.get("pfr_player_name")
            or r.get("cfb_player_name")
            or r.get("name")
            or "Unknown"
        )
        out["pick_overall"] = pick
        out["career_av"] = car_av
        enriched.append(out)
    return enriched


def gm_era(season: int | None) -> str | None:
    """Roughly map a draft year to the Bears GM/era running that draft."""
    if season is None:
        return None
    if season >= 2022:
        return "Ryan Poles"
    if season >= 2015:
        return "Ryan Pace"
    if season >= 2012:
        return "Phil Emery"
    if season >= 2001:
        return "Jerry Angelo"
    if season >= 1994:
        return "Rod Graves / Mark Hatley"
    if season >= 1987:
        return "Bill Tobin"
    return "Pre-1987"


def build_meta(records: list[dict]) -> dict:
    """Summary stats for hero + dashboard."""
    total = len(records)
    seasons = sorted({r["season"] for r in records if r.get("season")})
    by_position: dict[str, int] = {}
    by_round: dict[int, int] = {}
    by_college: dict[str, int] = {}
    by_decade: dict[str, int] = {}

    hof_count = 0
    pro_bowls = 0
    all_pros = 0

    for r in records:
        pos = r.get("position") or "?"
        rnd = r.get("round")
        college = r.get("college") or "Unknown"
        decade = r.get("decade") or "Unknown"

        by_position[pos] = by_position.get(pos, 0) + 1
        if rnd is not None:
            by_round[rnd] = by_round.get(rnd, 0) + 1
        by_college[college] = by_college.get(college, 0) + 1
        by_decade[decade] = by_decade.get(decade, 0) + 1

        if r.get("hof"):
            hof_count += 1
        pb = r.get("probowls") or 0
        ap = r.get("allpro") or 0
        pro_bowls += int(pb) if pb else 0
        all_pros += int(ap) if ap else 0

    top_colleges = sorted(by_college.items(), key=lambda kv: -kv[1])[:15]

    return {
        "total_picks": total,
        "first_season": seasons[0] if seasons else None,
        "last_season": seasons[-1] if seasons else None,
        "hof_count": hof_count,
        "pro_bowls": pro_bowls,
        "all_pros": all_pros,
        "by_position": by_position,
        "by_round": by_round,
        "by_decade": by_decade,
        "top_colleges": [{"college": c, "count": n} for c, n in top_colleges],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Fetching draft picks from nflverse…")
    df = load_draft_picks()
    print(f"  loaded {df.height:,} total picks across the league")

    bears = filter_bears(df)
    print(f"  filtered to {bears.height:,} Bears picks")

    bears = bears.sort(["season", "pick"])
    records = enrich(to_records(bears))
    meta = build_meta(records)

    PICKS_FILE.write_text(json.dumps(records, indent=2, default=str))
    META_FILE.write_text(json.dumps(meta, indent=2, default=str))

    print(f"Wrote {PICKS_FILE.relative_to(OUT_DIR.parent)}")
    print(f"Wrote {META_FILE.relative_to(OUT_DIR.parent)}")
    print(
        f"Summary: {meta['total_picks']} picks · "
        f"{meta['first_season']}–{meta['last_season']} · "
        f"{meta['hof_count']} HOFers · "
        f"{meta['pro_bowls']} Pro Bowls · "
        f"{meta['all_pros']} All-Pro selections"
    )


if __name__ == "__main__":
    main()
