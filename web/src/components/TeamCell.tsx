import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import type { Team } from "@shared/types.ts";
import { Flag } from "./Flag.tsx";
import { usePopover } from "./PopoverProvider.tsx";

interface Props {
  team: Team;
  variant?: "playing" | "backup";
}

export function TeamCell({ team, variant = "playing" }: Props): ReactNode {
  const { show, move } = usePopover();

  const onPointerEnter = (e: ReactPointerEvent<HTMLSpanElement>): void => {
    show(team, e.clientX, e.clientY);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLSpanElement>): void => {
    move(e.clientX, e.clientY);
  };

  return (
    <span
      className={`team-cell team-cell-${variant}`}
      data-team-cell
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
    >
      <span className="team-num">{team.number}</span>
      <Flag flag={team.flag} />
    </span>
  );
}
