"use client";

import { ReactNode } from "react";

/**
 * Glossary of stat abbreviations used across the app. Centralized here so
 * every appearance of "AV" / "GP" / "Pro Bowl" gets the same definition.
 */
const TERMS = {
  AV: {
    full: "Approximate Value",
    desc: "Pro Football Reference's single-number summary of a season. Career AV sums every season; ~30 is a multi-year contributor, 60+ is an All-Pro-caliber career, 100+ is Hall of Fame territory.",
  },
  GP: {
    full: "Games Played",
    desc: "Total NFL regular-season games the player has appeared in. 16 = a full season pre-2021; 17 thereafter.",
  },
  PB: {
    full: "Pro Bowls",
    desc: "Number of Pro Bowl selections in the player's career — the league's all-star recognition (peer + coach voted).",
  },
  PROBOWL: {
    full: "Pro Bowls",
    desc: "Number of Pro Bowl selections in the player's career.",
  },
  ALLPRO: {
    full: "All-Pro selections",
    desc: "Voted by AP writers — first-team All-Pro is the league's highest single-season honor (only one player per position per year). Tougher than Pro Bowl by an order of magnitude.",
  },
  HOF: {
    full: "Hall of Fame",
    desc: "Inducted into the Pro Football Hall of Fame in Canton, OH. The franchise's career capstone.",
  },
  ACC: {
    full: "Accolades",
    desc: "Honors a player accumulated — Pro Bowls, All-Pro selections, and HOF induction. One bucket in the Hit Score formula.",
  },
  W_AV: {
    full: "Weighted Approximate Value",
    desc: "PFR's career AV with the player's best seasons weighted higher. Used as a fallback when career AV isn't computed.",
  },
} as const;

export type TipTerm = keyof typeof TERMS;

type Props = {
  /** Glossary key. Use one of: AV, GP, PB, ALLPRO, HOF, ACC, W_AV. */
  term: TipTerm;
  children: ReactNode;
  /** Above (default) or below the trigger. */
  side?: "top" | "bottom";
  className?: string;
};

/**
 * Hover-revealed tooltip with a concise definition. Wraps any label/abbr.
 *
 * Pure CSS hover via Tailwind group/peer — no JS, no portal, no positioning
 * math. Small enough that overflow clipping is rare; if it ever clips, lift
 * the parent's overflow rule.
 */
export function Tip({ term, children, side = "top", className = "" }: Props) {
  const t = TERMS[term];
  return (
    <span
      className={`group/tip relative inline-flex cursor-help items-baseline ${className}`}
    >
      <span className="border-b border-dotted border-cream-300/40 leading-[inherit]">
        {children}
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-40 w-60 -translate-x-1/2 border rule-line-strong bg-navy-900 px-3 py-2 text-left opacity-0 shadow-[0_18px_36px_-10px_rgba(0,0,0,0.65)] transition-opacity duration-150 group-hover/tip:opacity-100 ${
          side === "top" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        <span className="mono block text-[10px] uppercase tracking-[0.25em] text-orange-400">
          {t.full}
        </span>
        <span className="editorial mt-1 block text-[12px] leading-snug text-cream-200">
          {t.desc}
        </span>
      </span>
    </span>
  );
}
