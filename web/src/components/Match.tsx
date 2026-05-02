import type { ReactNode } from "react";
import type { Slot, Team } from "@shared/types.ts";
import { TeamCell } from "./TeamCell.tsx";

interface Props {
  slot: Slot | undefined;
  teams: Record<string, Team>;
  filterActive: boolean;
  isInFilter: (slot: Slot) => boolean;
}

const PLACEHOLDER_TEAMS: string[] = [];

export function Match({ slot, teams, filterActive, isInFilter }: Props): ReactNode {
  if (!slot) {
    return <div className="match match-empty" aria-hidden="true" />;
  }

  const inFilter = filterActive ? isInFilter(slot) : true;
  const empty = !slot.red.teams.length && !slot.blue.teams.length;

  const className = [
    "match",
    empty ? "match-empty" : "",
    filterActive ? (inFilter ? "match-in-filter" : "match-out-filter") : "",
    slot.played ? "match-played" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <MatchRow
        side="red"
        seed={slot.red.seed}
        teamKeys={slot.red.teams.length ? slot.red.teams : PLACEHOLDER_TEAMS}
        score={slot.red.score}
        winner={slot.winner === "red"}
        played={slot.played}
        teams={teams}
      />
      <MatchRow
        side="blue"
        seed={slot.blue.seed}
        teamKeys={slot.blue.teams.length ? slot.blue.teams : PLACEHOLDER_TEAMS}
        score={slot.blue.score}
        winner={slot.winner === "blue"}
        played={slot.played}
        teams={teams}
      />
    </div>
  );
}

interface RowProps {
  side: "red" | "blue";
  seed: number | null;
  teamKeys: string[];
  score: number | null;
  winner: boolean;
  played: boolean;
  teams: Record<string, Team>;
}

function MatchRow({ side, seed, teamKeys, score, winner, played, teams }: RowProps): ReactNode {
  const className = [
    "match-row",
    `match-row-${side}`,
    winner ? "match-row-winner" : "",
    played && !winner ? "match-row-loser" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <span className="match-seed">{seed != null ? `A${seed}` : ""}</span>
      <div className="match-teams">
        {teamKeys.length ? (
          teamKeys.map((tk) => {
            const t = teams[tk];
            if (!t) return null;
            return <TeamCell key={tk} team={t} />;
          })
        ) : (
          <span className="match-team-placeholder">-</span>
        )}
      </div>
      <span className="match-score">{score != null && score >= 0 ? score : ""}</span>
    </div>
  );
}
