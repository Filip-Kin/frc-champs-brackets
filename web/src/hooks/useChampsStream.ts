import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "@shared/types.ts";

export type StreamStatus = "connecting" | "live" | "polling" | "error";

interface UseChampsStreamResult {
  snapshot: Snapshot | null;
  status: StreamStatus;
}

export function useChampsStream(year: number): UseChampsStreamResult {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const sseFailedAtRef = useRef<number | null>(null);

  // #region SSE primary

  useEffect(() => {
    let closed = false;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const open = (): void => {
      if (closed) return;
      es = new EventSource(`/api/champs/${year}/stream`);
      setStatus("connecting");

      es.onopen = (): void => {
        sseFailedAtRef.current = null;
        setStatus("live");
      };
      es.onmessage = (e: MessageEvent<string>): void => {
        try {
          const next = JSON.parse(e.data) as Snapshot;
          setSnapshot(next);
        } catch (err) {
          console.error("snapshot parse:", err);
        }
      };
      es.onerror = (): void => {
        if (es?.readyState === EventSource.CLOSED) {
          sseFailedAtRef.current = Date.now();
          setStatus("error");
          reconnectTimer = setTimeout(open, 5000);
        } else {
          setStatus("connecting");
        }
      };
    };

    open();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [year]);

  // #endregion

  // #region Poll fallback

  useEffect(() => {
    let cancelled = false;
    const tryPoll = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/champs/${year}`);
        if (!res.ok) return;
        const next = (await res.json()) as Snapshot;
        if (cancelled) return;
        setSnapshot((prev) => {
          // Don't overwrite a fresher snapshot from SSE
          if (prev && prev.updatedAt >= next.updatedAt) return prev;
          return next;
        });
      } catch {
        // ignored; SSE will retry
      }
    };
    // Initial poll for fast first paint, then poll every 20s as a safety net.
    void tryPoll();
    const id = setInterval(tryPoll, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [year]);

  // #endregion

  return { snapshot, status };
}
