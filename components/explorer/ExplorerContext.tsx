"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { DraftPick, FilterState } from "@/lib/types";

type ExplorerCtx = {
  filters: FilterState;
  setSearch: (v: string) => void;
  toggle: (key: keyof Omit<FilterState, "search">, value: string | number) => void;
  clearAll: () => void;
  filtered: DraftPick[];
  selectedKey: string | null;
  selected: DraftPick | null;
  openPick: (p: DraftPick) => void;
  closePick: () => void;
  compareSlots: [DraftPick | null, DraftPick | null];
  toggleCompare: (p: DraftPick) => void;
  clearCompare: () => void;
  showCompare: boolean;
  openCompare: () => void;
  closeCompare: () => void;
};

const Ctx = createContext<ExplorerCtx | null>(null);

const emptyFilters: FilterState = {
  search: "",
  decades: new Set(),
  rounds: new Set(),
  positions: new Set(),
  colleges: new Set(),
  eras: new Set(),
};

function pickKey(p: DraftPick) {
  return `${p.season}-${p.pick}-${p.pfr_player_id ?? p.display_name}`;
}

export function ExplorerProvider({
  picks,
  children,
}: {
  picks: DraftPick[];
  children: React.ReactNode;
}) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [compareKeys, setCompareKeys] = useState<[string | null, string | null]>([
    null,
    null,
  ]);
  const [showCompare, setShowCompare] = useState(false);

  const setSearch = useCallback(
    (v: string) => setFilters((f) => ({ ...f, search: v })),
    []
  );

  const toggle = useCallback(
    (key: keyof Omit<FilterState, "search">, value: string | number) => {
      setFilters((f) => {
        const next = new Set(f[key] as Set<string | number>);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return { ...f, [key]: next };
      });
    },
    []
  );

  const clearAll = useCallback(() => setFilters(emptyFilters), []);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return picks.filter((p) => {
      if (q) {
        const hay = `${p.display_name} ${p.college ?? ""} ${p.position ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.decades.size && !filters.decades.has(p.decade)) return false;
      if (filters.rounds.size && !filters.rounds.has(p.round)) return false;
      if (filters.positions.size && !filters.positions.has(p.position ?? "?"))
        return false;
      if (filters.colleges.size && !filters.colleges.has(p.college ?? "")) return false;
      if (filters.eras.size && !filters.eras.has(p.era)) return false;
      return true;
    });
  }, [picks, filters]);

  const selected = useMemo(
    () => picks.find((p) => pickKey(p) === selectedKey) ?? null,
    [picks, selectedKey]
  );

  const compareSlots = useMemo<[DraftPick | null, DraftPick | null]>(() => {
    return [
      compareKeys[0] ? picks.find((p) => pickKey(p) === compareKeys[0]) ?? null : null,
      compareKeys[1] ? picks.find((p) => pickKey(p) === compareKeys[1]) ?? null : null,
    ];
  }, [picks, compareKeys]);

  const toggleCompare = useCallback((p: DraftPick) => {
    const key = pickKey(p);
    setCompareKeys(([a, b]) => {
      if (a === key) return [null, b];
      if (b === key) return [a, null];
      if (!a) return [key, b];
      if (!b) return [a, key];
      return [b, key]; // shift older one out
    });
  }, []);

  const clearCompare = useCallback(() => setCompareKeys([null, null]), []);

  const value = useMemo<ExplorerCtx>(
    () => ({
      filters,
      setSearch,
      toggle,
      clearAll,
      filtered,
      selectedKey,
      selected,
      openPick: (p) => setSelectedKey(pickKey(p)),
      closePick: () => setSelectedKey(null),
      compareSlots,
      toggleCompare,
      clearCompare,
      showCompare,
      openCompare: () => setShowCompare(true),
      closeCompare: () => setShowCompare(false),
    }),
    [
      filters,
      setSearch,
      toggle,
      clearAll,
      filtered,
      selectedKey,
      selected,
      compareSlots,
      toggleCompare,
      clearCompare,
      showCompare,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExplorer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useExplorer must be used inside ExplorerProvider");
  return v;
}

export { pickKey };
