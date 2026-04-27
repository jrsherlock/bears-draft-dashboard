"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useExplorer } from "./ExplorerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { hitColor, hitLabel, useHitScore } from "@/lib/hit-score";
import type { DraftPick } from "@/lib/types";

export function CompareModal() {
  const { showCompare, closeCompare, compareSlots } = useExplorer();
  const { score: scoreFn } = useHitScore();
  const [a, b] = compareSlots;

  useEffect(() => {
    if (!showCompare) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCompare();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [showCompare, closeCompare]);

  return (
    <AnimatePresence>
      {showCompare && a && b && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCompare}
            aria-label="Close"
            className="absolute inset-0 bg-navy-900/90 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-h-[94vh] w-[min(94vw,1200px)] overflow-y-auto border rule-line-strong bg-navy-900 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]"
          >
            <div className="border-b rule-line px-6 py-4 flex items-center justify-between">
              <div className="mono text-[11px] uppercase tracking-[0.35em] text-orange-400">
                Head-to-head
              </div>
              <button
                onClick={closeCompare}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center border rule-line-strong text-cream-200 transition hover:border-orange-500 hover:text-orange-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Identity row */}
            <div className="grid grid-cols-2 divide-x rule-line">
              <PlayerHead pick={a} side="left" />
              <PlayerHead pick={b} side="right" />
            </div>

            {/* Stat duels */}
            <div className="border-t rule-line p-6 lg:p-8">
              <div className="mono mb-5 text-[10px] uppercase tracking-[0.3em] text-cream-300/60">
                The tale of the tape
              </div>
              <div className="space-y-5">
                <Duel
                  label="Career AV"
                  a={a.car_av ?? a.w_av ?? 0}
                  b={b.car_av ?? b.w_av ?? 0}
                />
                <Duel label="Games played" a={a.games ?? 0} b={b.games ?? 0} />
                <Duel
                  label="Seasons started"
                  a={a.seasons_started ?? 0}
                  b={b.seasons_started ?? 0}
                />
                <Duel label="Pro Bowls" a={a.probowls ?? 0} b={b.probowls ?? 0} />
                <Duel label="All-Pros" a={a.allpro ?? 0} b={b.allpro ?? 0} />
                <Duel
                  label="Hit score"
                  a={scoreFn(a)}
                  b={scoreFn(b)}
                  max={100}
                />
              </div>
            </div>

            {/* Position-specific duel */}
            {sharedPositionStats(a, b).length > 0 && (
              <div className="border-t rule-line p-6 lg:p-8">
                <div className="mono mb-5 text-[10px] uppercase tracking-[0.3em] text-cream-300/60">
                  Position production
                </div>
                <div className="space-y-5">
                  {sharedPositionStats(a, b).map((s) => (
                    <Duel
                      key={s.label}
                      label={s.label}
                      a={s.a}
                      b={s.b}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="border-t rule-line bg-orange-500/5 p-6 text-center">
              <Verdict a={a} b={b} />
            </div>
          </motion.div>
        </motion.div>
      )}

      {showCompare && (!a || !b) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <motion.button
            onClick={closeCompare}
            className="absolute inset-0 bg-navy-900/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <div className="relative z-10 border rule-line-strong bg-navy-800 px-10 py-8 text-center">
            <div className="display text-3xl text-cream-100">Pick two players</div>
            <div className="mono mt-2 text-xs uppercase tracking-[0.3em] text-cream-300/60">
              Use the + button on any draft card.
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PlayerHead({ pick, side }: { pick: DraftPick; side: "left" | "right" }) {
  const { score: scoreFn, isIncoming } = useHitScore();
  const incoming = isIncoming(pick);
  const score = scoreFn(pick);
  const color = hitColor(score, incoming);
  const label = hitLabel(score, incoming);
  return (
    <div
      className={`flex flex-col items-center gap-3 p-6 lg:p-8 ${
        side === "right" ? "lg:items-end lg:text-right" : "lg:text-left lg:items-start"
      }`}
    >
      <PlayerAvatar pick={pick} size={120} className="border rule-line-strong" />
      <div className="mono text-[10px] uppercase tracking-[0.3em] text-orange-400">
        {pick.season} · R{pick.round} · #{pick.pick}
      </div>
      <div className="display text-3xl leading-tight text-cream-50 lg:text-4xl">
        {pick.display_name}
      </div>
      <div className="editorial italic text-cream-200/70">{pick.college ?? "—"}</div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip chip-hot">{pick.position ?? "?"}</span>
        {pick.hof && <span className="chip chip-hof">HOF</span>}
        <span className="chip">{pick.era}</span>
      </div>
      <div
        className="mono mt-1 text-[11px] uppercase tracking-[0.25em]"
        style={{ color }}
      >
        {label} {!incoming && `· ${score}`}
      </div>
    </div>
  );
}

function Duel({
  label,
  a,
  b,
  max,
}: {
  label: string;
  a: number;
  b: number;
  max?: number;
}) {
  const top = max ?? Math.max(a, b, 1);
  const aPct = (a / top) * 100;
  const bPct = (b / top) * 100;
  const aWins = a > b;
  const bWins = b > a;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between mono text-[10px] uppercase tracking-[0.25em] text-cream-300/60">
        <span className={aWins ? "text-orange-400" : ""}>{a.toLocaleString()}</span>
        <span>{label}</span>
        <span className={bWins ? "text-orange-400" : ""}>{b.toLocaleString()}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex h-3 justify-end overflow-hidden bg-navy-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${aPct}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
            style={{ background: aWins ? "var(--color-orange-500)" : "var(--color-navy-400)" }}
          />
        </div>
        <div className="flex h-3 overflow-hidden bg-navy-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${bPct}%` }}
            transition={{ duration: 0.9, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
            style={{ background: bWins ? "var(--color-orange-500)" : "var(--color-navy-400)" }}
          />
        </div>
      </div>
    </div>
  );
}

function Verdict({ a, b }: { a: DraftPick; b: DraftPick }) {
  const { score: scoreFn } = useHitScore();
  const sa = scoreFn(a);
  const sb = scoreFn(b);
  if (Math.abs(sa - sb) < 5) {
    return (
      <div className="editorial text-cream-200/80">
        Razor-thin. Two careers within{" "}
        <span className="text-orange-400">a few hit-score points</span> of each other.
      </div>
    );
  }
  const winner = sa > sb ? a : b;
  const margin = Math.abs(sa - sb);
  return (
    <div className="editorial text-cream-100">
      Edge to{" "}
      <span className="text-orange-400 font-bold">{winner.display_name}</span>{" "}
      <span className="text-cream-300/70 mono text-sm">
        (+{margin} hit score)
      </span>
    </div>
  );
}

function sharedPositionStats(a: DraftPick, b: DraftPick) {
  const same =
    (a.position ?? "") === (b.position ?? "") ||
    sameGroup(a.position ?? "", b.position ?? "");
  if (!same) return [];
  const pos = a.position ?? "";
  const out: { label: string; a: number; b: number }[] = [];
  const add = (label: string, av: number | null, bv: number | null) => {
    if ((av ?? 0) > 0 || (bv ?? 0) > 0) out.push({ label, a: av ?? 0, b: bv ?? 0 });
  };
  if (pos === "QB") {
    add("Pass yards", a.pass_yards, b.pass_yards);
    add("Pass TDs", a.pass_tds, b.pass_tds);
    add("INTs", a.pass_ints, b.pass_ints);
  } else if (["RB", "FB"].includes(pos)) {
    add("Rush yards", a.rush_yards, b.rush_yards);
    add("Rush TDs", a.rush_tds, b.rush_tds);
    add("Receptions", a.receptions, b.receptions);
  } else if (["WR", "TE"].includes(pos)) {
    add("Receptions", a.receptions, b.receptions);
    add("Rec yards", a.rec_yards, b.rec_yards);
    add("Rec TDs", a.rec_tds, b.rec_tds);
  } else if (sameGroup(pos, "DE")) {
    add("Sacks", a.def_sacks, b.def_sacks);
    add("Solo tackles", a.def_solo_tackles, b.def_solo_tackles);
  } else if (sameGroup(pos, "CB")) {
    add("INTs", a.def_ints, b.def_ints);
    add("Solo tackles", a.def_solo_tackles, b.def_solo_tackles);
  }
  return out;
}

function sameGroup(a: string, b: string): boolean {
  const groups = [
    ["DE", "DT", "EDGE", "NT"],
    ["LB", "OLB", "ILB", "MLB"],
    ["CB", "S", "FS", "SS", "DB"],
    ["QB"],
    ["WR", "TE"],
    ["RB", "FB"],
    ["G", "T", "C", "OL", "OG", "OT"],
  ];
  return groups.some((g) => g.includes(a) && g.includes(b));
}
