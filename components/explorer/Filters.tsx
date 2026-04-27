"use client";

import { motion, AnimatePresence } from "motion/react";
import { Search, X, Sliders } from "lucide-react";
import { useMemo } from "react";
import { useExplorer } from "./ExplorerContext";
import { useHitScore } from "@/lib/hit-score";
import type { DraftPick } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  picks: DraftPick[];
};

export function Filters({ picks }: Props) {
  const { filters, setSearch, toggle, clearAll, filtered } = useExplorer();
  const {
    isCustom: hitScoreCustom,
    openPanel: openHitScorePanel,
    hintSeen,
  } = useHitScore();
  const showHint = !hintSeen && !hitScoreCustom;

  const decades = useMemo(
    () => Array.from(new Set(picks.map((p) => p.decade))).sort(),
    [picks]
  );
  const rounds = useMemo(
    () => Array.from(new Set(picks.map((p) => p.round))).sort((a, b) => a - b),
    [picks]
  );
  const positions = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of picks) {
      const k = p.position ?? "?";
      counts[k] = (counts[k] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [picks]);
  const eras = useMemo(
    () =>
      Array.from(new Set(picks.map((p) => p.era))).sort((a, b) => {
        // Most recent era first
        const order = [
          "Ryan Poles",
          "Ryan Pace",
          "Phil Emery",
          "Jerry Angelo",
          "Rod Graves / Mark Hatley",
          "Bill Tobin",
          "Pre-1987",
        ];
        return order.indexOf(a) - order.indexOf(b);
      }),
    [picks]
  );
  const colleges = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of picks) {
      const k = p.college ?? "Unknown";
      counts[k] = (counts[k] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24);
  }, [picks]);

  const activeCount =
    filters.decades.size +
    filters.rounds.size +
    filters.positions.size +
    filters.colleges.size +
    filters.eras.size +
    (filters.search ? 1 : 0);

  return (
    <div className="border rule-line-strong bg-navy-800/30 backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 border-b rule-line px-5 py-3">
        <div className="mono text-[11px] uppercase tracking-[0.3em] text-cream-300/70">
          Filters
        </div>
        <div className="group/hit relative">
          <button
            onClick={openHitScorePanel}
            className={cn(
              "mono relative inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] uppercase tracking-[0.2em] transition",
              hitScoreCustom
                ? "border-orange-500 bg-orange-500/15 text-orange-300"
                : "rule-line-strong text-cream-200 hover:border-cream-100 hover:text-cream-50",
              showHint && "hit-score-pulse"
            )}
            aria-label="Open hit-score methodology panel"
          >
            <Sliders size={11} />
            Hit score · {hitScoreCustom ? "Custom" : "Default"}
            {hitScoreCustom ? (
              <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
            ) : (
              <span className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-rule-strong text-[8px] tracking-normal text-cream-300/70">
                ?
              </span>
            )}
          </button>

          {/* Hover tooltip — always available, shows on hover */}
          <div
            role="tooltip"
            className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 border rule-line-strong bg-navy-900 p-3 opacity-0 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)] transition-opacity duration-150 group-hover/hit:opacity-100"
          >
            <div className="mono mb-1 text-[10px] uppercase tracking-[0.25em] text-orange-400">
              Hit Score
            </div>
            <p className="editorial text-xs leading-snug text-cream-200/90">
              A 0–100 quality rating per pick, blending career AV, accolades,
              and longevity.
            </p>
            <div className="mono mt-2 text-[9px] uppercase tracking-[0.25em] text-cream-300/70">
              Click to see the formula and tune it
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes hitscore-pulse {
            0%, 100% {
              box-shadow:
                0 0 0 0 rgba(200, 56, 3, 0.0),
                0 0 0 0 rgba(200, 56, 3, 0.0);
            }
            40% {
              box-shadow:
                0 0 0 4px rgba(200, 56, 3, 0.18),
                0 0 14px 4px rgba(200, 56, 3, 0.35);
            }
          }
          :global(.hit-score-pulse) {
            animation: hitscore-pulse 2.4s ease-in-out infinite;
            border-color: var(--color-orange-500) !important;
          }
        `}</style>
        <div className="ml-auto mono text-xs text-cream-200/80">
          <span className="display tabular text-2xl text-orange-400">
            {filtered.length}
          </span>
          <span className="ml-2 uppercase tracking-[0.2em] text-cream-300/60">
            / {picks.length} picks
          </span>
        </div>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="mono inline-flex items-center gap-1 border rule-line-strong px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cream-200 transition hover:border-orange-500 hover:text-orange-400"
          >
            <X size={11} /> Clear ({activeCount})
          </button>
        )}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-12">
        {/* Search */}
        <div className="lg:col-span-12">
          <label className="relative block">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-cream-300/60"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, college, position…"
              className="editorial w-full border rule-line bg-navy-900/60 py-3 pl-11 pr-4 text-cream-50 placeholder:text-cream-300/40 focus:border-orange-500 focus:outline-none focus:ring-0"
            />
          </label>
        </div>

        <FilterGroup label="Decade" className="lg:col-span-4">
          {decades.map((d) => (
            <Chip
              key={d}
              active={filters.decades.has(d)}
              onClick={() => toggle("decades", d)}
            >
              {d}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Round" className="lg:col-span-4">
          {rounds.map((r) => (
            <Chip
              key={r}
              active={filters.rounds.has(r)}
              onClick={() => toggle("rounds", r)}
            >
              R{r}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="GM Era" className="lg:col-span-4">
          {eras.map((e) => (
            <Chip
              key={e}
              active={filters.eras.has(e)}
              onClick={() => toggle("eras", e)}
              size="sm"
            >
              {e}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Position" className="lg:col-span-7">
          {positions.map(([p, n]) => (
            <Chip
              key={p}
              active={filters.positions.has(p)}
              onClick={() => toggle("positions", p)}
            >
              {p} <span className="ml-1 text-cream-300/50">{n}</span>
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Top colleges" className="lg:col-span-5">
          {colleges.map(([c, n]) => (
            <Chip
              key={c}
              active={filters.colleges.has(c)}
              onClick={() => toggle("colleges", c)}
              size="sm"
            >
              {c}
              <span className="ml-1 text-cream-300/50">{n}</span>
            </Chip>
          ))}
        </FilterGroup>
      </div>

      <AnimatePresence>
        {activeCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t rule-line bg-orange-500/5"
          >
            <div className="px-5 py-2 mono text-[11px] uppercase tracking-[0.25em] text-orange-300">
              {activeCount} filter{activeCount !== 1 ? "s" : ""} active —{" "}
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterGroup({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mono mb-2 text-[10px] uppercase tracking-[0.3em] text-cream-300/50">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  size = "md",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "mono inline-flex items-center border uppercase tracking-[0.1em] transition",
        size === "sm" ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-[11px]",
        active
          ? "border-orange-500 bg-orange-500/15 text-orange-300"
          : "rule-line-strong bg-cream-50/[0.02] text-cream-200 hover:border-cream-200 hover:text-cream-50"
      )}
    >
      {children}
    </button>
  );
}
