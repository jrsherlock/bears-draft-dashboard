"use client";

import { motion, useInView, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useRef } from "react";
import type { DraftMeta, DraftPick } from "@/lib/types";

type Props = {
  meta: DraftMeta;
  picks: DraftPick[];
};

export function Hero({ meta, picks }: Props) {
  const onThisDay = useOnThisDay(picks);

  return (
    <section className="relative overflow-hidden border-b rule-line-strong">
      {/* Ambient orange flare */}
      <div className="pointer-events-none absolute -top-1/2 left-1/4 h-[120vh] w-[120vh] rounded-full bg-[radial-gradient(circle,rgba(200,56,3,0.18),transparent_60%)]" />
      {/* Top ticker */}
      <div className="border-b rule-line">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-2 mono text-[11px] uppercase tracking-[0.3em] text-cream-300/70">
          <span>Bears Draft Archive</span>
          <span className="hidden sm:inline">
            Updated {new Date(meta.generated_at).toLocaleDateString()}
          </span>
          <span>
            {meta.first_season}—{meta.last_season}
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-16 md:py-24 lg:grid-cols-12 lg:gap-12">
        {/* LEFT: huge headline */}
        <div className="lg:col-span-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mono mb-6 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-orange-400"
          >
            <span className="h-px w-8 bg-orange-500" />
            Chicago · The Monsters of the Midway
          </motion.div>

          <h1 className="display text-[clamp(3.6rem,11vw,11rem)] leading-[0.85]">
            <Word delay={0.05}>Every</Word>{" "}
            <Word delay={0.15} accent>
              Bear
            </Word>
            <br />
            <Word delay={0.25}>Ever</Word>{" "}
            <Word delay={0.35}>Drafted.</Word>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="editorial mt-8 max-w-xl text-lg leading-relaxed text-cream-200/80"
          >
            A complete archive of every Chicago Bears NFL Draft pick from
            <span className="text-orange-400"> 1980 </span> to the present.
            Filter the steals, expose the busts, and stack any two careers
            head-to-head. Powered by{" "}
            <a
              href="https://github.com/nflverse"
              target="_blank"
              className="underline decoration-orange-500/50 underline-offset-4 hover:text-orange-400"
            >
              nflverse
            </a>
            .
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <a
              href="#timeline"
              className="group inline-flex items-center gap-2 border border-orange-500 bg-orange-500/10 px-5 py-3 mono text-xs uppercase tracking-[0.25em] text-orange-300 transition hover:bg-orange-500 hover:text-cream-50"
            >
              Open the archive
              <span className="transition group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#compare"
              className="inline-flex items-center gap-2 border rule-line-strong px-5 py-3 mono text-xs uppercase tracking-[0.25em] text-cream-200 transition hover:border-cream-100 hover:text-cream-50"
            >
              Compare two picks
            </a>
            <a
              href="#dashboard"
              className="inline-flex items-center gap-2 border rule-line-strong px-5 py-3 mono text-xs uppercase tracking-[0.25em] text-cream-200 transition hover:border-cream-100 hover:text-cream-50"
            >
              Trends & dashboard
            </a>
          </motion.div>
        </div>

        {/* RIGHT: stat slab */}
        <div className="lg:col-span-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="relative border rule-line-strong bg-navy-800/40 p-1 backdrop-blur-sm"
          >
            <div className="border rule-line p-6">
              <div className="mono mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-cream-300/60">
                <span>The book</span>
                <span>vol. 01</span>
              </div>

              <Stat label="Total picks" value={meta.total_picks} />
              <Divider />
              <Stat label="Hall of Famers" value={meta.hof_count} accent />
              <Divider />
              <Stat label="Pro Bowls" value={meta.pro_bowls} />
              <Divider />
              <Stat label="All-Pro selections" value={meta.all_pros} />
              <Divider />
              <Stat
                label="Drafts spanned"
                value={meta.last_season - meta.first_season + 1}
                suffix=" yrs"
              />
            </div>

            {onThisDay && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="mt-3 border-l-2 border-orange-500 bg-orange-500/5 px-4 py-3"
              >
                <div className="mono text-[10px] uppercase tracking-[0.3em] text-orange-400">
                  On this day · {onThisDay.season}
                </div>
                <div className="editorial mt-1 text-cream-100">
                  Bears took{" "}
                  <span className="font-bold">{onThisDay.display_name}</span>{" "}
                  <span className="mono text-cream-300">
                    ({onThisDay.position}, R{onThisDay.round} · #{onThisDay.pick})
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Word({
  children,
  delay = 0,
  accent = false,
}: {
  children: React.ReactNode;
  delay?: number;
  accent?: boolean;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, y: "20%", filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-block ${accent ? "text-orange-500 italic" : ""}`}
      style={accent ? { fontFamily: "var(--font-fraunces)", fontWeight: 900 } : undefined}
    >
      {children}
    </motion.span>
  );
}

function Stat({
  label,
  value,
  accent = false,
  suffix = "",
}: {
  label: string;
  value: number;
  accent?: boolean;
  suffix?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-2">
      <span className="editorial text-sm text-cream-200/70">{label}</span>
      <span
        className={`display tabular text-3xl ${
          accent ? "text-orange-400" : "text-cream-50"
        }`}
      >
        <Counter to={value} />
        {suffix && <span className="mono ml-1 text-base text-cream-300/60">{suffix}</span>}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="ticker-divider h-px" />;
}

function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [inView, mv, to]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

function useOnThisDay(picks: DraftPick[]): DraftPick | null {
  // Roughly: surface a pick whose round number matches today's day-of-week %
  // round count, biased toward HOF/star picks. Pure delight, not real data.
  // We don't have a real draft-date column in nflreadpy.
  const today = new Date();
  const seed = today.getMonth() * 31 + today.getDate();
  const stars = picks.filter((p) => p.hof || (p.probowls ?? 0) >= 4);
  if (stars.length === 0) return picks[seed % picks.length] ?? null;
  return stars[seed % stars.length];
}
