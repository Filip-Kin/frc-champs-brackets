import type { Alliance, DivisionEvent, Slot, Snapshot } from "@shared/types.ts";

// Standard Einstein seeding: division winners get seeds 1..8 in this order.
// Pairings for sf 1..4 are adjacent (1v2, 3v4, 5v6, 7v8) per FIRST's
// Einstein bracket format, not the seed-based 1v8/4v5/2v7/3v6 used inside
// each division.
const SEED_ORDER: readonly string[] = ["arc", "new", "gal", "hop", "cur", "mil", "dal", "joh"];

const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 2], // sf-1: Arch vs Newton
  [3, 4], // sf-2: Galileo vs Hopper
  [5, 6], // sf-3: Curie vs Milstein
  [7, 8], // sf-4: Daly vs Johnson
];

function divisionSuffix(eventKey: string): string {
  return eventKey.replace(/^\d{4}/, "");
}

interface PreviewResult {
  einstein: DivisionEvent;
  isPreview: boolean;
}

// If Einstein has no published match data, synthesize a preview of the
// first round (sf 1..4) using each division's winning alliance. Returns
// the original DivisionEvent unchanged when TBA already has the data.
export function applyEinsteinPreview(snapshot: Snapshot): PreviewResult | null {
  const ein = snapshot.einstein;
  if (!ein) return null;

  const hasMatchData = ein.slots.some((s) => s.red.teams.length > 0 || s.blue.teams.length > 0);
  if (hasMatchData) return { einstein: ein, isPreview: false };

  const winners = new Map<string, Alliance>();
  for (const div of snapshot.divisions) {
    if (!div) continue;
    const w = div.alliances.find((a) => a.status === "won");
    if (!w) continue;
    winners.set(divisionSuffix(div.key), w);
  }

  // Need at least one division winner to do anything useful
  if (winners.size === 0) return { einstein: ein, isPreview: false };

  const syntheticAlliances: Alliance[] = [];
  for (let i = 0; i < SEED_ORDER.length; i++) {
    const sfx = SEED_ORDER[i];
    if (sfx == null) continue;
    const w = winners.get(sfx);
    if (!w) continue;
    syntheticAlliances.push({
      seed: i + 1,
      name: `Alliance ${i + 1}`,
      picks: w.picks,
      status: "playing",
      record: null,
      double_elim_round: "Round 1",
    });
  }

  const allianceBySeed = new Map<number, Alliance>(syntheticAlliances.map((a) => [a.seed, a]));

  const previewSlots: Slot[] = ein.slots.map((slot) => {
    if (slot.set < 1 || slot.set > 4) return slot;
    const pair = PAIRS[slot.set - 1];
    if (!pair) return slot;
    const [redSeed, blueSeed] = pair;
    const red = allianceBySeed.get(redSeed);
    const blue = allianceBySeed.get(blueSeed);
    if (!red || !blue) return slot;
    return {
      ...slot,
      played: false,
      red: { seed: redSeed, teams: red.picks.slice(0, 3), score: null },
      blue: { seed: blueSeed, teams: blue.picks.slice(0, 3), score: null },
      winner: null,
      time: null,
    };
  });

  return {
    einstein: {
      ...ein,
      alliances: syntheticAlliances,
      slots: previewSlots,
    },
    isPreview: true,
  };
}
