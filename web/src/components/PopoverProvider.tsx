import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Team } from "@shared/types.ts";

interface HoverState {
  team: Team;
  x: number;
  y: number;
}

interface PopoverContextValue {
  hovered: HoverState | null;
  show: (team: Team, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopover(): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error("usePopover must be used inside <PopoverProvider>");
  return ctx;
}

interface Props {
  children: ReactNode;
  // Used to clear the popover whenever a new snapshot arrives, in case the
  // hovered team's element is removed from the DOM mid-hover.
  resetKey?: string;
}

export function PopoverProvider({ children, resetKey }: Props): ReactNode {
  const [hovered, setHovered] = useState<HoverState | null>(null);

  const show = useCallback((team: Team, x: number, y: number) => {
    setHovered({ team, x, y });
  }, []);

  const move = useCallback((x: number, y: number) => {
    setHovered((prev) => (prev ? { ...prev, x, y } : prev));
  }, []);

  const hide = useCallback(() => setHovered(null), []);

  // Clear popover whenever a new snapshot is received.
  useEffect(() => {
    setHovered(null);
  }, [resetKey]);

  // Global safety listeners: hide popover whenever the cursor isn't over a team
  // element, the window loses focus, or the page scrolls.
  useEffect(() => {
    const onPointerOver = (e: PointerEvent): void => {
      const target = e.target as Element | null;
      if (!target || !target.closest?.("[data-team-cell]")) {
        setHovered(null);
      }
    };
    const onBlur = (): void => setHovered(null);
    const onScroll = (): void => setHovered(null);
    const onPointerLeaveDoc = (e: PointerEvent): void => {
      // Hide when pointer leaves the document entirely
      if (!e.relatedTarget) setHovered(null);
    };

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerleave", onPointerLeaveDoc);
    window.addEventListener("blur", onBlur);
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });

    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerleave", onPointerLeaveDoc);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
    };
  }, []);

  const value = useMemo<PopoverContextValue>(
    () => ({ hovered, show, move, hide }),
    [hovered, show, move, hide],
  );

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}
