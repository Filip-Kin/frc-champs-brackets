import type { Team } from "@shared/types.ts";

export interface Region {
  key: string;
  kind: "state" | "country";
  code: string;
  label: string;
  count: number;
  teamKeys: string[];
}

// Builds a sorted list of regions from a teams map.
// US teams are grouped by state; non-US by country.
// Sorted by count desc, ties broken by label asc.
export function buildRegions(teams: Record<string, Team>): Region[] {
  const map = new Map<string, Region>();

  for (const team of Object.values(teams)) {
    const f = team.flag;
    if (!f.kind || !f.code) continue;
    const key = `${f.kind}:${f.code}`;
    let r = map.get(key);
    if (!r) {
      r = { key, kind: f.kind, code: f.code, label: f.label, count: 0, teamKeys: [] };
      map.set(key, r);
    }
    r.count++;
    r.teamKeys.push(team.key);
  }

  return [...map.values()].sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
}
