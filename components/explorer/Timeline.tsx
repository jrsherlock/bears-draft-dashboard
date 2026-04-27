"use client";

import { useMemo } from "react";
import type { DraftPick } from "@/lib/types";
import { useExplorer, pickKey } from "./ExplorerContext";
import { DraftCard } from "./DraftCard";

export function Timeline() {
  const { filtered, openPick, toggleCompare, compareSlots } = useExplorer();
  const compareKeys = new Set(
    compareSlots.filter(Boolean).map((p) => pickKey(p as DraftPick))
  );

  const grouped = useMemo(() => {
    const map = new Map<number, DraftPick[]>();
    for (const p of filtered) {
      const arr = map.get(p.season) ?? [];
      arr.push(p);
      map.set(p.season, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  return (
    <section id="timeline" className="relative">
      {filtered.length === 0 ? (
        <div className="border rule-line-strong px-6 py-20 text-center">
          <div className="display text-6xl text-cream-300/40">No picks</div>
          <div className="mono mt-3 text-xs uppercase tracking-[0.3em] text-cream-300/60">
            Adjust your filters to surface results.
          </div>
        </div>
      ) : (
        grouped.map(([year, picks]) => (
          <YearGroup
            key={year}
            year={year}
            picks={picks}
            openPick={openPick}
            toggleCompare={toggleCompare}
            compareKeys={compareKeys}
          />
        ))
      )}
    </section>
  );
}

function YearGroup({
  year,
  picks,
  openPick,
  toggleCompare,
  compareKeys,
}: {
  year: number;
  picks: DraftPick[];
  openPick: (p: DraftPick) => void;
  toggleCompare: (p: DraftPick) => void;
  compareKeys: Set<string>;
}) {
  const era = picks[0].era;
  const stars = picks.filter((p) => p.hof || (p.probowls ?? 0) >= 3).length;
  const total = picks.length;

  return (
    <div className="mb-6">
      {/* Year banner */}
      <div className="sticky top-0 z-20 -mx-3 mb-2 flex items-end gap-4 border-b-2 border-orange-500/50 bg-navy-900/85 px-3 py-3 backdrop-blur-md sm:gap-6 sm:px-4">
        <div className="display flex items-baseline gap-3 text-cream-50">
          <span className="text-[2.5rem] leading-none sm:text-[3.25rem]" style={{ letterSpacing: "-0.02em" }}>
            {year}
          </span>
          <span className="mono text-[10px] uppercase tracking-[0.3em] text-orange-400">
            {era}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4 mono text-[10px] uppercase tracking-[0.25em] text-cream-300/70">
          <span>
            <span className="display tabular text-xl text-cream-100">{total}</span>{" "}
            picks
          </span>
          {stars > 0 && (
            <span className="text-orange-300">
              <span className="display tabular text-xl">{stars}</span> star
              {stars !== 1 && "s"}
            </span>
          )}
        </div>
      </div>

      {/* Pick rows */}
      <div className="border rule-line-strong bg-navy-900/30">
        {picks.map((p) => (
          <DraftCard
            key={pickKey(p)}
            pick={p}
            onOpen={() => openPick(p)}
            onCompare={() => toggleCompare(p)}
            inCompare={compareKeys.has(pickKey(p))}
          />
        ))}
      </div>
    </div>
  );
}
