"use client";

import { motion } from "motion/react";
import { Plus, Check } from "lucide-react";
import type { DraftPick } from "@/lib/types";
import { cn } from "@/lib/utils";
import { hitColor, hitLabel, useHitScore } from "@/lib/hit-score";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type Props = {
  pick: DraftPick;
  onOpen: () => void;
  onCompare: () => void;
  inCompare: boolean;
};

export function DraftCard({ pick, onOpen, onCompare, inCompare }: Props) {
  const { score: scoreFn, isIncoming } = useHitScore();
  const incoming = isIncoming(pick);
  const score = scoreFn(pick);
  const color = hitColor(score, incoming);
  const label = hitLabel(score, incoming);

  return (
    <div
      className="group relative border-b rule-line px-3 py-3 transition hover:bg-cream-50/[0.025] sm:px-4"
    >
      {/* Hit-score bar */}
      <div className="absolute left-0 top-0 h-full w-[3px]" style={{ background: color }} />

      <div className="flex items-center gap-3 sm:gap-5">
        {/* Pick number */}
        <button
          onClick={onOpen}
          className="flex w-12 shrink-0 flex-col items-center justify-center text-center sm:w-16"
        >
          <div className="mono text-[10px] uppercase tracking-[0.2em] text-cream-300/50">
            R{pick.round}
          </div>
          <div className="display tabular text-2xl leading-none text-cream-50 group-hover:text-orange-400 sm:text-4xl">
            {pick.pick}
          </div>
        </button>

        {/* Avatar */}
        <button onClick={onOpen} className="shrink-0">
          <div className="relative border rule-line-strong">
            <PlayerAvatar pick={pick} size={52} />
            {pick.hof && (
              <span
                className="display absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-navy-900 text-[9px] tracking-tight sm:-right-2 sm:-top-2 sm:h-7 sm:w-7 sm:text-[10px]"
                style={{ background: "var(--color-hof)", color: "var(--color-navy-900)" }}
              >
                HOF
              </span>
            )}
          </div>
        </button>

        {/* Name + meta */}
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-baseline gap-2">
            <span
              className="editorial truncate text-lg font-semibold text-cream-50 transition group-hover:text-orange-300 sm:text-2xl"
              style={{ fontWeight: 600 }}
            >
              {pick.display_name}
            </span>
            <span className="chip shrink-0 !text-[9px] sm:!text-[11px]">
              {pick.position ?? "?"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
            <span className="editorial truncate italic text-cream-200/70">
              {pick.college ?? "—"}
            </span>
            <span className="mono hidden text-[11px] uppercase tracking-[0.2em] text-cream-300/50 sm:inline">
              · {pick.era}
            </span>
          </div>
        </button>

        {/* Career stats — desktop only */}
        <div className="hidden shrink-0 items-center gap-3 sm:flex sm:gap-4">
          <Stat label="AV" value={pick.car_av ?? pick.w_av} />
          <Stat label="GP" value={pick.games} />
          <Stat label="Pro Bowl" value={pick.probowls} accent={(pick.probowls ?? 0) > 0} />
          <div className="ml-2 flex w-16 flex-col items-end">
            <div
              className="mono text-[10px] uppercase tracking-[0.2em]"
              style={{ color }}
            >
              {label}
            </div>
            <div className="mt-1 h-[3px] w-full overflow-hidden bg-navy-900">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
                style={{ background: color }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={onCompare}
          aria-label={inCompare ? "Remove from compare" : "Add to compare"}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center border transition",
            inCompare
              ? "border-orange-500 bg-orange-500 text-cream-50"
              : "rule-line-strong text-cream-200 hover:border-orange-500 hover:text-orange-400"
          )}
        >
          {inCompare ? <Check size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {/* Mobile-only stats row */}
      <div className="mt-2 flex items-center justify-between gap-3 pl-[60px] mono text-[10px] uppercase tracking-[0.2em] text-cream-300/70 sm:hidden">
        <span>
          AV{" "}
          <span className="display tabular text-base text-cream-100">
            {pick.car_av ?? pick.w_av ?? "—"}
          </span>
        </span>
        <span>
          GP{" "}
          <span className="display tabular text-base text-cream-100">
            {pick.games ?? "—"}
          </span>
        </span>
        <span className={cn((pick.probowls ?? 0) > 0 && "text-orange-400")}>
          PB{" "}
          <span className="display tabular text-base">
            {pick.probowls ?? 0}
          </span>
        </span>
        <span className="mono text-[10px]" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | null | undefined;
  accent?: boolean;
}) {
  return (
    <div className="flex w-12 flex-col items-end sm:w-14">
      <div className="mono text-[9px] uppercase tracking-[0.2em] text-cream-300/50">
        {label}
      </div>
      <div
        className={cn(
          "display tabular text-lg leading-none",
          accent ? "text-orange-400" : "text-cream-100"
        )}
      >
        {value == null ? "—" : value}
      </div>
    </div>
  );
}
