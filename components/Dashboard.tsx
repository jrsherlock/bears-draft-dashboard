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
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { useMemo } from "react";
import type { DraftPick } from "@/lib/types";
import { useHitScore } from "@/lib/hit-score";
import { Tip } from "@/components/ui/Tip";
import {
  POSITION_GROUPS,
  POSITION_GROUP_COLORS,
  positionGroup,
} from "@/lib/utils";

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

  // ── New: position mix per decade for the stacked area chart.
  // Each row is a decade with one numeric column per position group.
  const positionMixByDecade = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const p of picks) {
      const decade = p.decade;
      const group = positionGroup(p.position);
      if (!map.has(decade)) {
        map.set(decade, Object.fromEntries(POSITION_GROUPS.map((g) => [g, 0])));
      }
      const row = map.get(decade)!;
      if (POSITION_GROUPS.includes(group as any)) row[group]++;
    }
    return Array.from(map.entries())
      .map(([decade, counts]) => ({ decade, ...counts }))
      .sort((a, b) => a.decade.localeCompare(b.decade));
  }, [picks]);

  // ── New: GM era report cards. Sliced from `graded` so rookies don't drag down hit rate.
  const eraStats = useMemo(() => {
    type Bucket = {
      era: string;
      yearStart: number;
      yearEnd: number;
      picks: number;
      hits: number;
      stars: number;
      totalAv: number;
    };
    const map = new Map<string, Bucket>();
    for (const p of graded) {
      const era = p.era || "?";
      const b = map.get(era) ?? {
        era,
        yearStart: p.season,
        yearEnd: p.season,
        picks: 0,
        hits: 0,
        stars: 0,
        totalAv: 0,
      };
      b.yearStart = Math.min(b.yearStart, p.season);
      b.yearEnd = Math.max(b.yearEnd, p.season);
      b.picks++;
      const score = hitScore(p);
      if (score >= 55) b.hits++;
      if (p.hof || (p.probowls ?? 0) >= 3) b.stars++;
      b.totalAv += p.car_av ?? p.w_av ?? 0;
      map.set(era, b);
    }
    return Array.from(map.values()).sort((a, b) => b.yearEnd - a.yearEnd);
  }, [graded, hitScore]);

  // ── New: scatter data — each pick is one dot at (pick_number, career_AV).
  // Bucket by hit-tier so we can color-code in the chart.
  const scatterData = useMemo(() => {
    return graded
      .filter((p) => p.car_av != null || p.w_av != null)
      .map((p) => {
        const av = p.car_av ?? p.w_av ?? 0;
        const score = hitScore(p);
        let tier: "star" | "hit" | "role" | "bust";
        if (p.hof) tier = "star";
        else if (score >= 75) tier = "star";
        else if (score >= 45) tier = "hit";
        else if (score >= 20) tier = "role";
        else tier = "bust";
        return {
          pick: p.pick,
          av,
          name: p.display_name,
          season: p.season,
          position: p.position ?? "?",
          tier,
          hof: p.hof ?? false,
        };
      });
  }, [graded, hitScore]);

  const tierColor: Record<string, string> = {
    star: "var(--color-orange-400)",
    hit: "var(--color-orange-500)",
    role: "var(--color-cream-300)",
    bust: "var(--color-navy-400)",
  };

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

          {/* ── NEW: Position mix by decade — full-width stacked area */}
          <Panel
            title="Position mix · how priorities shifted"
            className="lg:col-span-12"
          >
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={positionMixByDecade}
                  margin={{ top: 8, right: 18, left: 0, bottom: 6 }}
                  stackOffset="expand"
                >
                  <CartesianGrid horizontal={true} vertical={false} />
                  <XAxis dataKey="decade" axisLine={false} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--color-orange-500)" }}
                    content={<MixTooltip />}
                  />
                  {POSITION_GROUPS.map((g) => (
                    <Area
                      key={g}
                      type="monotone"
                      dataKey={g}
                      stackId="1"
                      stroke="rgba(0,0,0,0.4)"
                      strokeWidth={0.5}
                      fill={POSITION_GROUP_COLORS[g]}
                      fillOpacity={0.92}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 mono text-[10px] uppercase tracking-[0.2em] text-cream-300/70">
              {POSITION_GROUPS.map((g) => (
                <Legend key={g} color={POSITION_GROUP_COLORS[g]} label={g} />
              ))}
            </div>
            <div className="mt-2 mono text-[10px] uppercase tracking-[0.25em] text-cream-300/55">
              Each decade's stripes show the share of Bears picks at every
              position group. Defense (DL · LB · DB) trends visible at a glance.
            </div>
          </Panel>

          {/* ── NEW: GM Era report cards */}
          <Panel
            title="GM era report cards"
            className="lg:col-span-7"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {eraStats.map((e) => (
                <EraCard key={e.era} era={e} />
              ))}
            </div>
            <div className="mt-2 mono text-[10px] uppercase tracking-[0.25em] text-cream-300/55">
              Hit rate &amp; star count exclude this year's rookies.
            </div>
          </Panel>

          {/* ── NEW: Pick number vs Career AV scatter */}
          <Panel
            title="Pick number vs. Career AV"
            className="lg:col-span-5"
          >
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <ScatterChart
                  margin={{ top: 8, right: 18, left: 4, bottom: 6 }}
                >
                  <CartesianGrid />
                  <XAxis
                    type="number"
                    dataKey="pick"
                    name="Pick"
                    domain={[0, 260]}
                    axisLine={false}
                    tickLine={false}
                    label={{
                      value: "Overall pick #",
                      position: "insideBottom",
                      offset: -2,
                      fill: "rgba(244,237,218,0.55)",
                      fontSize: 10,
                      letterSpacing: "0.15em",
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="av"
                    name="AV"
                    axisLine={false}
                    tickLine={false}
                    label={{
                      value: "Career AV",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      fill: "rgba(244,237,218,0.55)",
                      fontSize: 10,
                      letterSpacing: "0.15em",
                    }}
                  />
                  <ZAxis type="number" range={[24, 72]} />
                  <Tooltip
                    cursor={{ stroke: "var(--color-orange-500)", strokeWidth: 1 }}
                    content={<ScatterTooltip />}
                  />
                  {(["bust", "role", "hit", "star"] as const).map((tier) => (
                    <Scatter
                      key={tier}
                      name={tier}
                      data={scatterData.filter((d) => d.tier === tier)}
                      fill={tierColor[tier]}
                      fillOpacity={tier === "bust" ? 0.5 : 0.85}
                      stroke={tier === "star" ? "var(--color-cream-50)" : "none"}
                      strokeWidth={tier === "star" ? 1.5 : 0}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 mono text-[10px] uppercase tracking-[0.2em] text-cream-300/70">
              <Legend color={tierColor.star} label="Star" />
              <Legend color={tierColor.hit} label="Hit" />
              <Legend color={tierColor.role} label="Role" />
              <Legend color={tierColor.bust} label="Bust" />
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

/** Tooltip for the position-mix stacked-area chart. Shows actual counts and
 *  percentages for the hovered decade, biggest groups first. */
function MixTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const total = payload.reduce(
    (s: number, p: any) => s + (p.value as number),
    0
  );
  const sorted = [...payload]
    .filter((p) => (p.value as number) > 0)
    .sort((a, b) => (b.value as number) - (a.value as number));
  return (
    <div className="border rule-line-strong bg-navy-900 px-3 py-2 mono text-[11px] uppercase tracking-[0.15em] shadow-lg">
      <div className="display text-base text-cream-50">{label}</div>
      <div className="text-[10px] text-cream-300/65">
        {total} pick{total !== 1 ? "s" : ""}
      </div>
      <div className="mt-2 space-y-1">
        {sorted.map((entry: any) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0"
                style={{ background: entry.color || entry.fill }}
              />
              <span className="w-7 text-cream-200">{entry.dataKey}</span>
              <span className="tabular text-cream-100">{entry.value}</span>
              <span className="ml-auto tabular text-orange-400">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tooltip for the scatter — name, pick, AV, and tier. */
function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="border rule-line-strong bg-navy-900 px-3 py-2 shadow-lg">
      <div className="display text-base text-cream-50">{d.name}</div>
      <div className="mono mt-1 text-[10px] uppercase tracking-[0.2em] text-cream-300/65">
        {d.season} · #{d.pick} · {d.position}
      </div>
      <div className="mono mt-2 flex items-center gap-3 text-[11px] uppercase tracking-[0.15em]">
        <span className="text-cream-300/65">AV</span>
        <span className="display tabular text-lg text-orange-400">{d.av}</span>
        {d.hof && (
          <span
            className="ml-2 px-1.5 py-0.5 text-[9px] tracking-[0.2em]"
            style={{
              background: "var(--color-hof)",
              color: "var(--color-navy-900)",
            }}
          >
            HOF
          </span>
        )}
      </div>
    </div>
  );
}

/** Single GM era report card. Shows the era's name, span, and four KPIs. */
function EraCard({
  era,
}: {
  era: {
    era: string;
    yearStart: number;
    yearEnd: number;
    picks: number;
    hits: number;
    stars: number;
    totalAv: number;
  };
}) {
  const hitRate = era.picks > 0 ? Math.round((era.hits / era.picks) * 100) : 0;
  return (
    <div className="border rule-line-strong bg-navy-900/40 p-3">
      <div className="flex items-baseline justify-between">
        <div className="display text-base uppercase tracking-wide text-cream-50">
          {era.era}
        </div>
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-cream-300/55">
          {era.yearStart}–{era.yearEnd}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        <EraStat label="Picks" value={era.picks} />
        <EraStat label="Hit %" value={`${hitRate}%`} accent={hitRate >= 35} />
        <EraStat label="Stars" value={era.stars} accent={era.stars > 0} />
        <EraStat label="Σ AV" value={era.totalAv.toLocaleString()} />
      </div>
    </div>
  );
}

function EraStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-start">
      <div className="mono text-[9px] uppercase tracking-[0.2em] text-cream-300/55">
        {label}
      </div>
      <div
        className="display tabular text-xl leading-none"
        style={{
          color: accent
            ? "var(--color-orange-400)"
            : "var(--color-cream-100)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
