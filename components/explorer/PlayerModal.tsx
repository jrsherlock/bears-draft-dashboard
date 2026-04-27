"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink, Plus, Check } from "lucide-react";
import { useEffect } from "react";
import { useExplorer, pickKey } from "./ExplorerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { CombineRadar } from "@/components/CombineRadar";
import { Tip, type TipTerm } from "@/components/ui/Tip";
import { cn, pfrUrl, formatStatNumber } from "@/lib/utils";
import {
  hitColor,
  hitLabel,
  rosterStatusLabel,
  useHitScore,
} from "@/lib/hit-score";
import type { DraftPick } from "@/lib/types";

export function PlayerModal() {
  const { selected, closePick, toggleCompare, compareSlots } = useExplorer();

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePick();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [selected, closePick]);

  return (
    <AnimatePresence>
      {selected && (
        <PlayerModalBody
          pick={selected}
          onClose={closePick}
          onToggleCompare={() => toggleCompare(selected)}
          inCompare={compareSlots.some(
            (p) => p && pickKey(p) === pickKey(selected)
          )}
        />
      )}
    </AnimatePresence>
  );
}

function PlayerModalBody({
  pick,
  onClose,
  onToggleCompare,
  inCompare,
}: {
  pick: DraftPick;
  onClose: () => void;
  onToggleCompare: () => void;
  inCompare: boolean;
}) {
  const { score: scoreFn, isIncoming } = useHitScore();
  const incoming = isIncoming(pick);
  const score = scoreFn(pick);
  const color = hitColor(score, incoming);
  const label = hitLabel(score, incoming);
  const url = pfrUrl(pick);
  const stats = relevantStats(pick);

  return (
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
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-navy-900/85 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-h-[92vh] w-[min(92vw,1100px)] overflow-y-auto border rule-line-strong bg-navy-900 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]"
      >
        {/* Top hero strip */}
        <div className="relative grid border-b rule-line lg:grid-cols-[280px_1fr]">
          {/* Photo */}
          <div className="relative bg-navy-800">
            <PlayerAvatar pick={pick} size={280} className="h-[280px] w-full" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-navy-900 to-transparent" />
          </div>

          {/* Identity */}
          <div className="relative p-6 lg:p-8">
            <div className="mono mb-3 flex items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-orange-400">
              <span className="h-px w-6 bg-orange-500" />
              {pick.season} draft · Round {pick.round} · Pick #{pick.pick}
            </div>
            <h2 className="display text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.9] text-cream-50">
              {pick.display_name.split(" ").map((w, i) => (
                <span key={i} className={i === 0 ? "" : "block"}>
                  {w}{" "}
                </span>
              ))}
            </h2>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="chip chip-hot">{pick.position ?? "?"}</span>
              {pick.hof && (
                <span className="chip chip-hof">
                  <Tip term="HOF" side="bottom">Hall of Fame</Tip>
                </span>
              )}
              {(pick.allpro ?? 0) > 0 && (
                <span className="chip chip-hot">
                  {pick.allpro}× <Tip term="ALLPRO" side="bottom">All-Pro</Tip>
                </span>
              )}
              {(pick.probowls ?? 0) > 0 && (
                <span className="chip">
                  {pick.probowls}× <Tip term="PROBOWL" side="bottom">Pro Bowl</Tip>
                </span>
              )}
              <span className="chip">{pick.era}</span>
            </div>

            <div className="editorial mt-5 max-w-lg text-cream-200/80">
              <span className="italic">{pick.college ?? "—"}</span>
              {pick.age && (
                <span className="mono ml-3 text-cream-300/60">
                  · drafted at age {pick.age}
                </span>
              )}
              {pick.to && (
                <span className="mono ml-3 text-cream-300/60">
                  · played through {pick.to}
                </span>
              )}
            </div>

            {/* Empirical "still in NFL" status */}
            <div className="mt-4 inline-flex items-center gap-2 border-l-2 border-orange-500/50 pl-3 mono text-[11px] uppercase tracking-[0.25em] text-cream-200">
              <RosterDot status={pick.roster_status} />
              <span>{rosterStatusLabel(pick)}</span>
              {pick.roster_evidence && (
                <span
                  className="ml-1 text-[9px] tracking-[0.2em] text-cream-300/50"
                  title="The data source we used to determine this status"
                >
                  · src: {pick.roster_evidence}
                </span>
              )}
            </div>

            {/* Hit-score gauge */}
            <div className="mt-6 max-w-sm">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="mono text-[10px] uppercase tracking-[0.3em] text-cream-300/60">
                  Hit score
                </span>
                <span
                  className="mono text-xs uppercase tracking-[0.2em]"
                  style={{ color }}
                >
                  {label} {!incoming && `· ${score}`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden bg-navy-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full"
                  style={{ background: color }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={onToggleCompare}
                className={cn(
                  "mono inline-flex items-center gap-2 border px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition",
                  inCompare
                    ? "border-orange-500 bg-orange-500 text-cream-50"
                    : "rule-line-strong text-cream-200 hover:border-orange-500 hover:text-orange-400"
                )}
              >
                {inCompare ? <Check size={13} /> : <Plus size={13} />}
                {inCompare ? "In compare" : "Add to compare"}
              </button>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  className="mono inline-flex items-center gap-2 border rule-line-strong px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-cream-200 transition hover:border-cream-100 hover:text-cream-50"
                >
                  <ExternalLink size={13} /> Pro-Football-Reference
                </a>
              )}
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border rule-line-strong text-cream-200 transition hover:border-orange-500 hover:text-orange-400"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Stat blocks */}
        <div className="grid grid-cols-2 divide-x rule-line border-b rule-line md:grid-cols-4">
          <Headline term="AV" label="Career AV" value={pick.car_av ?? pick.w_av} />
          <Headline term="GP" label="Games" value={pick.games} />
          <Headline label="Seasons started" value={pick.seasons_started} />
          <Headline
            term={pick.hof ? "HOF" : "PROBOWL"}
            label={pick.hof ? "Hall of Fame" : "Pro Bowls"}
            value={pick.hof ? "★" : pick.probowls}
          />
        </div>

        {/* Combine athleticism radar */}
        {pick.combine && Object.keys(pick.combine.metrics).length > 0 && (
          <div className="border-b rule-line bg-navy-800/40 p-6 lg:p-8">
            <div className="mx-auto max-w-3xl">
              <div className="mb-5 flex items-end justify-between gap-3 border-b rule-line-strong pb-3">
                <div>
                  <div className="mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-orange-400">
                    <span className="h-px w-6 bg-orange-500" />
                    Combine athleticism
                  </div>
                  <div className="display mt-2 text-2xl uppercase tracking-wide text-cream-50">
                    Athletic Profile
                  </div>
                  <div className="editorial mt-1 text-sm text-cream-200/70">
                    Six-axis percentile within the{" "}
                    <span className="text-orange-300">
                      {pick.combine.position_group}
                    </span>{" "}
                    position group at the NFL Combine.
                  </div>
                </div>
                <div className="mono shrink-0 text-right text-[10px] uppercase tracking-[0.25em] text-cream-300/55">
                  <div>Source</div>
                  <div className="text-cream-200">NFL Combine</div>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <CombineRadar combine={pick.combine} size={420} />
              </div>
            </div>
          </div>
        )}

        {/* Position-relevant detail stats */}
        {stats.length > 0 && (
          <div className="border-b rule-line p-6 lg:p-8">
            <div className="mono mb-4 text-[10px] uppercase tracking-[0.3em] text-cream-300/60">
              Career production
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {stats.map((s) => (
                <Detail key={s.label} label={s.label} value={s.value} />
              ))}
            </div>
          </div>
        )}

        {/* Pick context */}
        <div className="p-6 lg:p-8">
          <div className="mono mb-3 text-[10px] uppercase tracking-[0.3em] text-cream-300/60">
            Draft context
          </div>
          <p className="editorial max-w-2xl text-cream-200/80">
            Selected by Chicago in the{" "}
            <span className="text-orange-300">{ordinal(pick.round)} round</span>{" "}
            with the{" "}
            <span className="text-orange-300">
              #{pick.pick} overall pick
            </span>{" "}
            of the {pick.season} NFL Draft.
            {pick.college && (
              <>
                {" "}Came out of <span className="italic">{pick.college}</span>.
              </>
            )}
            {incoming ? (
              <> Career hasn't started — too early to grade.</>
            ) : (pick.car_av ?? 0) > 30 ? (
              <> A long-tenured contributor for the franchise.</>
            ) : (pick.car_av ?? 0) > 10 ? (
              <> A meaningful rotation piece.</>
            ) : pick.games == null || pick.games < 16 ? (
              <> Never developed into a sustained NFL contributor.</>
            ) : null}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Headline({
  term,
  label,
  value,
}: {
  term?: TipTerm;
  label: string;
  value: number | string | null | undefined;
}) {
  return (
    <div className="px-5 py-6 text-center">
      <div className="mono text-[10px] uppercase tracking-[0.3em] text-cream-300/60">
        {term ? <Tip term={term}>{label}</Tip> : label}
      </div>
      <div className="display tabular mt-2 text-4xl text-cream-50 lg:text-5xl">
        {value == null || value === 0 ? "—" : value}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="border-l-2 border-orange-500/30 pl-3">
      <div className="mono text-[10px] uppercase tracking-[0.25em] text-cream-300/60">
        {label}
      </div>
      <div className="display tabular text-2xl text-cream-50">
        {formatStatNumber(value)}
      </div>
    </div>
  );
}

function relevantStats(p: DraftPick): { label: string; value: number | null }[] {
  const out: { label: string; value: number | null }[] = [];
  const pos = p.position ?? "";
  if (["QB"].includes(pos)) {
    out.push(
      { label: "Pass yards", value: p.pass_yards },
      { label: "Pass TDs", value: p.pass_tds },
      { label: "Completions", value: p.pass_completions },
      { label: "Attempts", value: p.pass_attempts },
      { label: "INTs thrown", value: p.pass_ints }
    );
  } else if (["RB", "FB"].includes(pos)) {
    out.push(
      { label: "Rush yards", value: p.rush_yards },
      { label: "Rush TDs", value: p.rush_tds },
      { label: "Carries", value: p.rush_atts },
      { label: "Receptions", value: p.receptions },
      { label: "Rec yards", value: p.rec_yards }
    );
  } else if (["WR", "TE"].includes(pos)) {
    out.push(
      { label: "Receptions", value: p.receptions },
      { label: "Rec yards", value: p.rec_yards },
      { label: "Rec TDs", value: p.rec_tds }
    );
  } else if (
    ["DE", "DT", "LB", "OLB", "ILB", "MLB", "EDGE", "NT"].includes(pos)
  ) {
    out.push(
      { label: "Sacks", value: p.def_sacks },
      { label: "Tackles (solo)", value: p.def_solo_tackles },
      { label: "INTs", value: p.def_ints }
    );
  } else if (["CB", "S", "FS", "SS", "DB"].includes(pos)) {
    out.push(
      { label: "INTs", value: p.def_ints },
      { label: "Tackles (solo)", value: p.def_solo_tackles },
      { label: "Sacks", value: p.def_sacks }
    );
  }
  return out.filter((s) => s.value != null && s.value > 0);
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function RosterDot({ status }: { status?: DraftPick["roster_status"] }) {
  const color =
    status === "active"
      ? "var(--color-orange-400)"
      : status === "practice_squad" || status === "ir_or_pup"
      ? "var(--color-cream-200)"
      : status === "rostered_2025"
      ? "var(--color-orange-500)"
      : status === "rookie"
      ? "var(--color-cream-200)"
      : "rgba(244,237,218,0.35)";
  const pulse = status === "active" || status === "rookie";
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{
        background: color,
        boxShadow: pulse
          ? `0 0 8px ${color}`
          : undefined,
      }}
    />
  );
}
