import type { ReactNode } from "react";
import type { Alliance, BracketRoundLabel, DivisionEvent, Slot, Team } from "@shared/types.ts";
import { buildGrandFinalSlot, isRoundDecided } from "../lib/bracket.ts";
import { Match } from "./Match.tsx";

interface Props {
  event: DivisionEvent;
  teams: Record<string, Team>;
  selectedTeams: ReadonlySet<string>;
  hideDecided: boolean;
  mirror?: boolean;
}

const ROUNDS: BracketRoundLabel[] = [
  "UB R1",
  "UB R2",
  "UB Final",
  "LB R1",
  "LB R2",
  "LB R3",
  "LB Final",
];

export function Bracket({ event, teams, selectedTeams, hideDecided, mirror = false }: Props): ReactNode {
  const winner = event.alliances.find((a) => a.status === "won") ?? null;
  const filterActive = selectedTeams.size > 0;

  const alliancesBySeed = new Map<number, Alliance>();
  for (const a of event.alliances) alliancesBySeed.set(a.seed, a);

  // Filter check uses the FULL alliance picks (4 teams), so a match a backup
  // team's alliance is in counts as in-filter even if the backup didn't play.
  const allianceTeamsFor = (slot: Slot, side: "red" | "blue"): string[] => {
    const seed = slot[side].seed;
    if (seed != null) {
      const alliance = alliancesBySeed.get(seed);
      if (alliance && alliance.picks.length > 0) return alliance.picks;
    }
    return slot[side].teams;
  };
  const isInFilter = (slot: Slot): boolean => {
    return [
      ...allianceTeamsFor(slot, "red"),
      ...allianceTeamsFor(slot, "blue"),
    ].some((t) => selectedTeams.has(t));
  };

  const gfSlot = buildGrandFinalSlot(event.grandFinal.games);

  const roundDecided: Record<BracketRoundLabel, boolean> = {
    "UB R1": false, "UB R2": false, "UB Final": false,
    "LB R1": false, "LB R2": false, "LB R3": false, "LB Final": false,
  };
  for (const r of ROUNDS) {
    const setsInRound = event.slots.filter((s) => s.round === r).map((s) => s.set);
    roundDecided[r] = isRoundDecided(event.slots, setsInRound);
  }

  return (
    <article className={`bracket${mirror ? " bracket-mirror" : ""}`}>
      <header className="bracket-header">
        <h3 className="bracket-name">{event.name}</h3>
        {winner ? <span className="bracket-winner-badge">A{winner.seed}</span> : null}
      </header>
      <div className="bracket-layout">
        {event.slots.map((slot) => {
          const hidden = hideDecided && roundDecided[slot.round];
          return (
            <div
              key={slot.set}
              className={`match-slot${hidden ? " match-slot-hidden" : ""}`}
              data-set={slot.set}
              aria-hidden={hidden ? "true" : undefined}
            >
              <div className="match-label">Match {slot.set}</div>
              <Match
                slot={slot}
                teams={teams}
                alliancesBySeed={alliancesBySeed}
                filterActive={filterActive}
                isInFilter={isInFilter}
              />
            </div>
          );
        })}
        {gfSlot ? (
          <div className="match-slot match-slot-gf" data-set="gf">
            <div className="match-label">Final</div>
            <Match
              slot={gfSlot}
              teams={teams}
              alliancesBySeed={alliancesBySeed}
              filterActive={filterActive}
              isInFilter={isInFilter}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
