import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DraftPick } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pickLabel(p: DraftPick): string {
  return `${p.season} · R${p.round} · #${p.pick}`;
}

// hitColor + hitLabel + computeHitScore now live in lib/hit-score.tsx so they
// can react to user-tuned weights via the HitScoreProvider.
export { hitColor, hitLabel } from "./hit-score";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable color per name for initials avatar — keeps the placeholder cohesive. */
export function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const palette = [
    "#1c2c54",
    "#122042",
    "#2a3a66",
    "#3d4f7d",
    "#1a2540",
  ];
  return palette[Math.abs(h) % palette.length];
}

export function formatStatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1000) return n.toLocaleString();
  return String(n);
}

export function pfrUrl(p: DraftPick): string | null {
  if (!p.pfr_player_id) return null;
  const first = p.pfr_player_id[0];
  return `https://www.pro-football-reference.com/players/${first}/${p.pfr_player_id}.htm`;
}
