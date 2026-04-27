"use client";

import { motion } from "motion/react";
import type { CombineRecord } from "@/lib/types";

type Props = {
  combine: CombineRecord;
  size?: number;
};

const AXES: Array<keyof CombineRecord["metrics"]> = [
  "forty",
  "vertical",
  "broad_jump",
  "bench",
  "cone",
  "shuttle",
];

/**
 * Six-axis radar chart showing the player's combine performance as a
 * percentile within their position group. Custom SVG (no Recharts) so the
 * styling is fully on-brand and the polygon morphs with motion.
 *
 * Each axis is rendered with a label, the player's raw value, and an orange
 * percentile dot whose radial distance reflects their position-percentile.
 */
export function CombineRadar({ combine, size = 280 }: Props) {
  // Generous outer padding so labels don't clip on the left/right axes.
  const radius = size / 2 - 56;
  const cx = size / 2;
  const cy = size / 2;
  const axisCount = AXES.length;
  const ringSteps = [0.25, 0.5, 0.75, 1];

  // Compute (x,y) for an axis index at a given radial fraction (0..1).
  const point = (axisIdx: number, frac: number) => {
    const angle = (Math.PI * 2 * axisIdx) / axisCount - Math.PI / 2;
    return [cx + radius * frac * Math.cos(angle), cy + radius * frac * Math.sin(angle)];
  };

  // Build the polygon from MEASURED axes only — sinking missing axes to 0
  // would visually imply the player scored a zero, which isn't true; they
  // just skipped the drill.
  const measuredAxes = AXES.map((axis, i) => ({ axis, i, m: combine.metrics[axis] }))
    .filter((x): x is { axis: typeof AXES[number]; i: number; m: NonNullable<typeof x.m> } =>
      Boolean(x.m)
    );
  const polygon = measuredAxes
    .map(({ i, m }) => point(i, m.percentile))
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
  const measured = measuredAxes.length;
  if (measured === 0) return null;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Combine athleticism radar chart"
      >
        {/* Concentric rings (25 / 50 / 75 / 100 percentile contours) */}
        {ringSteps.map((step) => (
          <polygon
            key={step}
            points={Array.from({ length: axisCount }, (_, i) => {
              const [x, y] = point(i, step);
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(244,237,218,0.08)"
            strokeWidth={step === 1 ? 1 : 0.6}
          />
        ))}

        {/* Spokes */}
        {AXES.map((_, i) => {
          const [x, y] = point(i, 1);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="rgba(244,237,218,0.10)"
              strokeWidth={0.8}
            />
          );
        })}

        {/* Player polygon — only render when we have enough vertices for a real shape */}
        {measured >= 3 && (
          <motion.polygon
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            points={polygon}
            fill="rgba(200,56,3,0.22)"
            stroke="var(--color-orange-500)"
            strokeWidth={1.5}
          />
        )}

        {/* Axis dots + labels */}
        {AXES.map((axis, i) => {
          const m = combine.metrics[axis];
          const [labelX, labelY] = point(i, 1.18);
          if (!m) {
            return (
              <g key={axis}>
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={anchorFor(i, axisCount)}
                  dominantBaseline="middle"
                  className="mono"
                  fontSize={9}
                  fill="rgba(244,237,218,0.35)"
                  letterSpacing="0.08em"
                >
                  {labelLookup[axis]}
                </text>
                <text
                  x={labelX}
                  y={labelY + 11}
                  textAnchor={anchorFor(i, axisCount)}
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="rgba(244,237,218,0.3)"
                >
                  —
                </text>
              </g>
            );
          }
          const [dotX, dotY] = point(i, m.percentile);
          return (
            <g key={axis}>
              <motion.circle
                initial={{ r: 0 }}
                animate={{ r: 4 }}
                transition={{ delay: 0.4 + i * 0.05, duration: 0.4 }}
                cx={dotX}
                cy={dotY}
                fill="var(--color-orange-400)"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor={anchorFor(i, axisCount)}
                dominantBaseline="middle"
                className="mono"
                fontSize={9}
                fill="rgba(244,237,218,0.6)"
                letterSpacing="0.08em"
              >
                {labelLookup[axis]}
              </text>
              <text
                x={labelX}
                y={labelY + 12}
                textAnchor={anchorFor(i, axisCount)}
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={700}
                fill="var(--color-cream-50)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatValue(axis, m.value)}
              </text>
              <text
                x={labelX}
                y={labelY + 23}
                textAnchor={anchorFor(i, axisCount)}
                dominantBaseline="middle"
                className="mono"
                fontSize={9}
                fill="var(--color-orange-400)"
              >
                {Math.round(m.percentile * 100)}%
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 mono text-[10px] uppercase tracking-[0.25em] text-cream-300/60 text-center">
        Position percentile vs.{" "}
        <span className="text-orange-300">{combine.position_group}</span> group
        {Number.isFinite(combine.height) && combine.height ? (
          <>
            {" "}·{" "}
            <span className="text-cream-200">
              {formatHeight(combine.height)}
            </span>
          </>
        ) : null}
        {Number.isFinite(combine.weight) && combine.weight ? (
          <>
            , <span className="text-cream-200">{combine.weight} lbs</span>
          </>
        ) : null}
        {measured < AXES.length && (
          <span className="block text-cream-300/50 mt-0.5">
            {measured}/{AXES.length} drills measured · skipped events shown as
            “—”
          </span>
        )}
      </div>
    </div>
  );
}

const labelLookup: Record<string, string> = {
  forty: "40 YD",
  vertical: "VERT",
  broad_jump: "BROAD",
  bench: "BENCH",
  cone: "3-CONE",
  shuttle: "SHUTTLE",
};

function anchorFor(i: number, total: number): "start" | "middle" | "end" {
  // Top = middle, right side = start (label sits right of axis), left = end.
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
  const dx = Math.cos(angle);
  if (Math.abs(dx) < 0.1) return "middle";
  return dx > 0 ? "start" : "end";
}

function formatValue(metric: string, v: number): string {
  if (metric === "forty" || metric === "cone" || metric === "shuttle") {
    return v.toFixed(2) + "s";
  }
  if (metric === "broad_jump") {
    // inches → feet'inches"
    const ft = Math.floor(v / 12);
    const inches = Math.round(v - ft * 12);
    return `${ft}'${inches}"`;
  }
  if (metric === "vertical") return `${v}″`;
  if (metric === "bench") return `${Math.round(v)}×`;
  return String(v);
}

function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const inch = Math.round(inches - ft * 12);
  return `${ft}'${inch}"`;
}
