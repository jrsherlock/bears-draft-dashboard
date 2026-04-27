"use client";

import { motion, AnimatePresence } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useHitScore } from "@/lib/hit-score";

/**
 * First-visit coachmark for the Hit Score button. Floats below the trigger
 * with a small connector line, pointing the user at the most missable but
 * most-engaging feature on the page. Auto-dismisses on:
 *   1. The user clicks the trigger button (handled by openPanel inside the
 *      provider — that flips hintSeen).
 *   2. The user clicks "Got it" inside the hint.
 *   3. 14 seconds elapse without interaction.
 *
 * Persisted to localStorage so it never shows again after the first visit.
 */
export function HitScoreHint() {
  const { hintSeen, markHintSeen, openPanel } = useHitScore();
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  // Show after a short delay so it doesn't interrupt the hero animation.
  useEffect(() => {
    if (hintSeen) return;
    const t = setTimeout(() => setVisible(true), 1400);
    const dismiss = setTimeout(() => {
      setVisible(false);
      markHintSeen();
    }, 14_000);
    return () => {
      clearTimeout(t);
      clearTimeout(dismiss);
    };
  }, [hintSeen, markHintSeen]);

  // Anchor to the actual button position so the connector lines up.
  useEffect(() => {
    if (!visible) return;
    function place() {
      const btn = document.querySelector(
        '[aria-label="Open hit-score methodology panel"]'
      ) as HTMLElement | null;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setAnchor({
        x: rect.left + rect.width / 2,
        y: rect.bottom + window.scrollY,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [visible]);

  if (hintSeen) return null;

  return (
    <AnimatePresence>
      {visible && anchor && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute z-40"
          style={{
            top: anchor.y + 14,
            left: Math.max(16, anchor.x - 160),
          }}
        >
          {/* Connector */}
          <div
            className="absolute -top-3 h-3 w-px bg-orange-500/70"
            style={{ left: Math.min(304, anchor.x - Math.max(16, anchor.x - 160)) }}
          />
          <div
            className="pointer-events-auto w-[320px] border border-orange-500/60 bg-navy-900 p-4 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.65)]"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(200,56,3,0.10) 0%, transparent 60%)",
            }}
          >
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-orange-400" />
              <div className="flex-1">
                <div className="mono mb-1 text-[10px] uppercase tracking-[0.3em] text-orange-400">
                  Configurable
                </div>
                <div className="display text-base leading-tight text-cream-50">
                  Tune the Hit Score formula yourself.
                </div>
                <p className="editorial mt-1.5 text-xs leading-snug text-cream-200/80">
                  AV vs. accolades vs. longevity, weighted to your taste.
                  Watch every score on the page update live.
                </p>
              </div>
              <button
                onClick={() => {
                  markHintSeen();
                  setVisible(false);
                }}
                aria-label="Dismiss"
                className="-mr-1 -mt-1 text-cream-300/70 transition hover:text-cream-100"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => {
                  openPanel();
                  setVisible(false);
                }}
                className="mono inline-flex items-center gap-1 border border-orange-500 bg-orange-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-orange-300 transition hover:bg-orange-500 hover:text-cream-50"
              >
                Show me <span>→</span>
              </button>
              <button
                onClick={() => {
                  markHintSeen();
                  setVisible(false);
                }}
                className="mono text-[10px] uppercase tracking-[0.25em] text-cream-300/70 transition hover:text-cream-100"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
