import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePopover } from "./PopoverProvider.tsx";

const OFFSET = 14;
const FALLBACK_W = 240;
const FALLBACK_H = 70;

export function Popover(): ReactNode {
  const { hovered } = usePopover();
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: FALLBACK_W, h: FALLBACK_H });

  // Measure once per team change. Avoids infinite loop from setState-in-ref.
  useLayoutEffect(() => {
    if (!ref.current || !hovered) return;
    const w = ref.current.offsetWidth;
    const h = ref.current.offsetHeight;
    setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
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
    <div ref={ref} className="popover" style={{ left: `${x}px`, top: `${y}px` }}>
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
