# Bears Draft Archive

Every Chicago Bears NFL Draft pick since 1980, rendered as an interactive
"stadium press-box noir" archive.

- Data: [`nflverse / nflreadpy`](https://github.com/nflverse/nflreadpy), Wikipedia for the most recent draft (until nflverse catches up)
- Photos: ESPN headshots downloaded at build time → `public/players/` (no third-party CDN dependency at runtime); Sleeper as fallback URL
- Frontend: Next.js 16 · Tailwind v4 · Motion · Recharts

## Stack

```
data-pipeline/                  Python data pipeline
  fetch_bears_draft.py          nflverse → JSON (1980 to most-recent year nflverse has)
  fetch_wikipedia_draft.py YYYY Wikipedia fallback for years nflverse hasn't pushed yet
  enrich_photos.py              Adds Sleeper photo URLs by ID match (fallback only)
  download_player_photos.py     Pulls full ESPN athletes directory, matches by name+DOB,
                                downloads each headshot to public/players/{slug}.png

public/                         Static assets
  bears_draft_history.json      Every Bears pick with derived fields
  bears_draft_meta.json         Summary counters for hero + dashboard
  players/{slug}.png            Self-hosted ESPN headshots — no runtime CDN dependency

app/                            Next.js App Router
components/                     Hero, Dashboard, explorer/* (Filters, Timeline, modals)
lib/                            Types, data loaders, hit-score helpers
```

## Run locally

```bash
# 1. Refresh data
cd data-pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python fetch_bears_draft.py
python fetch_wikipedia_draft.py 2026   # only needed until nflverse pushes 2026
python enrich_photos.py
python download_player_photos.py
cd ..

# 2. Run the dev server
npm install
npm run dev
# → http://localhost:3000
```

`npm run data` runs every step in order.

## Features

- **Hero** — animated headline, on-this-day spotlight, live stat counters
- **Archive** — year-grouped timeline grouped by GM era, sticky year banners
- **Filters** — search, decade, round, position, college, GM era (multi-select)
- **Hit score** — 0–100 quality rating per pick (career AV + accolades + games)
- **Player modal** — full stat blocks, position-aware production, PFR deep link
- **Compare mode** — pick any two players, animated head-to-head bar duels
- **Dashboard** — most-drafted positions, picks per decade, hit rate by round,
  HOF best picks, top-3-round busts

## Production build

```bash
npm run build
npm start
```

## Deploying to Vercel

Stick with default Next.js settings. Photos under `public/players/` are
committed (~43 MB, 163 PNGs) so the deployed app has no runtime dependency on
ESPN's CDN — all headshots are served from your own origin.

## Notes & limitations

- `nflreadpy.load_draft_picks()` starts at 1980 — pre-1980 legends (Sayers,
  Butkus, Payton) are not included by upstream. Adding 1936–1979 would require
  a Pro-Football-Reference scrape (PFR blocks bots, so it'd need handling).
- Photo coverage by decade after the ESPN+name+DOB match:
  1980s ≈ 6%, 1990s ≈ 8%, 2000s ≈ 48%, 2010s ≈ 95%, 2020s ≈ 85%. ESPN simply
  didn't keep historical headshots; older players gracefully render as
  vintage initials cards (which fits the noir aesthetic anyway).
- When nflverse publishes a year, re-running `npm run data` overwrites the
  Wikipedia-synthesized rows for that year.
