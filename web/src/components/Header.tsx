import type { ReactNode } from "react";
import type { StreamStatus } from "../hooks/useChampsStream.ts";
import type { ZoomApi } from "../hooks/useZoom.ts";
import type { HideDecidedApi } from "../hooks/useHideDecided.ts";
import type { Page } from "../hooks/useHashRoute.ts";

interface Props {
  year: number;
  updatedAt: string | null;
  status: StreamStatus;
  zoom: ZoomApi;
  hide: HideDecidedApi;
  page: Page;
  setPage: (p: Page) => void;
}

export function Header({ year, updatedAt, status, zoom, hide, page, setPage }: Props): ReactNode {
  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleTimeString() : "-";
  return (
    <header className="app-header">
      <div className="app-header-title">
        <h1>FRC Champs {year}</h1>
        <nav className="page-nav">
          <button
            type="button"
            className={`page-nav-btn${page === "brackets" ? " page-nav-active" : ""}`}
            onClick={(): void => setPage("brackets")}
          >
            Brackets
          </button>
          <button
            type="button"
            className={`page-nav-btn${page === "awards" ? " page-nav-active" : ""}`}
            onClick={(): void => setPage("awards")}
          >
            Awards
          </button>
        </nav>
        <span className={`status-pill status-${status}`}>{status}</span>
        <span className="updated-at">updated {updatedLabel}</span>
      </div>
      {page === "brackets" ? (
        <div className="app-header-controls">
          <label className="hide-toggle">
            <input type="checkbox" checked={hide.hideDecided} onChange={hide.toggle} />
            Hide decided rounds
          </label>
          <div className="zoom">
            <button type="button" className="zoom-btn" onClick={zoom.zoomOut} aria-label="Zoom out">-</button>
            <input
              type="range"
              min={zoom.min}
              max={zoom.max}
              step={zoom.step}
              value={zoom.zoom}
              onChange={(e): void => zoom.setZoom(parseFloat(e.currentTarget.value))}
              aria-label="Zoom"
            />
            <button type="button" className="zoom-btn" onClick={zoom.zoomIn} aria-label="Zoom in">+</button>
            <button type="button" className="zoom-btn zoom-reset" onClick={zoom.reset} aria-label="Reset zoom">{zoom.zoom.toFixed(1)}x</button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
