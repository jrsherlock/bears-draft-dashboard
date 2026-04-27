# Bears Draft Data Pipeline

Pulls every Chicago Bears draft pick from `nflverse` (via `nflreadpy`) and writes
two JSON files into `../public/` for the Next.js app to consume.

## Run

```bash
# from this directory
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python fetch_bears_draft.py
```

Or with [uv](https://docs.astral.sh/uv/):

```bash
uv run --with nflreadpy --with polars python fetch_bears_draft.py
```

## Output

- `public/bears_draft_history.json` — every Bears pick with `season`, `round`,
  `pick`, `position`, `college`, `pfr_player_name`, career stats (`car_av`,
  `games`, `seasons_started`, `probowls`, `allpro`, `hof`), plus derived
  `decade`, `era`, and `display_name`.
- `public/bears_draft_meta.json` — summary counters used by the hero + dashboard.

## When to re-run

After each year's NFL Draft (late April). `nflverse` updates throughout the
following season as career stats accumulate.
