import type { Slot, BracketRoundLabel, GrandFinalGame } from "@shared/types.ts";

// Visual layout: 4 columns. Lower bracket sits below upper. GF spans both rows.
//   col 1: UB R1 (sets 1-4)         /  LB R1 (sets 5-6)
//   col 2: UB R2 (sets 7-8)         /  LB R2 (sets 9-10)
//   col 3: UB Final (set 11)        /  LB R3 (set 12) + LB Final (set 13)
//   col 4: GF (spans full height)
export interface ColumnDef {
  index: number;
  upper: { round: BracketRoundLabel | "GF"; sets: number[] } | null;
  lower: { round: string; sets: number[] } | null;
  /** When true, GF spans both upper and lower rows in this column. */
  gfSpan?: boolean;
}

export const COLUMNS: ColumnDef[] = [
  { index: 0, upper: { round: "UB R1", sets: [1, 2, 3, 4] }, lower: { round: "LB R1", sets: [5, 6] } },
  { index: 1, upper: { round: "UB R2", sets: [7, 8] }, lower: { round: "LB R2", sets: [9, 10] } },
  { index: 2, upper: { round: "UB Final", sets: [11] }, lower: { round: "LB R3 / Final", sets: [12, 13] } },
  { index: 3, upper: { round: "GF", sets: [] }, lower: null, gfSpan: true },
];

export function isRoundDecided(slots: Slot[], sets: number[]): boolean {
  if (!sets.length) return false;
  return sets.every((s) => slots.find((slot) => slot.set === s)?.winner != null);
}

export function advancingSeeds(slots: Slot[], sets: number[]): number[] {
  const out: number[] = [];
  for (const s of sets) {
    const slot = slots.find((sl) => sl.set === s);
    if (!slot || !slot.winner) continue;
    const seed = slot[slot.winner].seed;
    if (seed != null) out.push(seed);
  }
  return out;
}

// Synthesize a Slot from BO3 grand-final games so the GF can render with
// the same Match component as the rest of the bracket. Score is series wins.
export function buildGrandFinalSlot(games: GrandFinalGame[]): Slot | undefined {
  if (!games.length) return undefined;
  const first = games[0];
  if (!first) return undefined;

  const redWins = games.filter((g) => g.winner === "red").length;
  const blueWins = games.filter((g) => g.winner === "blue").length;
  const decided = redWins >= 2 || blueWins >= 2;
  const winner = redWins >= 2 ? "red" : blueWins >= 2 ? "blue" : null;

  return {
    id: "gf",
    level: "sf",
    set: 0,
    round: "UB Final",
    played: decided,
    red: { seed: first.red.seed, teams: first.red.teams, score: redWins },
    blue: { seed: first.blue.seed, teams: first.blue.teams, score: blueWins },
    winner,
    time: null,
  };
}
