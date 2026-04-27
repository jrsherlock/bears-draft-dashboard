"""
Build a single source of truth for Bears draft player photos.

Pipeline:
  1. Pull the full ESPN NFL athletes directory (~20k records, paginated).
  2. Match every pick against the directory by (last, first) name, with
     birth-year disambiguation when there are duplicates (we know the player
     was {age} at draft year {season}, so birth year ≈ season - age).
  3. Download each matched headshot to public/players/{slug}.png.
  4. Set `local_photo` on each pick so the frontend can prefer the local
     asset and forget about runtime dependencies on ESPN/Sleeper.

For very old or obscure players where ESPN has no record, we fall back to
existing Sleeper photos that may already be on the record. The avatar
component still degrades gracefully to a vintage initials card.

Usage:
    python download_player_photos.py
    python download_player_photos.py --refresh   # ignore cached athletes
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "public"
PHOTOS_DIR = PUBLIC_DIR / "players"
PICKS_FILE = PUBLIC_DIR / "bears_draft_history.json"
ATHLETES_CACHE = Path(__file__).resolve().parent / ".cache" / "espn_athletes.json"

ESPN_LIST_URL = (
    "https://sports.core.api.espn.com/v3/sports/football/nfl/athletes"
    "?limit=1000&page={page}"
)
ESPN_HEADSHOT_URL = "https://a.espncdn.com/i/headshots/nfl/players/full/{id}.png"

USER_AGENT = "bears-draft-dashboard/1.0"
WORKERS = 12


# ---------------------------------------------------------------------------
# ESPN directory
# ---------------------------------------------------------------------------

def fetch_athletes(refresh: bool = False) -> list[dict]:
    if ATHLETES_CACHE.exists() and not refresh:
        print(f"Using cached ESPN athletes at {ATHLETES_CACHE}")
        return json.loads(ATHLETES_CACHE.read_text())

    print("Pulling ESPN athletes directory…")
    ATHLETES_CACHE.parent.mkdir(parents=True, exist_ok=True)
    out: list[dict] = []
    page = 1
    while True:
        url = ESPN_LIST_URL.format(page=page)
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
        items = data.get("items", [])
        out.extend(items)
        total_pages = data.get("pageCount", 1)
        sys.stdout.write(f"\r  page {page}/{total_pages}  ({len(out):,} athletes)")
        sys.stdout.flush()
        if page >= total_pages:
            break
        page += 1
    print()
    ATHLETES_CACHE.write_text(json.dumps(out))
    print(f"  cached {len(out):,} athletes to {ATHLETES_CACHE}")
    return out


def name_key(first: str, last: str) -> tuple[str, str]:
    return (norm(last), norm(first))


def norm(s: str) -> str:
    return re.sub(r"[^a-z]+", "", (s or "").lower())


def build_index(athletes: list[dict]) -> dict[tuple[str, str], list[dict]]:
    idx: dict[tuple[str, str], list[dict]] = {}
    for a in athletes:
        first = a.get("firstName") or ""
        last = a.get("lastName") or ""
        if not first or not last or last.startswith("["):
            continue
        idx.setdefault(name_key(first, last), []).append(a)
    return idx


def disambiguate(candidates: list[dict], season: int | None, age: int | None) -> dict | None:
    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]
    if season is None or age is None:
        # Without birth-year, prefer the candidate with the lowest ESPN ID
        # which heuristically tracks longer-tenured players.
        return min(candidates, key=lambda a: int(a.get("id") or 1e12))

    target_birth = season - age
    best = None
    best_delta = 1e9
    for a in candidates:
        dob = a.get("dateOfBirth")
        if not dob:
            continue
        try:
            year = int(dob[:4])
        except ValueError:
            continue
        delta = abs(year - target_birth)
        if delta < best_delta:
            best_delta = delta
            best = a
    if best is not None and best_delta <= 2:
        return best
    return candidates[0]


# ---------------------------------------------------------------------------
# Slug + downloads
# ---------------------------------------------------------------------------

def slug_for(pick: dict) -> str:
    pfr = pick.get("pfr_player_id") or ""
    if pfr:
        return pfr
    base = norm(pick.get("display_name") or "unknown")
    season = pick.get("season")
    pick_n = pick.get("pick")
    return f"{base}-{season}-{pick_n}"


def download(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 0:
        return True
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        # ESPN sometimes returns a tiny placeholder for missing headshots.
        if len(data) < 2_000:
            return False
        dest.write_bytes(data)
        return True
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true",
                    help="Ignore cached ESPN athletes; re-pull the directory.")
    args = ap.parse_args()

    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

    picks: list[dict] = json.loads(PICKS_FILE.read_text())
    athletes = fetch_athletes(refresh=args.refresh)
    idx = build_index(athletes)
    print(f"Indexed {sum(len(v) for v in idx.values()):,} candidates "
          f"under {len(idx):,} unique name keys.")

    # Match phase
    matched = 0
    jobs: list[tuple[dict, str, Path]] = []
    for pick in picks:
        name = (pick.get("display_name") or "").strip().split()
        if len(name) < 2:
            pick["espn_id"] = pick.get("espn_id")
            continue
        first, last = name[0], name[-1]
        cands = idx.get(name_key(first, last), [])
        chosen = disambiguate(cands, pick.get("season"), pick.get("age"))
        if not chosen:
            continue
        eid = chosen.get("id")
        if not eid:
            continue
        pick["espn_id"] = str(eid)
        slug = slug_for(pick)
        url = ESPN_HEADSHOT_URL.format(id=eid)
        dest = PHOTOS_DIR / f"{slug}.png"
        jobs.append((pick, url, dest))
        matched += 1

    print(f"Matched {matched}/{len(picks)} picks to ESPN IDs. Downloading…")

    # Download in parallel
    succeeded = 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = {ex.submit(download, url, dest): (pick, dest) for pick, url, dest in jobs}
        for i, fut in enumerate(as_completed(futures), 1):
            pick, dest = futures[fut]
            ok = False
            try:
                ok = fut.result()
            except Exception:
                ok = False
            if ok:
                pick["local_photo"] = f"/players/{dest.name}"
                succeeded += 1
            else:
                pick.pop("local_photo", None)
            if i % 25 == 0 or i == len(futures):
                sys.stdout.write(f"\r  {i}/{len(futures)} ({succeeded} ok)")
                sys.stdout.flush()
    print(f"\nFinished in {time.time()-t0:.1f}s · {succeeded} headshots saved to {PHOTOS_DIR}")

    # Write the picks file back
    PICKS_FILE.write_text(json.dumps(picks, indent=2, default=str))
    print(f"Updated {PICKS_FILE} with local_photo paths.")

    # Coverage report by decade
    by_decade: dict[str, list[int]] = {}
    for p in picks:
        d = p.get("decade") or "?"
        slot = by_decade.setdefault(d, [0, 0])
        slot[1] += 1
        if p.get("local_photo"):
            slot[0] += 1
    print("\nCoverage by decade:")
    for d in sorted(by_decade):
        ok, total = by_decade[d]
        bar = "█" * int(20 * ok / total) if total else ""
        print(f"  {d}: {ok:>3}/{total:<3}  {bar}")


if __name__ == "__main__":
    main()
