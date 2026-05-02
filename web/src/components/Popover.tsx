import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";
import { usePopover } from "./PopoverProvider.tsx";

const OFFSET = 14;

export function Popover(): ReactNode {
  const { hovered } = usePopover();
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 240, h: 70 });

  useEffect(() => {
    // Re-measure after content paints when team changes.
    setSize({ w: 240, h: 70 });
  }, [hovered?.team.key]);

  if (!hovered) return null;

  let x = hovered.x + OFFSET;
  let y = hovered.y + OFFSET;
  if (x + size.w > window.innerWidth) x = hovered.x - size.w - OFFSET;
  if (y + size.h > window.innerHeight) y = hovered.y - size.h - OFFSET;
  if (x < 4) x = 4;
  if (y < 4) y = 4;

  const t = hovered.team;
  const loc = [t.city, t.state_prov, t.country].filter(Boolean).join(", ");

  return createPortal(
    <div
      className="popover"
      style={{ left: `${x}px`, top: `${y}px` }}
      ref={(el): void => {
        if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight });
      }}
    >
      {t.avatar ? <img className="popover-avatar" src={t.avatar} alt="" /> : null}
      <div className="popover-body">
        <div className="popover-line">
          <span className="popover-num">{t.number}</span>{" "}
          <span className="popover-name">{t.nickname}</span>
        </div>
        {loc ? <div className="popover-loc">{loc}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
