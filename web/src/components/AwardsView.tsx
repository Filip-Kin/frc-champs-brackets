import type { ReactNode } from "react";
import type { Award, DivisionEvent, Snapshot, Team } from "@shared/types.ts";
import { TeamCell } from "./TeamCell.tsx";

interface Props {
  snapshot: Snapshot;
  selectedTeams: ReadonlySet<string>;
}

export function AwardsView({ snapshot, selectedTeams }: Props): ReactNode {
  const filterActive = selectedTeams.size > 0;
  const allEvents: DivisionEvent[] = [
    ...snapshot.divisions.filter((d): d is DivisionEvent => d != null),
    ...(snapshot.einstein ? [snapshot.einstein] : []),
  ];

  return (
    <section className="awards-grid">
      {allEvents.map((ev) => (
        <DivisionAwards
          key={ev.key}
          event={ev}
          teams={snapshot.teams}
          filterActive={filterActive}
          selectedTeams={selectedTeams}
        />
      ))}
    </section>
  );
}

interface DivisionAwardsProps {
  event: DivisionEvent;
  teams: Record<string, Team>;
  filterActive: boolean;
  selectedTeams: ReadonlySet<string>;
}

function DivisionAwards({ event, teams, filterActive, selectedTeams }: DivisionAwardsProps): ReactNode {
  const eventUrl = `https://www.thebluealliance.com/event/${event.key}#awards`;

  const isInFilter = (award: Award): boolean =>
    award.recipients.some((r) => r.teamKey != null && selectedTeams.has(r.teamKey));

  const hasAnyMatching = !filterActive || event.awards.some(isInFilter);

  return (
    <article className={`awards-card${!hasAnyMatching ? " awards-card-faded" : ""}`}>
      <header className="awards-header">
        <h3 className="awards-name">
          <a href={eventUrl} target="_blank" rel="noopener noreferrer">{event.name}</a>
        </h3>
        <span className="awards-count">{event.awards.length}</span>
      </header>
      {event.awards.length === 0 ? (
        <div className="awards-empty">Awards not yet announced</div>
      ) : (
        <ul className="awards-list">
          {event.awards.map((award, i) => {
            const inFilter = filterActive ? isInFilter(award) : true;
            const className = [
              "award",
              filterActive && !inFilter ? "award-out" : "",
              filterActive && inFilter ? "award-in" : "",
            ].filter(Boolean).join(" ");
            return (
              <li key={i} className={className}>
                <div className="award-name">{award.name}</div>
                <div className="award-recipients">
                  {award.recipients.length === 0 ? (
                    <span className="award-empty">Not awarded</span>
                  ) : (
                    award.recipients.map((r, j) => {
                      const team = r.teamKey ? teams[r.teamKey] : null;
                      return (
                        <span key={j} className="award-recipient">
                          {team ? <TeamCell team={team} /> : null}
                          {r.awardee ? <span className="award-awardee">{r.awardee}</span> : null}
                        </span>
                      );
                    })
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
