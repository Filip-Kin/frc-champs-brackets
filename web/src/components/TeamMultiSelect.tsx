import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Team } from "@shared/types.ts";
import { Flag } from "./Flag.tsx";

interface Props {
  teams: Team[];
  selected: ReadonlySet<string>;
  toggle: (teamKey: string) => void;
  clearAll: () => void;
}

export function TeamMultiSelect({ teams, selected, toggle, clearAll }: Props): ReactNode {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return (): void => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = useMemo<Team[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => {
      if (String(t.number).startsWith(q)) return true;
      if (t.nickname.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [query, teams]);

  return (
    <div className="team-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className="team-select-button"
        onClick={(): void => setOpen((v) => !v)}
      >
        Teams ({selected.size})
        <span className="team-select-chev">{open ? "v" : ">"}</span>
      </button>
      {open ? (
        <div className="team-select-popover">
          <div className="team-select-search">
            <input
              type="search"
              placeholder="Search number or name..."
              value={query}
              onChange={(e): void => setQuery(e.currentTarget.value)}
              autoFocus
            />
            <button type="button" className="team-select-clear" onClick={clearAll} disabled={selected.size === 0}>
              Clear
            </button>
          </div>
          <div className="team-select-list">
            {filtered.map((t) => (
              <label key={t.key} className="team-select-row">
                <input type="checkbox" checked={selected.has(t.key)} onChange={(): void => toggle(t.key)} />
                <span className="team-select-num">{t.number}</span>
                <Flag flag={t.flag} />
                <span className="team-select-nick">{t.nickname}</span>
              </label>
            ))}
            {filtered.length === 0 ? <div className="team-select-empty">No matches</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
