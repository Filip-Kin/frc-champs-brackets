import { useCallback, useEffect, useState } from "react";

const KEY = "champs.zoom.v1";
const MIN = 0.6;
const MAX = 1.6;
const STEP = 0.1;
const DEFAULT = 1.0;

function load(): number {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return DEFAULT;
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return DEFAULT;
    return Math.min(MAX, Math.max(MIN, n));
  } catch {
    return DEFAULT;
  }
}

export interface ZoomApi {
  zoom: number;
  setZoom: (n: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  min: number;
  max: number;
  step: number;
}

export function useZoom(): ZoomApi {
  const [zoom, setZoomState] = useState<number>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(zoom));
    } catch {
      // ignore
    }
  }, [zoom]);

  const setZoom = useCallback((n: number) => {
    if (!Number.isFinite(n)) return;
    setZoomState(Math.min(MAX, Math.max(MIN, Math.round(n * 10) / 10)));
  }, []);

  const zoomIn = useCallback(() => setZoomState((z) => Math.min(MAX, Math.round((z + STEP) * 10) / 10)), []);
  const zoomOut = useCallback(() => setZoomState((z) => Math.max(MIN, Math.round((z - STEP) * 10) / 10)), []);
  const reset = useCallback(() => setZoomState(DEFAULT), []);

  return { zoom, setZoom, zoomIn, zoomOut, reset, min: MIN, max: MAX, step: STEP };
}
