import type { ReactNode } from "react";
import type { Snapshot } from "@shared/types.ts";
import { Bracket } from "./Bracket.tsx";
import { applyEinsteinPreview } from "../lib/einstein.ts";

interface Props {
  snapshot: Snapshot;
  selectedTeams: ReadonlySet<string>;
  hideDecided: boolean;
}

export function EinsteinPanel({ snapshot, selectedTeams, hideDecided }: Props): ReactNode {
  if (!snapshot.revealEinstein || !snapshot.einstein) return null;

  const preview = applyEinsteinPreview(snapshot);
  if (!preview) return null;

  return (
    <section className="einstein-wrap">
      <h2>
        Einstein
        {preview.isPreview ? (
          <span className="einstein-preview-tag">first round predicted from division winners</span>
        ) : null}
      </h2>
      <Bracket
        event={preview.einstein}
        teams={snapshot.teams}
        selectedTeams={selectedTeams}
        hideDecided={hideDecided}
      />
    </section>
  );
}
