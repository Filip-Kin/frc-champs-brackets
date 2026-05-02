import type { ReactNode } from "react";
import type { Region } from "../lib/regions.ts";

interface Props {
  regions: Region[];
  onPick: (region: Region) => void;
}

export function RegionSelect({ regions, onPick }: Props): ReactNode {
  return (
    <select
      className="region-select"
      value=""
      onChange={(e): void => {
        const key = e.currentTarget.value;
        if (!key) return;
        const r = regions.find((x) => x.key === key);
        if (r) onPick(r);
        e.currentTarget.value = "";
      }}
    >
      <option value="">+ Add a region...</option>
      {regions.map((r) => (
        <option key={r.key} value={r.key}>
          {r.label} ({r.count})
        </option>
      ))}
    </select>
  );
}
