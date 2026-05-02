import type { Slot, BracketRoundLabel } from "@shared/types.ts";

// Visual layout: 4 columns of pairs (UB on top, LB on bottom) plus a GF column.
//   col 1: UB R1 (sets 1-4)   /  LB R1 (sets 5-6)
//   col 2: UB R2 (sets 7-8)   /  LB R2 (sets 9-10)
//   col 3: UB Final (set 11)  /  LB R3 (set 12)
//   col 4: empty              /  LB Final (set 13)
//   col 5: GF                 /  empty
export interface ColumnDef {
  index: number;
  upper: { round: BracketRoundLabel | "GF"; sets: number[] } | null;
  lower: { round: BracketRoundLabel; sets: number[] } | null;
}

export const COLUMNS: ColumnDef[] = [
  { index: 0, upper: { round: "UB R1", sets: [1, 2, 3, 4] }, lower: { round: "LB R1", sets: [5, 6] } },
  { index: 1, upper: { round: "UB R2", sets: [7, 8] }, lower: { round: "LB R2", sets: [9, 10] } },
  { index: 2, upper: { round: "UB Final", sets: [11] }, lower: { round: "LB R3", sets: [12] } },
  { index: 3, upper: null, lower: { round: "LB Final", sets: [13] } },
  { index: 4, upper: { round: "GF", sets: [] }, lower: null },
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
