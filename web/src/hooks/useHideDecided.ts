import { useCallback, useEffect, useState } from "react";

const KEY = "champs.hideDecided.v1";

export interface HideDecidedApi {
  hideDecided: boolean;
  toggle: () => void;
  set: (v: boolean) => void;
}

export function useHideDecided(): HideDecidedApi {
  const [hideDecided, setState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, hideDecided ? "1" : "0");
    } catch {
      // ignore
    }
  }, [hideDecided]);

  const toggle = useCallback(() => setState((v) => !v), []);
  const set = useCallback((v: boolean) => setState(v), []);

  return { hideDecided, toggle, set };
}
