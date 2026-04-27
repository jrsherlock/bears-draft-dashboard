"""
Fallback scraper: pulls a single year of Chicago Bears NFL Draft picks from
Wikipedia and merges them into bears_draft_history.json.

Use this for years that nflverse hasn't published yet (typically the most
recent draft, since nflverse releases lag a few days to a few weeks). Once
nflverse is updated, fetch_bears_draft.py will overwrite the synthesized
records — just re-run the pipeline.

Usage:
    python fetch_wikipedia_draft.py 2026

Records produced match the schema written by fetch_bears_draft.py so the
frontend doesn't need conditional logic. Career stats are zeroed out (the
players haven't taken a snap yet).
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup, Tag

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"
PICKS_FILE = PUBLIC_DIR / "bears_draft_history.json"
META_FILE = PUBLIC_DIR / "bears_draft_meta.json"


def gm_era(season: int) -> str | None:
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


def fetch_wiki(year: int) -> str:
    url = f"https://en.wikipedia.org/wiki/{year}_NFL_draft"
    req = urllib.request.Request(url, headers={"User-Agent": "bears-draft-dashboard/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8")


def parse_bears_picks(html: str, year: int) -> list[dict]:
    """Parse the consolidated draft table and pull every Bears pick.

    Wikipedia's modern draft articles use a single sortable wikitable with
    columns: [empty, Round, Pick, Team, Player, Position, College, Notes].
    Older articles split into one wikitable per round; we handle both.
    """
    soup = BeautifulSoup(html, "lxml")
    picks: list[dict] = []

    for table in soup.find_all("table", class_="wikitable"):
        if "Chicago Bears" not in table.get_text():
            continue
        # Round fallback when the table is per-round (older articles)
        prev_heading = table.find_previous(["h2", "h3", "h4"])
        round_from_heading = None
        if prev_heading:
            m = re.search(r"round\s+(\w+)", prev_heading.get_text().lower())
            if m:
                round_from_heading = word_to_int(m.group(1))

        for row in table.find_all("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) < 5:
                continue
            text_cells = [c.get_text(" ", strip=True) for c in cells]
            try:
                team_idx = next(
                    i for i, t in enumerate(text_cells) if "Chicago Bears" in t
                )
            except StopIteration:
                continue

            # Walk left from the team column looking for round + pick numbers.
            nums_left = [t for t in text_cells[:team_idx] if t.strip().isdigit()]
            round_num: int | None = None
            pick_num: int | None = None
            if len(nums_left) >= 2:
                round_num = int(nums_left[-2])
                pick_num = int(nums_left[-1])
            elif len(nums_left) == 1:
                pick_num = int(nums_left[-1])
                round_num = round_from_heading
            else:
                continue

            try:
                player = clean_text(text_cells[team_idx + 1])
                position = clean_text(text_cells[team_idx + 2]).upper()
                college = clean_text(text_cells[team_idx + 3])
            except IndexError:
                continue

            player = re.sub(r"\s+from\s+.+$", "", player).strip()
            current_round = round_num

            picks.append(
                {
                    "season": year,
                    "round": current_round,
                    "pick": pick_num,
                    "pick_overall": pick_num,
                    "team": "CHI",
                    "position": position,
                    "side": None,
                    "category": None,
                    "pfr_player_id": None,
                    "pfr_player_name": player,
                    "cfb_player_id": None,
                    "gsis_id": None,
                    "display_name": player,
                    "college": college,
                    "age": None,
                    "to": None,
                    "career_av": None,
                    "car_av": None,
                    "w_av": None,
                    "dr_av": None,
                    "games": None,
                    "seasons_started": None,
                    "probowls": 0,
                    "allpro": 0,
                    "hof": False,
                    "pass_attempts": None,
                    "pass_completions": None,
                    "pass_yards": None,
                    "pass_tds": None,
                    "pass_ints": None,
                    "rush_atts": None,
                    "rush_yards": None,
                    "rush_tds": None,
                    "receptions": None,
                    "rec_yards": None,
                    "rec_tds": None,
                    "def_solo_tackles": None,
                    "def_ints": None,
                    "def_sacks": None,
                    "decade": f"{(year // 10) * 10}s",
                    "era": gm_era(year),
                    "photos": None,
                }
            )
    return picks


def word_to_int(word: str) -> int | None:
    word = word.strip().lower()
    table = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "eleven": 11, "twelve": 12,
    }
    if word in table:
        return table[word]
    if word.isdigit():
        return int(word)
    return None


def clean_text(s: str) -> str:
    s = re.sub(r"\[\d+\]", "", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def merge_into_history(new_picks: list[dict], year: int) -> None:
    existing = json.loads(PICKS_FILE.read_text()) if PICKS_FILE.exists() else []
    # Drop any existing rows for that year (so nflverse-truth wins on next run,
    # and re-running this script doesn't duplicate)
    existing = [p for p in existing if p.get("season") != year]
    combined = existing + new_picks
    combined.sort(key=lambda p: (p["season"], p["pick"]))
    PICKS_FILE.write_text(json.dumps(combined, indent=2, default=str))

    # Fully recompute meta so the dashboard reflects newly-added picks.
    from collections import Counter
    from datetime import datetime, timezone

    meta = json.loads(META_FILE.read_text()) if META_FILE.exists() else {}
    by_pos: Counter = Counter()
    by_rnd: Counter = Counter()
    by_dec: Counter = Counter()
    by_col: Counter = Counter()
    hof = pb = ap = 0
    for p in combined:
        by_pos[p.get("position") or "?"] += 1
        if p.get("round") is not None:
            by_rnd[p["round"]] += 1
        by_dec[p.get("decade") or "Unknown"] += 1
        by_col[p.get("college") or "Unknown"] += 1
        if p.get("hof"):
            hof += 1
        pb += int(p.get("probowls") or 0)
        ap += int(p.get("allpro") or 0)

    meta.update(
        {
            "total_picks": len(combined),
            "first_season": min(p["season"] for p in combined),
            "last_season": max(p["season"] for p in combined),
            "hof_count": hof,
            "pro_bowls": pb,
            "all_pros": ap,
            "by_position": dict(by_pos),
            "by_round": dict(by_rnd),
            "by_decade": dict(by_dec),
            "top_colleges": [
                {"college": c, "count": n}
                for c, n in by_col.most_common(15)
            ],
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    META_FILE.write_text(json.dumps(meta, indent=2, default=str))


def main() -> None:
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    print(f"Scraping Wikipedia for the {year} NFL Draft Bears picks…")
    html = fetch_wiki(year)
    picks = parse_bears_picks(html, year)
    if not picks:
        raise SystemExit(f"No Bears picks parsed — Wikipedia layout may have changed.")
    for p in picks:
        print(
            f"  R{p['round']} #{p['pick']:>3}  {p['display_name']:30}  "
            f"{p['position']:<4} {p['college']}"
        )
    merge_into_history(picks, year)
    print(f"\nMerged {len(picks)} {year} Bears picks into {PICKS_FILE.name}")
    print("→ run enrich_photos.py next to add photo URLs.")


if __name__ == "__main__":
    main()
