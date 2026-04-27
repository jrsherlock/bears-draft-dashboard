"use client";

import { motion, AnimatePresence } from "motion/react";
import { Sliders } from "lucide-react";
import { useEffect, useState } from "react";
import { useHitScore } from "@/lib/hit-score";

const SECTIONS = [
  { id: "archive", label: "Archive" },
  { id: "constellation", label: "Still Playing" },
  { id: "dashboard", label: "Dashboard" },
] as const;

/**
 * Slim sticky navigation that fades in once the user scrolls past the hero.
 * Smooth-scrolls to in-page sections; uses IntersectionObserver to mark the
 * section currently in view as active. Pairs with the global
 * scroll-padding-top declaration in globals.css so anchor jumps don't get
 * clipped behind the bar.
 */
export function StickyNav() {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<string>("archive");
  const { openPanel: openHitScorePanel, isCustom } = useHitScore();

  // Reveal the bar after the user has scrolled past the hero, and track which
  // section the user is currently viewing. Position-based scroll-spy: pick the
  // section whose top is closest above the viewport's "activation line" (just
  // below the nav). Simple and reliable across all section heights.
  useEffect(() => {
    const update = () => {
      setVisible(window.scrollY > 420);
      // Activation line is 96px below the viewport top — pick the latest
      // section whose top has crossed it.
      let current: string = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= 96) current = s.id;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const jumpTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    // Anchor change for shareable URLs, but avoid the default jump first.
    history.replaceState(null, "", `#${id}`);
    const top = el.getBoundingClientRect().top + window.scrollY - 56;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const jumpToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    history.replaceState(null, "", " ");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-0 right-0 top-0 z-30 border-b rule-line-strong bg-navy-900/85 backdrop-blur-md"
          aria-label="Section navigation"
        >
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
            {/* Brand */}
            <a
              href="#top"
              onClick={jumpToTop}
              className="group flex shrink-0 items-baseline gap-2 transition hover:opacity-90"
            >
              <span className="display text-lg uppercase tracking-wide text-cream-50">
                Bears
              </span>
              <span className="hidden mono text-[10px] uppercase tracking-[0.35em] text-orange-400 sm:inline">
                Draft Archive
              </span>
              <span className="mono text-[10px] uppercase tracking-[0.35em] text-orange-400 sm:hidden">
                ·
              </span>
            </a>

            {/* Section links */}
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {SECTIONS.map((s) => {
                const isActive = active === s.id;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={jumpTo(s.id)}
                    className={`mono relative inline-flex items-center px-2 py-1.5 text-[10px] uppercase tracking-[0.18em] transition sm:text-[11px] sm:tracking-[0.22em] ${
                      isActive
                        ? "text-orange-400"
                        : "text-cream-200/85 hover:text-cream-50"
                    }`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    {s.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute -bottom-[10px] left-2 right-2 h-[2px] bg-orange-500"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                  </a>
                );
              })}
            </div>

            {/* Hit-score quick action */}
            <button
              onClick={openHitScorePanel}
              className={`mono inline-flex shrink-0 items-center gap-1.5 border px-2 py-1.5 text-[10px] uppercase tracking-[0.18em] transition sm:text-[11px] sm:tracking-[0.2em] ${
                isCustom
                  ? "border-orange-500 bg-orange-500/15 text-orange-300"
                  : "rule-line-strong text-cream-200 hover:border-cream-100 hover:text-cream-50"
              }`}
              aria-label="Open hit-score methodology panel"
            >
              <Sliders size={11} />
              <span className="hidden sm:inline">
                Hit Score · {isCustom ? "Custom" : "Default"}
              </span>
              <span className="sm:hidden">Hit</span>
              {isCustom && (
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
              )}
            </button>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
