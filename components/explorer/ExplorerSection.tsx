"use client";

import { useEffect, useRef } from "react";
import { useExplorer } from "./ExplorerContext";
import { Filters } from "./Filters";
import { Timeline } from "./Timeline";
import type { DraftPick } from "@/lib/types";

type Props = {
  picks: DraftPick[];
};

export function ExplorerSection({ picks }: Props) {
  const { filters, filtered } = useExplorer();
  const sectionRef = useRef<HTMLElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  // When filters change, snap the user to the top of the results so the
  // first row of the new filtered list is visible — no more "scrolled below
  // a now-shorter page" confusion.
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const el = filtersRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Only intervene if the filters bar is out of view (above the viewport)
    // OR the page got shorter than the current scroll position.
    const tooLow =
      window.scrollY + window.innerHeight > document.documentElement.scrollHeight;
    if (rect.bottom < 0 || tooLow) {
      const top = window.scrollY + rect.top - 16;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, [filters, filtered.length]);

  return (
    <>
      <section
        ref={sectionRef}
        className="mx-auto max-w-[1400px] px-4 sm:px-6 py-12"
        id="archive"
      >
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <div className="mono mb-3 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-orange-400">
              <span className="h-px w-8 bg-orange-500" /> The archive
            </div>
            <h2 id="compare" className="display text-[clamp(2rem,5vw,3.75rem)] leading-[0.9] text-cream-50">
              Every pick. Every round.
              <br />
              <span className="text-orange-500 italic" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 900 }}>
                Every era.
              </span>
            </h2>
          </div>
        </div>

        <div ref={filtersRef} className="mb-6">
          <Filters picks={picks} />
        </div>

        <Timeline />
      </section>
    </>
  );
}
