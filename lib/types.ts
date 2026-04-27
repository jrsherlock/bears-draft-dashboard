export type Photos = {
  espn?: string;
  sleeper?: string;
} | null;

export type DraftPick = {
  season: number;
  round: number;
  pick: number;
  pick_overall: number;
  team: string;
  position: string | null;
  side: string | null;
  category: string | null;

  pfr_player_id: string | null;
  pfr_player_name: string | null;
  cfb_player_id: string | null;
  gsis_id: string | null;

  display_name: string;
  college: string | null;
  age: number | null;
  to: number | null; // final season

  // Career production
  career_av: number | null;
  car_av: number | null;
  w_av: number | null;
  dr_av: number | null;
  games: number | null;
  seasons_started: number | null;

  // Accolades
  probowls: number | null;
  allpro: number | null;
  hof: boolean | null;

  // Position-specific
  pass_attempts: number | null;
  pass_completions: number | null;
  pass_yards: number | null;
  pass_tds: number | null;
  pass_ints: number | null;
  rush_atts: number | null;
  rush_yards: number | null;
  rush_tds: number | null;
  receptions: number | null;
  rec_yards: number | null;
  rec_tds: number | null;
  def_solo_tackles: number | null;
  def_ints: number | null;
  def_sacks: number | null;

  // Derived
  decade: string;
  era: string;

  // Enrichment
  photos: Photos;
  sleeper_id?: string;
  espn_id?: string;
  /** Path to a self-hosted headshot under /public, e.g. "/players/AbcdEfGh01.png". */
  local_photo?: string;
  combine: CombineRecord | null;

  /** NFL team abbr if currently rostered (per Sleeper), else null. */
  current_team?: string | null;
  /** Sleeper status: Active / Practice Squad / Injured Reserve / Suspended / etc. */
  current_status?: string | null;
  /**
   * Empirical roster classification merged from Sleeper + nflverse rosters.
   * Filled by data-pipeline/enrich_active_status.py.
   */
  roster_status?: RosterStatus;
  /** Which signal produced roster_status (audit trail for UI tooltips). */
  roster_evidence?: string;
};

export type RosterStatus =
  | "active"
  | "practice_squad"
  | "ir_or_pup"
  | "rostered_2025"
  | "rookie"
  | "retired"
  | "unknown";

export type CombineMetric = {
  value: number;
  /** 0..1 — share of position group beaten on this metric (1.0 = best in group). */
  percentile: number;
  label: string;
  lower_better: boolean;
};

export type CombineRecord = {
  position_group: string;
  height: number | null;
  weight: number | null;
  metrics: Partial<Record<
    "forty" | "vertical" | "broad_jump" | "bench" | "cone" | "shuttle",
    CombineMetric
  >>;
};

export type DraftMeta = {
  total_picks: number;
  first_season: number;
  last_season: number;
  hof_count: number;
  pro_bowls: number;
  all_pros: number;
  by_position: Record<string, number>;
  by_round: Record<string, number>;
  by_decade: Record<string, number>;
  top_colleges: { college: string; count: number }[];
  generated_at: string;
};

export type FilterState = {
  search: string;
  decades: Set<string>;
  rounds: Set<number>;
  positions: Set<string>;
  colleges: Set<string>;
  eras: Set<string>;
};
