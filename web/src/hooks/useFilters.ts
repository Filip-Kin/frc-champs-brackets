import { useCallback, useEffect, useState } from "react";

const KEY = "champs.filters.v1";

interface PersistedShape {
  selectedTeams: string[];
}

function loadPersisted(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as PersistedShape;
    return new Set(parsed.selectedTeams ?? []);
  } catch {
    return new Set();
  }
}

function persist(selected: Set<string>): void {
  try {
    const data: PersistedShape = { selectedTeams: [...selected] };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export interface FiltersApi {
  selectedTeams: ReadonlySet<string>;
  isActive: boolean;
  isSelected: (teamKey: string) => boolean;
  toggleTeam: (teamKey: string) => void;
  addTeams: (teamKeys: string[]) => void;
  removeTeams: (teamKeys: string[]) => void;
  clearAll: () => void;
}

export function useFilters(): FiltersApi {
  const [selected, setSelected] = useState<Set<string>>(() => loadPersisted());

  useEffect(() => {
    persist(selected);
  }, [selected]);

  const toggleTeam = useCallback((teamKey: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamKey)) next.delete(teamKey);
      else next.add(teamKey);
      return next;
    });
  }, []);

  const addTeams = useCallback((teamKeys: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of teamKeys) next.add(k);
      return next;
    });
  }, []);

  const removeTeams = useCallback((teamKeys: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of teamKeys) next.delete(k);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((teamKey: string) => selected.has(teamKey), [selected]);

  return {
    selectedTeams: selected,
    isActive: selected.size > 0,
    isSelected,
    toggleTeam,
    addTeams,
    removeTeams,
    clearAll,
  };
}
