import type { ReactNode } from "react";
import type { DivisionEvent, Slot, Team } from "@shared/types.ts";
import { COLUMNS, advancingSeeds, isRoundDecided } from "../lib/bracket.ts";
import { Match } from "./Match.tsx";
import { GrandFinal } from "./GrandFinal.tsx";
import { CollapsedRoundBanner } from "./CollapsedRoundBanner.tsx";

interface Props {
  event: DivisionEvent;
  teams: Record<string, Team>;
  selectedTeams: ReadonlySet<string>;
  hideDecided: boolean;
}

export function Bracket({ event, teams, selectedTeams, hideDecided }: Props): ReactNode {
  const winner = event.alliances.find((a) => a.status === "won") ?? null;
  const filterActive = selectedTeams.size > 0;

  const isTeamInFilter = (teamKey: string): boolean => selectedTeams.has(teamKey);
  const isInFilter = (slot: Slot): boolean =>
    [...slot.red.teams, ...slot.blue.teams].some((t) => selectedTeams.has(t));

  const slotBySet: Record<number, Slot | undefined> = {};
  for (const s of event.slots) slotBySet[s.set] = s;

  return (
    <article className="bracket">
      <header className="bracket-header">
        <h3 className="bracket-name">{event.name}</h3>
        {winner ? <span className="bracket-winner-badge">A{winner.seed} won</span> : null}
      </header>
      <div className="bracket-layout">
        {COLUMNS.map((col) => (
          <div key={col.index} className="bracket-col">
            <BracketSlot
              kind="upper"
              col={col}
              event={event}
              teams={teams}
              hideDecided={hideDecided}
              filterActive={filterActive}
              isInFilter={isInFilter}
              isTeamInFilter={isTeamInFilter}
            />
            <BracketSlot
              kind="lower"
              col={col}
              event={event}
              teams={teams}
              hideDecided={hideDecided}
              filterActive={filterActive}
              isInFilter={isInFilter}
              isTeamInFilter={isTeamInFilter}
            />
          </div>
        ))}
      </div>
    </article>
  );
}

interface SlotProps {
  kind: "upper" | "lower";
  col: (typeof COLUMNS)[number];
  event: DivisionEvent;
  teams: Record<string, Team>;
  hideDecided: boolean;
  filterActive: boolean;
  isInFilter: (slot: Slot) => boolean;
  isTeamInFilter: (teamKey: string) => boolean;
}

function BracketSlot({
  kind,
  col,
  event,
  teams,
  hideDecided,
  filterActive,
  isInFilter,
  isTeamInFilter,
}: SlotProps): ReactNode {
  const cell = kind === "upper" ? col.upper : col.lower;
  if (!cell) return <div className="bracket-cell bracket-cell-empty" aria-hidden="true" />;

  // Grand Final lane
  if (cell.round === "GF") {
    return (
      <div className="bracket-cell">
        <GrandFinal
          games={event.grandFinal.games}
          teams={teams}
          filterActive={filterActive}
          isTeamInFilter={isTeamInFilter}
        />
      </div>
    );
  }

  const roundLabel = cell.round;
  const decided = hideDecided && isRoundDecided(event.slots, cell.sets);
  if (decided) {
    const seeds = advancingSeeds(event.slots, cell.sets);
    return (
      <div className="bracket-cell bracket-cell-collapsed">
        <CollapsedRoundBanner label={roundLabel} advancing={seeds} />
      </div>
    );
  }

  return (
    <div className="bracket-cell">
      <div className="bracket-cell-label">{roundLabel}</div>
      {cell.sets.map((s) => (
        <Match
          key={s}
          slot={event.slots.find((slot) => slot.set === s)}
          teams={teams}
          filterActive={filterActive}
          isInFilter={isInFilter}
        />
      ))}
    </div>
  );
}
