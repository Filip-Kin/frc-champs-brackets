import type { ReactNode } from "react";
import type { GrandFinalGame, Team } from "@shared/types.ts";
import { TeamCell } from "./TeamCell.tsx";

interface Props {
  games: GrandFinalGame[];
  teams: Record<string, Team>;
  filterActive: boolean;
  isTeamInFilter: (teamKey: string) => boolean;
}

export function GrandFinal({ games, teams, filterActive, isTeamInFilter }: Props): ReactNode {
  return (
    <div className="gf">
      <div className="gf-title">Grand Final</div>
      {games.length === 0 ? (
        <div className="gf-pending">pending</div>
      ) : (
        games.map((g) => {
          const inFilter = filterActive
            ? [...g.red.teams, ...g.blue.teams].some(isTeamInFilter)
            : true;
          return (
            <div
              key={g.match_number}
              className={`gf-game${filterActive && !inFilter ? " gf-game-out" : ""}`}
            >
              <span className="gf-label">G{g.match_number}</span>
              <GfSide
                side="red"
                seed={g.red.seed}
                score={g.red.score}
                teamKeys={g.red.teams}
                teams={teams}
                winner={g.winner === "red"}
                played={g.played}
              />
              <span className="gf-vs">vs</span>
              <GfSide
                side="blue"
                seed={g.blue.seed}
                score={g.blue.score}
                teamKeys={g.blue.teams}
                teams={teams}
                winner={g.winner === "blue"}
                played={g.played}
              />
            </div>
          );
        })
      )}
    </div>
  );
}

interface GfSideProps {
  side: "red" | "blue";
  seed: number | null;
  score: number | null;
  teamKeys: string[];
  teams: Record<string, Team>;
  winner: boolean;
  played: boolean;
}

function GfSide({ side, seed, score, teamKeys, teams, winner, played }: GfSideProps): ReactNode {
  const className = ["gf-side", `gf-side-${side}`, winner ? "gf-side-winner" : "", played && !winner ? "gf-side-loser" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={className}>
      <span className="gf-seed">{seed ? `A${seed}` : "-"}</span>
      <span className="gf-teams">
        {teamKeys.map((tk) => {
          const t = teams[tk];
          if (!t) return null;
          return <TeamCell key={tk} team={t} />;
        })}
      </span>
      {score != null ? <span className="gf-score">{score}</span> : null}
    </span>
  );
}
