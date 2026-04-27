"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, RotateCcw, Sliders, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  HitScoreParams,
  breakdown,
  hitColor,
  hitLabel,
  useHitScore,
} from "@/lib/hit-score";
import type { DraftPick } from "@/lib/types";
import { PlayerAvatar } from "./PlayerAvatar";

type Props = {
  picks: DraftPick[];
};

const FORMULA_NOTE = `raw = (av·wAV + acc·wACC + gp·wGP) / Σweights · 100`;

export function HitScorePanel({ picks }: Props) {
  const { params, setParam, reset, isCustom, panelOpen, closePanel, score } =
    useHitScore();

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePanel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, closePanel]);

  // Pick three reference players: a known star, a solid mid, a bust.
  // We use the unfiltered picks list to keep the preview stable.
  const referencePicks = useMemo(() => {
    const sorted = [...picks].sort(
      (a, b) =>
        ((b.car_av ?? 0) + (b.probowls ?? 0) * 4 + (b.hof ? 30 : 0)) -
        ((a.car_av ?? 0) + (a.probowls ?? 0) * 4 + (a.hof ? 30 : 0))
    );
    const star = sorted.find((p) => p.hof) ?? sorted[0];
    const solid = sorted[Math.floor(sorted.length * 0.25)];
    const bust = sorted[Math.floor(sorted.length * 0.75)];
    return [star, solid, bust].filter(Boolean);
  }, [picks]);

  return (
    <AnimatePresence>
      {panelOpen && (
        <>
          {/* Scrim */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePanel}
            aria-label="Close hit-score panel"
            className="fixed inset-0 z-40 bg-navy-900/70 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            role="dialog"
            aria-label="Hit score methodology"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 z-50 flex h-full w-[min(560px,100vw)] flex-col border-l rule-line-strong bg-navy-900 shadow-[-30px_0_60px_-10px_rgba(0,0,0,0.6)]"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center gap-3 border-b rule-line px-6 py-4">
              <Sliders size={16} className="text-orange-400" />
              <div className="flex-1">
                <div className="mono text-[10px] uppercase tracking-[0.3em] text-orange-400">
                  Hit score methodology
                </div>
                <div className="display text-2xl text-cream-50">
                  {isCustom ? "Custom calibration" : "Default calibration"}
                </div>
              </div>
              <button
                onClick={closePanel}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center border rule-line-strong text-cream-200 transition hover:border-orange-500 hover:text-orange-400"
              >
                <X size={16} />
              </button>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {/* Explainer */}
              <section className="border-b rule-line p-6">
                <h3 className="display mb-3 text-base uppercase tracking-wide text-cream-50">
                  What it means
                </h3>
                <p className="editorial text-cream-200/80 leading-relaxed">
                  Hit Score is a single number from{" "}
                  <span className="mono text-orange-400">0</span> to{" "}
                  <span className="mono text-orange-400">100</span> that lets
                  you scan an entire era of draft picks at a glance. It
                  combines{" "}
                  <span className="text-orange-300">career production</span>,{" "}
                  <span className="text-orange-300">accolades</span>, and{" "}
                  <span className="text-orange-300">longevity</span> so a Hall
                  of Famer always reads hot, a multi-Pro-Bowler reads warm, and
                  a never-played bust reads cold — regardless of round or
                  era.
                </p>
                <pre className="mono mt-4 overflow-x-auto whitespace-pre-wrap border-l-2 border-orange-500/40 bg-navy-800/40 p-3 text-[11px] text-cream-200">
                  {FORMULA_NOTE}
                </pre>
              </section>

              {/* Component weights */}
              <section className="border-b rule-line p-6">
                <SectionTitle
                  number="01"
                  title="Component weights"
                  hint="How much each bucket contributes (auto-normalized)"
                />
                <div className="mt-4 space-y-3">
                  <Slider
                    label="Career AV"
                    value={params.avWeight}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => setParam("avWeight", v)}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                  <Slider
                    label="Accolades"
                    value={params.accWeight}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => setParam("accWeight", v)}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                  <Slider
                    label="Longevity"
                    value={params.gpWeight}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => setParam("gpWeight", v)}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                </div>
                <WeightBar
                  av={params.avWeight}
                  acc={params.accWeight}
                  gp={params.gpWeight}
                />
              </section>

              {/* AV calibration */}
              <section className="border-b rule-line p-6">
                <SectionTitle
                  number="02"
                  title="Career AV scaling"
                  hint="Tune what 'great career' means"
                />
                <div className="mt-4 space-y-3">
                  <Slider
                    label="AV ceiling (saturates at)"
                    value={params.avCeiling}
                    min={20}
                    max={120}
                    step={1}
                    onChange={(v) => setParam("avCeiling", v)}
                    format={(v) => `AV ${Math.round(v)}`}
                  />
                  <Slider
                    label="Curve exponent"
                    value={params.avCurve}
                    min={0.3}
                    max={1.5}
                    step={0.05}
                    onChange={(v) => setParam("avCurve", v)}
                    format={(v) => v.toFixed(2)}
                    note={
                      params.avCurve < 0.7
                        ? "Concave — rewards mid-tier production heavily"
                        : params.avCurve > 1
                        ? "Convex — only elite AV scores hot"
                        : "Balanced"
                    }
                  />
                </div>
              </section>

              {/* Accolades */}
              <section className="border-b rule-line p-6">
                <SectionTitle
                  number="03"
                  title="Accolade values"
                  hint="What each award is worth toward the cap"
                />
                <div className="mt-4 space-y-3">
                  <Slider
                    label="Per Pro Bowl"
                    value={params.pbWeight}
                    min={0}
                    max={0.25}
                    step={0.01}
                    onChange={(v) => setParam("pbWeight", v)}
                    format={(v) => v.toFixed(2)}
                  />
                  <Slider
                    label="Per All-Pro"
                    value={params.apWeight}
                    min={0}
                    max={0.5}
                    step={0.01}
                    onChange={(v) => setParam("apWeight", v)}
                    format={(v) => v.toFixed(2)}
                  />
                  <Slider
                    label="Hall of Fame bonus"
                    value={params.hofBonus}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => setParam("hofBonus", v)}
                    format={(v) => v.toFixed(2)}
                  />
                </div>
              </section>

              {/* Longevity */}
              <section className="border-b rule-line p-6">
                <SectionTitle
                  number="04"
                  title="Longevity"
                  hint="Games played for full credit"
                />
                <div className="mt-4">
                  <Slider
                    label="Games ceiling"
                    value={params.gpCeiling}
                    min={16}
                    max={250}
                    step={1}
                    onChange={(v) => setParam("gpCeiling", v)}
                    format={(v) => `${Math.round(v)} GP`}
                  />
                </div>
              </section>

              {/* Live preview */}
              <section className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-orange-400" />
                  <h3 className="display text-base uppercase tracking-wide text-cream-50">
                    Live preview
                  </h3>
                </div>
                <p className="editorial mb-4 text-sm text-cream-300/70">
                  Watch these representative careers shift as you tune.
                </p>
                <div className="space-y-3">
                  {referencePicks.map((p) => (
                    <PreviewCard key={`${p.season}-${p.pick}`} pick={p} score={score(p)} params={params} />
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <footer className="flex shrink-0 items-center gap-3 border-t rule-line bg-navy-800/60 px-6 py-4">
              <button
                onClick={reset}
                disabled={!isCustom}
                className="mono inline-flex items-center gap-2 border rule-line-strong px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-cream-200 transition hover:border-orange-500 hover:text-orange-400 disabled:opacity-30 disabled:hover:border-rule-strong disabled:hover:text-cream-200"
              >
                <RotateCcw size={12} /> Reset to defaults
              </button>
              <div className="ml-auto mono text-[10px] uppercase tracking-[0.25em] text-cream-300/60">
                {isCustom ? "Saved locally" : "Using defaults"}
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionTitle({
  number,
  title,
  hint,
}: {
  number: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="display tabular text-orange-400">{number}</span>
      <div>
        <div className="display text-base uppercase tracking-wide text-cream-50">
          {title}
        </div>
        <div className="mono text-[10px] uppercase tracking-[0.25em] text-cream-300/55">
          {hint}
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  note,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  note?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="editorial text-sm text-cream-100">{label}</span>
        <span className="mono text-xs tabular text-orange-300">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="hit-range w-full"
      />
      {note && (
        <div className="mono mt-1 text-[10px] uppercase tracking-[0.2em] text-cream-300/60">
          {note}
        </div>
      )}
      <style jsx>{`
        .hit-range {
          appearance: none;
          height: 4px;
          background: var(--color-navy-600);
          border-radius: 2px;
          outline: none;
        }
        .hit-range::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: var(--color-orange-500);
          border: 2px solid var(--color-cream-50);
          border-radius: 50%;
          cursor: pointer;
          transition: transform 120ms ease;
        }
        .hit-range::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .hit-range::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--color-orange-500);
          border: 2px solid var(--color-cream-50);
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

function WeightBar({ av, acc, gp }: { av: number; acc: number; gp: number }) {
  const total = av + acc + gp || 1;
  return (
    <div className="mt-4">
      <div className="mono mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-cream-300/60">
        <span>Mix</span>
        <span>{Math.round(total * 100)}% raw</span>
      </div>
      <div className="flex h-3 overflow-hidden border rule-line">
        <div
          style={{
            width: `${(av / total) * 100}%`,
            background: "var(--color-orange-500)",
          }}
          title={`AV ${Math.round((av / total) * 100)}%`}
        />
        <div
          style={{
            width: `${(acc / total) * 100}%`,
            background: "var(--color-cream-200)",
          }}
          title={`Acc ${Math.round((acc / total) * 100)}%`}
        />
        <div
          style={{
            width: `${(gp / total) * 100}%`,
            background: "var(--color-navy-400)",
          }}
          title={`GP ${Math.round((gp / total) * 100)}%`}
        />
      </div>
      <div className="mono mt-1 flex justify-between text-[10px] uppercase tracking-[0.2em] text-cream-300/60">
        <Legend color="var(--color-orange-500)">AV</Legend>
        <Legend color="var(--color-cream-200)">Acc</Legend>
        <Legend color="var(--color-navy-400)">GP</Legend>
      </div>
    </div>
  );
}

function Legend({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2" style={{ background: color }} />
      {children}
    </span>
  );
}

function PreviewCard({
  pick,
  score,
  params,
}: {
  pick: DraftPick;
  score: number;
  params: HitScoreParams;
}) {
  const b = breakdown(pick, params);
  const color = hitColor(score);
  return (
    <div className="border rule-line-strong bg-navy-800/40 p-3">
      <div className="flex items-center gap-3">
        <PlayerAvatar pick={pick} size={42} />
        <div className="min-w-0 flex-1">
          <div className="editorial truncate text-cream-50">
            {pick.display_name}
          </div>
          <div className="mono text-[10px] uppercase tracking-[0.2em] text-cream-300/60">
            {pick.season} · R{pick.round} · {pick.position} · AV{" "}
            {pick.car_av ?? pick.w_av ?? "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="mono text-[9px] uppercase tracking-[0.2em]" style={{ color }}>
            {hitLabel(score)}
          </div>
          <div className="display tabular text-2xl" style={{ color }}>
            {score}
          </div>
        </div>
      </div>
      {/* Stacked contribution bar */}
      <div className="mt-2 flex h-1.5 overflow-hidden bg-navy-900">
        <motion.div
          animate={{ width: `${b.avContribution}%` }}
          transition={{ duration: 0.3 }}
          style={{ background: "var(--color-orange-500)" }}
        />
        <motion.div
          animate={{ width: `${b.accContribution}%` }}
          transition={{ duration: 0.3 }}
          style={{ background: "var(--color-cream-200)" }}
        />
        <motion.div
          animate={{ width: `${b.gpContribution}%` }}
          transition={{ duration: 0.3 }}
          style={{ background: "var(--color-navy-400)" }}
        />
      </div>
    </div>
  );
}
