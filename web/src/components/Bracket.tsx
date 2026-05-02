import type { ReactNode } from "react";
import type { Alliance, DivisionEvent, Slot, Team } from "@shared/types.ts";
import { COLUMNS, buildGrandFinalSlot, isRoundDecided } from "../lib/bracket.ts";
import { Match } from "./Match.tsx";

interface Props {
  event: DivisionEvent;
  teams: Record<string, Team>;
  selectedTeams: ReadonlySet<string>;
  hideDecided: boolean;
  mirror?: boolean;
}

export function Bracket({ event, teams, selectedTeams, hideDecided, mirror = false }: Props): ReactNode {
  const winner = event.alliances.find((a) => a.status === "won") ?? null;
  const filterActive = selectedTeams.size > 0;

  const alliancesBySeed = new Map<number, Alliance>();
  for (const a of event.alliances) alliancesBySeed.set(a.seed, a);

  const isInFilter = (slot: Slot): boolean =>
    [...slot.red.teams, ...slot.blue.teams].some((t) => selectedTeams.has(t));

  const cols = mirror ? [...COLUMNS].reverse() : COLUMNS;
  const gfSlot = buildGrandFinalSlot(event.grandFinal.games);

  return (
    <article className={`bracket${mirror ? " bracket-mirror" : ""}`}>
      <header className="bracket-header">
        <h3 className="bracket-name">{event.name}</h3>
        {winner ? <span className="bracket-winner-badge">A{winner.seed}</span> : null}
      </header>
      <div className="bracket-layout">
        {cols.map((col) => {
          if (col.gfSpan) {
            return (
              <div key={col.index} className="bracket-col bracket-col-gf">
                <div className="bracket-cell">
                  <div className="bracket-cell-label">Final</div>
                  <Match
                    slot={gfSlot}
                    teams={teams}
                    alliancesBySeed={alliancesBySeed}
                    filterActive={filterActive}
                    isInFilter={isInFilter}
                  />
                </div>
              </div>
            );
          }

          const upperDecided = col.upper && col.upper.round !== "GF" && isRoundDecided(event.slots, col.upper.sets);
          const lowerDecided = col.lower && isRoundDecided(event.slots, col.lower.sets);
          const hideUpper = hideDecided && upperDecided;
          const hideLower = hideDecided && lowerDecided;

          return (
            <div key={col.index} className="bracket-col">
              <div className="bracket-cell">
                {!col.upper || hideUpper ? (
                  <div className="bracket-cell-empty" aria-hidden="true" />
                ) : (
                  <>
                    <div className="bracket-cell-label">{col.upper.round}</div>
                    {col.upper.sets.map((s) => (
                      <Match
                        key={s}
                        slot={event.slots.find((slot) => slot.set === s)}
                        teams={teams}
                        alliancesBySeed={alliancesBySeed}
                        filterActive={filterActive}
                        isInFilter={isInFilter}
                      />
                    ))}
                  </>
                )}
              </div>
              <div className="bracket-cell">
                {!col.lower || hideLower ? (
                  <div className="bracket-cell-empty" aria-hidden="true" />
                ) : (
                  <>
                    <div className="bracket-cell-label">{col.lower.round}</div>
                    {col.lower.sets.map((s) => (
                      <Match
                        key={s}
                        slot={event.slots.find((slot) => slot.set === s)}
                        teams={teams}
                        alliancesBySeed={alliancesBySeed}
                        filterActive={filterActive}
                        isInFilter={isInFilter}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
