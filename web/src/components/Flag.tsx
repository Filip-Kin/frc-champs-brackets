import type { Flag as FlagType } from "@shared/types.ts";
import type { ReactNode } from "react";

interface Props {
  flag: FlagType;
}

export function Flag({ flag }: Props): ReactNode {
  if (!flag.code) return null;
  if (flag.kind === "state") {
    return (
      <img
        className="flag flag-state"
        src={`/state-flags/${flag.code}.png`}
        alt=""
        title={flag.label}
        loading="lazy"
      />
    );
  }
  return <span className={`flag flag-country fi fi-${flag.code}`} title={flag.label} />;
}
