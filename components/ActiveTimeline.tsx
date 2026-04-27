"use client";

import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import type { DraftPick } from "@/lib/types";
import {
  careerStatus,
  rosterStatusLabel,
  type CareerStatus,
} from "@/lib/hit-score";
import { useExplorer } from "./explorer/ExplorerContext";
import { PlayerAvatar } from "./PlayerAvatar";

type Props = {
  picks: DraftPick[];
  latestSeason: number;
};

const CELL_W = 56;
const AVATAR = 30;
const GAP_Y = 4;
const STATUS_COLORS: Record<CareerStatus, string> = {
  active: "var(--color-orange-500)",
  rookie: "var(--color-cream-200)",
  retired: "transparent",
};

/**
 * Horizontal strip of every Bears draft pick, organized one column per year.
 * Active picks glow; rookies pulse; retired faces fade to monochrome. Click
 * any face to open the player modal.
 */
export function ActiveTimeline({ picks, latestSeason }: Props) {
  const { openPick } = useExplorer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<"all" | "active">("all");

  const { years, maxPerYear, counts, mostRecentActiveYear } = useMemo(() => {
    const map = new Map<number, DraftPick[]>();
    for (const p of picks) {
      const arr = map.get(p.season) ?? [];
      arr.push(p);
      map.set(p.season, arr);
    }
    // Sort each year by pick number so the column reads R1 down to R12.
    for (const arr of map.values()) arr.sort((a, b) => a.pick - b.pick);
    const sorted = Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    const max = Math.max(...sorted.map(([, arr]) => arr.length));
    const c = { active: 0, rookie: 0, retired: 0 };
    let mostRecent = 0;
    for (const p of picks) {
      const s = careerStatus(p, latestSeason);
      c[s]++;
      if (s === "active" && p.season > mostRecent) mostRecent = p.season;
    }
    return {
      years: sorted,
      maxPerYear: max,
      counts: c,
      mostRecentActiveYear: mostRecent,
    };
  }, [picks, latestSeason]);

  const visiblePicks = useMemo(() => {
    if (filter === "all") return null;
    return new Set(
      picks
        .filter((p) => careerStatus(p, latestSeason) === "active")
        .map((p) => `${p.season}-${p.pick}`)
    );
  }, [picks, latestSeason, filter]);

  // Auto-scroll to ~80% of the strip on mount so recent years are in view first.
  // (Render-once side effect via callback ref.)
  const setScrollRef = (el: HTMLDivElement | null) => {
    scrollRef.current = el;
    if (el && el.scrollLeft === 0) {
      requestAnimationFrame(() => {
        el.scrollLeft = el.scrollWidth;
      });
    }
  };

  const stripWidth = years.length * CELL_W;
  const stripHeight = maxPerYear * (AVATAR + GAP_Y + 12) + 32;

  return (
    <section
      id="constellation"
      className="relative border-t rule-line-strong bg-navy-900/60 py-14"
    >
      <div className="mx-auto max-w-[1400px] px-6">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mono mb-3 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-orange-400">
              <span className="h-px w-8 bg-orange-500" /> Still in the league
            </div>
            <h2 className="display text-[clamp(2rem,5vw,4rem)] leading-[0.9] text-cream-50">
              Every face. Every year.
              <br />
              <span
                className="italic text-orange-500"
                style={{ fontFamily: "var(--font-fraunces)", fontWeight: 900 }}
              >
                Glowing if still playing.
              </span>
            </h2>
            <p className="editorial mt-4 max-w-xl text-cream-200/75">
              Each column is a draft year, top-to-bottom by pick number. Glowing
              orange faces are{" "}
              <span className="text-orange-300">
                currently on an NFL roster
              </span>{" "}
              per Sleeper's daily-refreshed player directory, cross-checked
              against last season's nflverse rosters. Cream-pulsing faces are
              this year's rookies; muted faces have moved on.
            </p>
          </div>

          <div className="flex flex-col gap-2 mono text-[11px] uppercase tracking-[0.25em] text-cream-300/70">
            <Stat
              label="Still active"
              value={counts.active}
              total={picks.length}
              color="var(--color-orange-400)"
            />
            <Stat
              label="Rookies"
              value={counts.rookie}
              total={picks.length}
              color="var(--color-cream-200)"
            />
            <Stat
              label="Retired"
              value={counts.retired}
              total={picks.length}
              color="rgba(244,237,218,0.45)"
            />
            {mostRecentActiveYear > 0 && (
              <div className="mt-2 text-cream-300/55">
                Earliest active pick:{" "}
                <span className="text-cream-200 tabular">
                  {Math.min(
                    ...picks
                      .filter((p) => careerStatus(p, latestSeason) === "active")
                      .map((p) => p.season)
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div className="mb-4 flex items-center gap-2">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All picks
          </FilterPill>
          <FilterPill
            active={filter === "active"}
            onClick={() => setFilter("active")}
          >
            Only still playing
          </FilterPill>
        </div>

        {/* The strip */}
        <div
          ref={setScrollRef}
          className="relative overflow-x-auto overflow-y-hidden border rule-line-strong bg-navy-800/30 backdrop-blur-sm"
          style={{ scrollbarColor: "var(--color-orange-500) var(--color-navy-900)" }}
        >
          <div
            className="relative"
            style={{ width: stripWidth, minHeight: stripHeight, padding: "16px 0" }}
          >
            {years.map(([year, picksInYear], yearIdx) => (
              <YearColumn
                key={year}
                year={year}
                picks={picksInYear}
                xOffset={yearIdx * CELL_W}
                onOpen={openPick}
                latestSeason={latestSeason}
                visiblePicks={visiblePicks}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 mono text-[10px] uppercase tracking-[0.3em] text-cream-300/50">
          ← scroll horizontally · click any face to open the player ·{" "}
          {picks.length} picks across {years.length} drafts →
        </div>
      </div>
    </section>
  );
}

function YearColumn({
  year,
  picks,
  xOffset,
  onOpen,
  latestSeason,
  visiblePicks,
}: {
  year: number;
  picks: DraftPick[];
  xOffset: number;
  onOpen: (p: DraftPick) => void;
  latestSeason: number;
  visiblePicks: Set<string> | null;
}) {
  return (
    <div
      className="absolute top-0"
      style={{ left: xOffset, width: CELL_W, height: "100%" }}
    >
      {/* Year label */}
      <div
        className="display sticky top-0 mb-2 px-1 text-center mono text-[10px] uppercase tracking-[0.18em] text-cream-300/70"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {year}
      </div>
      {/* Vertical guideline */}
      <div className="absolute left-1/2 top-6 h-full w-px bg-cream-200/[0.04]" />

      {picks.map((p, i) => {
        const status = careerStatus(p, latestSeason);
        const dim = visiblePicks && !visiblePicks.has(`${p.season}-${p.pick}`);
        return (
          <button
            key={p.pick}
            onClick={() => onOpen(p)}
            title={`${p.display_name} · R${p.round} · #${p.pick} · ${p.position ?? "?"} — ${rosterStatusLabel(p)}`}
            className="group relative mb-1 flex w-full flex-col items-center"
            style={{ marginTop: i === 0 ? 0 : GAP_Y }}
          >
            <FaceCircle
              pick={p}
              status={status}
              dim={Boolean(dim)}
              size={AVATAR}
            />
            <div
              className={`mt-0.5 mono text-[8px] uppercase tracking-[0.04em] truncate w-full text-center leading-tight ${
                dim ? "text-cream-300/25" : "text-cream-200/75"
              }`}
              style={{ fontWeight: status === "active" ? 600 : 400 }}
            >
              {lastNameOf(p.display_name)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FaceCircle({
  pick,
  status,
  dim,
  size,
}: {
  pick: DraftPick;
  status: CareerStatus;
  dim: boolean;
  size: number;
}) {
  const ring = STATUS_COLORS[status];
  const muted = status === "retired" || dim;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow halo for active picks */}
      {status === "active" && !dim && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.55 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(200,56,3,0.55) 0%, rgba(200,56,3,0) 70%)",
            filter: "blur(4px)",
            transform: "scale(1.3)",
          }}
        />
      )}
      {/* Pulse for rookies */}
      {status === "rookie" && !dim && (
        <motion.div
          animate={{
            scale: [1, 1.18, 1],
            opacity: [0.55, 0.15, 0.55],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: "var(--color-cream-200)", borderWidth: 1.5 }}
        />
      )}

      <div
        className="relative rounded-full overflow-hidden transition"
        style={{
          width: size,
          height: size,
          border: `1.5px solid ${ring === "transparent" ? "rgba(244,237,218,0.18)" : ring}`,
          boxShadow:
            status === "active" && !dim
              ? "0 0 12px -2px rgba(200,56,3,0.6)"
              : "none",
        }}
      >
        <div
          style={{
            filter: muted ? "grayscale(0.85) brightness(0.55)" : "none",
            transition: "filter 200ms ease",
          }}
          className="group-hover:!filter-none"
        >
          <PlayerAvatar pick={pick} size={size} />
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`mono inline-flex items-center gap-1 border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] transition ${
        active
          ? "border-orange-500 bg-orange-500/15 text-orange-300"
          : "rule-line-strong text-cream-200 hover:border-cream-100"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="display tabular text-2xl" style={{ color }}>
        {value}
      </span>
      <span className="text-cream-300/70">
        {label} · {total > 0 ? Math.round((value / total) * 100) : 0}%
      </span>
    </div>
  );
}

function lastNameOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 1];
}
