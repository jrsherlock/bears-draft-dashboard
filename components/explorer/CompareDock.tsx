"use client";

import { motion, AnimatePresence } from "motion/react";
import { Swords, X } from "lucide-react";
import { useExplorer } from "./ExplorerContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";

/**
 * Bottom-center floating dock that appears the moment the user adds someone
 * to compare. One click to expand into the full head-to-head modal.
 */
export function CompareDock() {
  const { compareSlots, openCompare, toggleCompare, clearCompare } = useExplorer();
  const [a, b] = compareSlots;
  const has = Boolean(a || b);

  return (
    <AnimatePresence>
      {has && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2"
        >
          <div className="flex items-stretch gap-2 border rule-line-strong bg-navy-900/95 p-2 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            <Slot pick={a} onClear={() => a && toggleCompare(a)} />
            <div className="flex flex-col items-center justify-center px-2 mono text-[10px] uppercase tracking-[0.2em] text-orange-400">
              <span>vs</span>
            </div>
            <Slot pick={b} onClear={() => b && toggleCompare(b)} />

            <button
              onClick={openCompare}
              disabled={!a || !b}
              className="ml-1 inline-flex items-center gap-2 border border-orange-500 bg-orange-500 px-4 py-2 mono text-[11px] uppercase tracking-[0.25em] text-cream-50 transition disabled:opacity-30 hover:bg-orange-400"
            >
              <Swords size={13} /> Duel
            </button>
            <button
              onClick={clearCompare}
              aria-label="Clear compare"
              className="flex items-center justify-center border rule-line-strong px-2 text-cream-200 transition hover:border-orange-500 hover:text-orange-400"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Slot({
  pick,
  onClear,
}: {
  pick: import("@/lib/types").DraftPick | null;
  onClear: () => void;
}) {
  if (!pick) {
    return (
      <div className="flex h-12 w-44 items-center justify-center border border-dashed rule-line-strong mono text-[10px] uppercase tracking-[0.25em] text-cream-300/50">
        Pick a player
      </div>
    );
  }
  return (
    <div className="group relative flex h-12 w-44 items-center gap-2 border rule-line-strong bg-navy-800/60 px-2">
      <PlayerAvatar pick={pick} size={32} />
      <div className="min-w-0 flex-1">
        <div className="editorial truncate text-sm text-cream-50">
          {pick.display_name}
        </div>
        <div className="mono text-[9px] uppercase tracking-[0.2em] text-cream-300/60">
          {pick.season} · R{pick.round} · {pick.position}
        </div>
      </div>
      <button
        onClick={onClear}
        aria-label="Remove"
        className="opacity-0 transition group-hover:opacity-100"
      >
        <X size={12} className="text-cream-300/70 hover:text-orange-400" />
      </button>
    </div>
  );
}
