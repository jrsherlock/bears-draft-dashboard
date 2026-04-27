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

/** Coarse position group for charts and league-wide analysis. */
export function positionGroup(pos: string | null | undefined): string {
  if (!pos) return "?";
  const p = pos.toUpperCase();
  if (p === "QB") return "QB";
  if (["RB", "FB", "HB"].includes(p)) return "RB";
  if (p === "WR") return "WR";
  if (p === "TE") return "TE";
  if (["OT", "OG", "OC", "C", "G", "T", "OL"].includes(p)) return "OL";
  if (["DT", "DE", "DL", "NT", "EDGE"].includes(p)) return "DL";
  if (["LB", "ILB", "OLB", "MLB"].includes(p)) return "LB";
  if (["CB", "S", "FS", "SS", "DB", "SAF"].includes(p)) return "DB";
  if (["K", "P", "LS"].includes(p)) return "ST";
  return "?";
}

export const POSITION_GROUPS = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "ST"] as const;

export const POSITION_GROUP_COLORS: Record<string, string> = {
  QB: "#e0501a", // orange-400
  RB: "#d3c5a0", // cream-300
  WR: "#f47733", // orange-300
  TE: "#f4edda", // cream-100
  OL: "#5a6478", // cool muted
  DL: "#c83803", // orange-500 (defense gets the warmest tones — Bears are Monsters of the Midway)
  LB: "#7e2200", // deep orange/rust
  DB: "#3d4f7d", // navy-400
  ST: "rgba(244,237,218,0.35)", // dim cream
};

/** Defines whether a position group is offense, defense, or special teams. */
export function unitFor(group: string): "offense" | "defense" | "st" | "?" {
  if (["QB", "RB", "WR", "TE", "OL"].includes(group)) return "offense";
  if (["DL", "LB", "DB"].includes(group)) return "defense";
  if (group === "ST") return "st";
  return "?";
}
