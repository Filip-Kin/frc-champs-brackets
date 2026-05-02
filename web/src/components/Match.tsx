import type { ReactNode } from "react";
import type { Alliance, Slot, Team } from "@shared/types.ts";
import { TeamCell } from "./TeamCell.tsx";

interface Props {
  slot: Slot | undefined;
  teams: Record<string, Team>;
  alliancesBySeed: Map<number, Alliance>;
  filterActive: boolean;
  isInFilter: (slot: Slot) => boolean;
}

export function Match({ slot, teams, alliancesBySeed, filterActive, isInFilter }: Props): ReactNode {
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
      <AllianceBlock
        side="red"
        seed={slot.red.seed}
        playingTeams={slot.red.teams}
        alliance={slot.red.seed != null ? alliancesBySeed.get(slot.red.seed) : undefined}
        score={slot.red.score}
        winner={slot.winner === "red"}
        played={slot.played}
        teams={teams}
      />
      <AllianceBlock
        side="blue"
        seed={slot.blue.seed}
        playingTeams={slot.blue.teams}
        alliance={slot.blue.seed != null ? alliancesBySeed.get(slot.blue.seed) : undefined}
        score={slot.blue.score}
        winner={slot.winner === "blue"}
        played={slot.played}
        teams={teams}
      />
    </div>
  );
}

interface AllianceBlockProps {
  side: "red" | "blue";
  seed: number | null;
  playingTeams: string[];
  alliance: Alliance | undefined;
  score: number | null;
  winner: boolean;
  played: boolean;
  teams: Record<string, Team>;
}

function AllianceBlock({
  side,
  seed,
  playingTeams,
  alliance,
  score,
  winner,
  played,
  teams,
}: AllianceBlockProps): ReactNode {
  // Show all 4 alliance picks when available; otherwise fall back to whatever
  // teams are listed for this match. This handles incomplete alliance data
  // and 3-team alliances at non-champs events.
  const allFour = alliance?.picks ?? [];
  const playingSet = new Set(playingTeams);
  const teamList = allFour.length > 0 ? allFour : playingTeams;

  const className = [
    "alliance",
    `alliance-${side}`,
    winner ? "alliance-winner" : "",
    played && !winner ? "alliance-loser" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <span className="alliance-seed">{seed != null ? `A${seed}` : ""}</span>
      <div className="alliance-teams">
        {teamList.map((tk) => {
          const t = teams[tk];
          if (!t) return null;
          const variant = playingSet.has(tk) || playingTeams.length === 0 ? "playing" : "backup";
          return <TeamCell key={tk} team={t} variant={variant} />;
        })}
      </div>
      <span className="alliance-score">{score != null && score >= 0 ? score : ""}</span>
    </div>
  );
}
