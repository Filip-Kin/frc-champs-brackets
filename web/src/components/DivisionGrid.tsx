import type { CSSProperties, ReactNode } from "react";
import type { DivisionEvent, Snapshot } from "@shared/types.ts";
import { Bracket } from "./Bracket.tsx";

interface Props {
  snapshot: Snapshot;
  selectedTeams: ReadonlySet<string>;
  hideDecided: boolean;
  zoom: number;
}

export function DivisionGrid({ snapshot, selectedTeams, hideDecided, zoom }: Props): ReactNode {
  const style = { "--zoom": String(zoom) } as CSSProperties;
  return (
    <section className="divisions" style={style}>
      {snapshot.divisions.map((ev: DivisionEvent | null, i: number) => {
        const mirror = i % 2 === 1; // every second bracket is in the right column
        if (!ev) {
          return (
            <div key={`empty-${i}`} className="bracket bracket-missing">
              No data
            </div>
          );
        }
        return (
          <Bracket
            key={ev.key}
            event={ev}
            teams={snapshot.teams}
            selectedTeams={selectedTeams}
            hideDecided={hideDecided}
            mirror={mirror}
          />
        );
      })}
    </section>
  );
}
