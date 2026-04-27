"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DraftPick } from "./types";

/**
 * The Hit Score is a 0..100 quality rating for any draft pick.
 *
 *  raw  = avScore * avWeight + accolades * accWeight + longevity * gpWeight
 *  hit  = round(raw * 100)
 *
 *  avScore   = min(1, (career_av / avCeiling) ^ avCurve)
 *  accolades = min(1, probowls * pbWeight + allpro * apWeight + hof * hofBonus)
 *  longevity = min(1, games / gpCeiling)
 *
 * Defaults are calibrated so a HOFer with a 100+ AV career hits 90+, a
 * solid 8-year starter sits in the 50–70 band, and a never-played bust
 * lands near 0. Power users can override every knob.
 */
export type HitScoreParams = {
  avWeight: number;
  accWeight: number;
  gpWeight: number;

  avCeiling: number;
  avCurve: number;

  pbWeight: number;
  apWeight: number;
  hofBonus: number;

  gpCeiling: number;
};

export const DEFAULT_PARAMS: HitScoreParams = {
  avWeight: 0.55,
  accWeight: 0.35,
  gpWeight: 0.10,

  avCeiling: 60,
  avCurve: 0.7,

  pbWeight: 0.08,
  apWeight: 0.18,
  hofBonus: 0.5,

  gpCeiling: 100,
};

export function computeHitScore(pick: DraftPick, p: HitScoreParams): number {
  const av = pick.car_av ?? pick.w_av ?? 0;
  const pb = pick.probowls ?? 0;
  const ap = pick.allpro ?? 0;
  const hof = pick.hof ? 1 : 0;
  const games = pick.games ?? 0;

  const avScore =
    p.avCeiling <= 0 ? 0 : Math.min(1, Math.pow(Math.max(0, av) / p.avCeiling, p.avCurve));
  const accolades = Math.min(
    1,
    pb * p.pbWeight + ap * p.apWeight + hof * p.hofBonus
  );
  const longevity =
    p.gpCeiling <= 0 ? 0 : Math.min(1, Math.max(0, games) / p.gpCeiling);

  // Normalize the three component weights so users can drag them freely
  // without their score collapsing to 0.
  const wSum = p.avWeight + p.accWeight + p.gpWeight || 1;
  const raw =
    (avScore * p.avWeight + accolades * p.accWeight + longevity * p.gpWeight) /
    wSum;

  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}

/** A breakdown of where a player's hit score came from — used in the panel. */
export type HitScoreBreakdown = {
  total: number;
  avScore: number;
  accScore: number;
  gpScore: number;
  avContribution: number;
  accContribution: number;
  gpContribution: number;
};

export function breakdown(pick: DraftPick, p: HitScoreParams): HitScoreBreakdown {
  const av = pick.car_av ?? pick.w_av ?? 0;
  const pb = pick.probowls ?? 0;
  const ap = pick.allpro ?? 0;
  const hof = pick.hof ? 1 : 0;
  const games = pick.games ?? 0;

  const avScore =
    p.avCeiling <= 0 ? 0 : Math.min(1, Math.pow(Math.max(0, av) / p.avCeiling, p.avCurve));
  const accScore = Math.min(
    1,
    pb * p.pbWeight + ap * p.apWeight + hof * p.hofBonus
  );
  const gpScore =
    p.gpCeiling <= 0 ? 0 : Math.min(1, Math.max(0, games) / p.gpCeiling);

  const wSum = p.avWeight + p.accWeight + p.gpWeight || 1;
  const avContribution = (avScore * p.avWeight) / wSum;
  const accContribution = (accScore * p.accWeight) / wSum;
  const gpContribution = (gpScore * p.gpWeight) / wSum;

  return {
    total: Math.round((avContribution + accContribution + gpContribution) * 100),
    avScore,
    accScore,
    gpScore,
    avContribution: avContribution * 100,
    accContribution: accContribution * 100,
    gpContribution: gpContribution * 100,
  };
}

// ---------------------------------------------------------------------------
// Color + label helpers (unchanged outputs, but live with the score)
// ---------------------------------------------------------------------------

export function hitColor(score: number, incoming = false): string {
  if (incoming) return "var(--color-cream-300)";
  if (score >= 75) return "var(--color-orange-400)";
  if (score >= 55) return "var(--color-orange-500)";
  if (score >= 35) return "var(--color-cream-300)";
  if (score >= 15) return "var(--color-navy-400)";
  return "var(--color-navy-500)";
}

export function hitLabel(score: number, incoming = false): string {
  if (incoming) return "Rookie";
  if (score >= 75) return "Star";
  if (score >= 55) return "Hit";
  if (score >= 35) return "Solid";
  if (score >= 15) return "Role";
  return "Bust";
}

/**
 * A pick we can't grade yet — either drafted in the most recent class with
 * no NFL games on record, or a player whose career simply hasn't begun.
 * Distinct from a "bust" (had years, never produced).
 */
export function isIncoming(pick: DraftPick, latestSeason: number): boolean {
  return pick.season >= latestSeason && pick.to == null && (pick.games ?? null) == null;
}

// ---------------------------------------------------------------------------
// Provider + hook
// ---------------------------------------------------------------------------

const STORAGE_KEY = "bears-draft.hit-score-params.v1";

type Ctx = {
  params: HitScoreParams;
  setParam: <K extends keyof HitScoreParams>(key: K, value: HitScoreParams[K]) => void;
  setParams: (next: HitScoreParams) => void;
  reset: () => void;
  isCustom: boolean;
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  /** Memoized scorer bound to current params. */
  score: (pick: DraftPick) => number;
  /** True when the pick was just drafted and has no NFL résumé yet. */
  isIncoming: (pick: DraftPick) => boolean;
  /** Latest season represented in the dataset. */
  latestSeason: number;
};

const HitScoreCtx = createContext<Ctx | null>(null);

function paramsEqual(a: HitScoreParams, b: HitScoreParams): boolean {
  return (Object.keys(a) as (keyof HitScoreParams)[]).every(
    (k) => Math.abs(a[k] - b[k]) < 1e-6
  );
}

export function HitScoreProvider({
  latestSeason,
  children,
}: {
  /** Most recent draft year in the dataset; rookies in this year aren't busts. */
  latestSeason: number;
  children: React.ReactNode;
}) {
  const [params, setParamsState] = useState<HitScoreParams>(DEFAULT_PARAMS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<HitScoreParams>;
        setParamsState({ ...DEFAULT_PARAMS, ...parsed });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist on change (after hydration so we don't blow it away on first paint).
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (paramsEqual(params, DEFAULT_PARAMS)) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
      }
    } catch {
      /* ignore */
    }
  }, [params, hydrated]);

  const setParam = useCallback(
    <K extends keyof HitScoreParams>(key: K, value: HitScoreParams[K]) => {
      setParamsState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const reset = useCallback(() => setParamsState(DEFAULT_PARAMS), []);

  const score = useCallback(
    (pick: DraftPick) => computeHitScore(pick, params),
    [params]
  );
  const incoming = useCallback(
    (pick: DraftPick) => isIncoming(pick, latestSeason),
    [latestSeason]
  );

  const value = useMemo<Ctx>(
    () => ({
      params,
      setParam,
      setParams: setParamsState,
      reset,
      isCustom: !paramsEqual(params, DEFAULT_PARAMS),
      panelOpen,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
      togglePanel: () => setPanelOpen((v) => !v),
      score,
      isIncoming: incoming,
      latestSeason,
    }),
    [params, setParam, reset, panelOpen, score, incoming, latestSeason]
  );

  return <HitScoreCtx.Provider value={value}>{children}</HitScoreCtx.Provider>;
}

export function useHitScore() {
  const v = useContext(HitScoreCtx);
  if (!v) throw new Error("useHitScore must be used inside HitScoreProvider");
  return v;
}
