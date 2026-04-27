"use client";

import { motion } from "motion/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { useMemo } from "react";
import type { DraftPick } from "@/lib/types";
import { useHitScore } from "@/lib/hit-score";
import { Tip } from "@/components/ui/Tip";

type Props = { picks: DraftPick[] };

export function Dashboard({ picks }: Props) {
  const { score: hitScore, isIncoming } = useHitScore();

  // Career-graded picks only — current-year rookies haven't had a chance.
  const graded = useMemo(
    () => picks.filter((p) => !isIncoming(p)),
    [picks, isIncoming]
  );

  const positionData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of picks) {
      const k = p.position ?? "?";
      map[k] = (map[k] || 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([position, count]) => ({ position, count }));
  }, [picks]);

  const decadeData = useMemo(() => {
    const map = new Map<string, { decade: string; picks: number; stars: number }>();
    for (const p of picks) {
      const e = map.get(p.decade) ?? { decade: p.decade, picks: 0, stars: 0 };
      e.picks++;
      if (p.hof || (p.probowls ?? 0) >= 3) e.stars++;
      map.set(p.decade, e);
    }
    return Array.from(map.values()).sort((a, b) => a.decade.localeCompare(b.decade));
  }, [picks]);

  const roundHitData = useMemo(() => {
    const buckets: Record<number, { hits: number; total: number }> = {};
    for (const p of graded) {
      const r = p.round;
      if (!buckets[r]) buckets[r] = { hits: 0, total: 0 };
      buckets[r].total++;
      if (hitScore(p) >= 55) buckets[r].hits++;
    }
    return Object.entries(buckets)
      .map(([round, b]) => ({
        round: `R${round}`,
        rate: Math.round((b.hits / b.total) * 100),
        hits: b.hits,
        total: b.total,
      }))
      .sort((a, b) => parseInt(a.round.slice(1)) - parseInt(b.round.slice(1)));
  }, [graded, hitScore]);

  const topPicks = useMemo(
    () =>
      [...graded]
        .sort((a, b) => hitScore(b) - hitScore(a))
        .slice(0, 5),
    [graded, hitScore]
  );
  const worstPicks = useMemo(
    () =>
      [...graded]
        .filter((p) => p.round <= 3)
        .sort((a, b) => hitScore(a) - hitScore(b))
        .slice(0, 5),
    [graded, hitScore]
  );

  return (
    <section
      id="dashboard"
      className="relative border-t rule-line-strong bg-navy-900/60 py-16"
    >
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <div className="mono mb-3 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-orange-400">
              <span className="h-px w-8 bg-orange-500" /> The dashboard
            </div>
            <h2 className="display text-[clamp(2rem,5vw,4rem)] leading-[0.9] text-cream-50">
              Trends, hit rate,
              <br />
              and the franchise's appetite.
            </h2>
          </div>
          <div className="hidden mono text-[10px] uppercase tracking-[0.3em] text-cream-300/60 lg:block">
            <div>updated automatically</div>
            <div>from nflverse</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Positions */}
          <Panel title="Most-drafted positions" className="lg:col-span-5">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart
                  data={positionData}
                  layout="vertical"
                  margin={{ top: 6, right: 12, left: 0, bottom: 6 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="position"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip cursor={{ fill: "rgba(244,237,218,0.04)" }} content={<TT />} />
                  <Bar dataKey="count" radius={[0, 0, 0, 0]}>
                    {positionData.map((d, i) => (
                      <Cell
                        key={d.position}
                        fill={i === 0 ? "var(--color-orange-500)" : "var(--color-navy-400)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Picks per decade */}
          <Panel title="Picks per decade" className="lg:col-span-7">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={decadeData}
                  margin={{ top: 8, right: 18, left: 0, bottom: 6 }}
                >
                  <defs>
                    <linearGradient id="picksGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-orange-500)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="var(--color-orange-500)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="starsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-cream-100)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-cream-100)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid />
                  <XAxis dataKey="decade" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ stroke: "var(--color-orange-500)" }} content={<TT />} />
                  <Area
                    type="monotone"
                    dataKey="picks"
                    stroke="var(--color-orange-500)"
                    fill="url(#picksGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="stars"
                    stroke="var(--color-cream-100)"
                    fill="url(#starsGradient)"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 mono text-[10px] uppercase tracking-[0.25em] text-cream-300/70">
              <Legend color="var(--color-orange-500)" label="Total picks" />
              <Legend color="var(--color-cream-100)" label="Star picks (HOF / 3+ Pro Bowls)" />
            </div>
          </Panel>

          {/* Hit rate by round */}
          <Panel title="Hit rate by round" className="lg:col-span-5">
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={roundHitData} margin={{ top: 8, right: 18, left: 0, bottom: 6 }}>
                  <CartesianGrid />
                  <XAxis dataKey="round" axisLine={false} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip cursor={{ fill: "rgba(244,237,218,0.04)" }} content={<TT />} />
                  <Bar dataKey="rate" radius={[0, 0, 0, 0]}>
                    {roundHitData.map((d) => (
                      <Cell
                        key={d.round}
                        fill={d.rate > 30 ? "var(--color-orange-500)" : "var(--color-navy-400)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 mono text-[10px] uppercase tracking-[0.25em] text-cream-300/70">
              A "hit" = career hit-score ≥ 55 (multi-year contributor or better)
            </div>
          </Panel>

          {/* Best picks */}
          <Panel title="Hall of Fame · Best picks" className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {topPicks.map((p, i) => (
                <PickRow key={`${p.season}-${p.pick}`} p={p} rank={i + 1} accent />
              ))}
            </div>
          </Panel>

          {/* Worst picks */}
          <Panel title="Hall of Shame · Top-3-round busts" className="lg:col-span-12">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {worstPicks.map((p, i) => (
                <PickRow key={`${p.season}-${p.pick}`} p={p} rank={i + 1} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative border rule-line-strong bg-navy-800/30 p-5 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="display text-lg uppercase tracking-wide text-cream-50">
          {title}
        </h3>
        <span className="h-px flex-1 ml-4 ticker-divider" />
      </div>
      {children}
    </motion.div>
  );
}

function PickRow({
  p,
  rank,
  accent = false,
}: {
  p: DraftPick;
  rank: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border rule-line bg-navy-900/40 px-3 py-2">
      <div
        className="display tabular text-xl"
        style={{
          color: accent ? "var(--color-orange-400)" : "var(--color-cream-300)",
        }}
      >
        {rank.toString().padStart(2, "0")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="editorial truncate text-cream-50">{p.display_name}</div>
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-cream-300/60">
          {p.season} · R{p.round} · #{p.pick} · {p.position}
        </div>
      </div>
      <div className="text-right">
        <div className="mono text-[9px] uppercase tracking-[0.2em] text-cream-300/50">
          <Tip term="AV">AV</Tip>
        </div>
        <div className="display tabular text-lg text-cream-100">
          {p.car_av ?? p.w_av ?? "—"}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2" style={{ background: color }} />
      {label}
    </span>
  );
}

function TT({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="border rule-line-strong bg-navy-900 px-3 py-2 mono text-[11px] uppercase tracking-[0.15em] text-cream-100 shadow-lg">
      <div className="text-cream-300/70">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="h-2 w-2"
            style={{ background: entry.color || entry.fill }}
          />
          <span>
            {entry.dataKey}:{" "}
            <span className="text-orange-400">{entry.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
