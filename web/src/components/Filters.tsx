import { useMemo, type ReactNode } from "react";
import type { Team } from "@shared/types.ts";
import type { FiltersApi } from "../hooks/useFilters.ts";
import { buildRegions } from "../lib/regions.ts";
import { RegionSelect } from "./RegionSelect.tsx";
import { TeamMultiSelect } from "./TeamMultiSelect.tsx";

interface Props {
  teams: Record<string, Team>;
  filters: FiltersApi;
}

export function Filters({ teams, filters }: Props): ReactNode {
  const regions = useMemo(() => buildRegions(teams), [teams]);
  const teamList = useMemo<Team[]>(
    () => Object.values(teams).sort((a, b) => a.number - b.number),
    [teams],
  );

  return (
    <section className="filters">
      <RegionSelect regions={regions} onPick={(r): void => filters.addTeams(r.teamKeys)} />
      <TeamMultiSelect
        teams={teamList}
        selected={filters.selectedTeams}
        toggle={filters.toggleTeam}
        clearAll={filters.clearAll}
      />
      {filters.isActive ? (
        <button type="button" className="filters-clear" onClick={filters.clearAll}>
          Clear filter
        </button>
      ) : null}
    </section>
  );
}
