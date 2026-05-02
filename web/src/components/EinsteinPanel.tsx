import type { ReactNode } from "react";
import type { Snapshot } from "@shared/types.ts";
import { Bracket } from "./Bracket.tsx";

interface Props {
  snapshot: Snapshot;
  selectedTeams: ReadonlySet<string>;
  hideDecided: boolean;
}

export function EinsteinPanel({ snapshot, selectedTeams, hideDecided }: Props): ReactNode {
  if (!snapshot.revealEinstein || !snapshot.einstein) return null;
  return (
    <section className="einstein-wrap">
      <h2>Einstein</h2>
      <Bracket
        event={snapshot.einstein}
        teams={snapshot.teams}
        selectedTeams={selectedTeams}
        hideDecided={hideDecided}
      />
    </section>
  );
}
