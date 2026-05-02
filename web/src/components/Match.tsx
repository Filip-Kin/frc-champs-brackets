import type { ReactNode } from "react";
import type { Slot, Team } from "@shared/types.ts";
import { TeamCell } from "./TeamCell.tsx";

interface Props {
  slot: Slot | undefined;
  teams: Record<string, Team>;
  filterActive: boolean;
  isInFilter: (slot: Slot) => boolean;
}

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
        teamKeys={slot.red.teams}
        score={slot.red.score}
        winner={slot.winner === "red"}
        played={slot.played}
        teams={teams}
      />
      <MatchRow
        side="blue"
        seed={slot.blue.seed}
        teamKeys={slot.blue.teams}
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

export function MatchRow({ side, seed, teamKeys, score, winner, played, teams }: RowProps): ReactNode {
  const className = [
    "match-row",
    `match-row-${side}`,
    winner ? "match-row-winner" : "",
    played && !winner ? "match-row-loser" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const slots: (string | null)[] = [teamKeys[0] ?? null, teamKeys[1] ?? null, teamKeys[2] ?? null];

  return (
    <div className={className}>
      <span className="match-seed">{seed != null ? `A${seed}` : ""}</span>
      {slots.map((tk, i) => {
        if (!tk) return <span key={i} className="match-team match-team-empty" />;
        const t = teams[tk];
        if (!t) return <span key={i} className="match-team match-team-empty" />;
        return (
          <span key={tk} className="match-team">
            <TeamCell team={t} />
          </span>
        );
      })}
      <span className="match-score">{score != null && score >= 0 ? score : ""}</span>
    </div>
  );
}
