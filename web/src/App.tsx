import type { ReactNode } from "react";
import { useChampsStream } from "./hooks/useChampsStream.ts";
import { useFilters } from "./hooks/useFilters.ts";
import { useZoom } from "./hooks/useZoom.ts";
import { useHideDecided } from "./hooks/useHideDecided.ts";
import { Header } from "./components/Header.tsx";
import { Filters } from "./components/Filters.tsx";
import { DivisionGrid } from "./components/DivisionGrid.tsx";
import { EinsteinPanel } from "./components/EinsteinPanel.tsx";
import { PopoverProvider } from "./components/PopoverProvider.tsx";
import { Popover } from "./components/Popover.tsx";

export function App(): ReactNode {
  const year = new Date().getFullYear();
  const { snapshot, status } = useChampsStream(year);
  const filters = useFilters();
  const zoom = useZoom();
  const hide = useHideDecided();

  return (
    <PopoverProvider resetKey={snapshot?.updatedAt}>
      <Header
        year={snapshot?.year ?? year}
        updatedAt={snapshot?.updatedAt ?? null}
        status={status}
        zoom={zoom}
        hide={hide}
      />
      {snapshot ? (
        <>
          <Filters teams={snapshot.teams} filters={filters} />
          <EinsteinPanel
            snapshot={snapshot}
            selectedTeams={filters.selectedTeams}
            hideDecided={hide.hideDecided}
          />
          <DivisionGrid
            snapshot={snapshot}
            selectedTeams={filters.selectedTeams}
            hideDecided={hide.hideDecided}
            zoom={zoom.zoom}
          />
        </>
      ) : (
        <div className="loading">Loading...</div>
      )}
      <Popover />
    </PopoverProvider>
  );
}
