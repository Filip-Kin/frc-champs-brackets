import type { ReactNode } from "react";

interface Props {
  label: string;
  advancing: number[];
}

export function CollapsedRoundBanner({ label, advancing }: Props): ReactNode {
  return (
    <div className="round-banner" title={`${label} complete`}>
      <span className="round-banner-label">{label}</span>
      <span className="round-banner-seeds">
        {advancing.map((s, i) => (
          <span key={s} className="round-banner-seed">
            {i > 0 ? " " : ""}A{s}
          </span>
        ))}
      </span>
    </div>
  );
}
