import type { Snapshot, Team } from "@shared/types.ts";
import { discoverEventKeys, getTeam, resolveEvent } from "./tba.ts";

const POLL_MS = parseInt(process.env.POLL_MS ?? "20000", 10);
const TARGET_YEAR = parseInt(process.env.YEAR ?? String(new Date().getFullYear()), 10);
const TEAM_CONCURRENCY = 8;

let currentSnapshot: Snapshot | null = null;
let pollErrors = 0;

const sseClients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();

export function getSnapshot(): Snapshot | null {
  return currentSnapshot;
}

export function getStats(): { ok: boolean; updatedAt: string | null; pollErrors: number; sseClients: number } {
  return {
    ok: !!currentSnapshot,
    updatedAt: currentSnapshot?.updatedAt ?? null,
    pollErrors,
    sseClients: sseClients.size,
  };
}

export function addSseClient(controller: ReadableStreamDefaultController<Uint8Array>): void {
  sseClients.add(controller);
  if (currentSnapshot) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(currentSnapshot)}\n\n`));
  }
}

export function removeSseClient(controller: ReadableStreamDefaultController<Uint8Array>): void {
  sseClients.delete(controller);
}

export function getTargetYear(): number {
  return TARGET_YEAR;
}

function broadcast(): void {
  if (!currentSnapshot) return;
  const data = encoder.encode(`data: ${JSON.stringify(currentSnapshot)}\n\n`);
  for (const c of sseClients) {
    try {
      c.enqueue(data);
    } catch {
      sseClients.delete(c);
    }
  }
}

async function buildSnapshot(year: number): Promise<Snapshot> {
  const { divisions, einstein } = await discoverEventKeys(year);

  const divisionEvents = await Promise.all(
    divisions.map((k) =>
      resolveEvent(k).catch((err: Error) => {
        console.error(`event ${k} failed:`, err.message);
        return null;
      }),
    ),
  );

  const einsteinEvent = einstein
    ? await resolveEvent(einstein).catch((err: Error) => {
        console.error(`einstein ${einstein} failed:`, err.message);
        return null;
      })
    : null;

  const allTeamKeys = new Set<string>();
  for (const ev of divisionEvents) if (ev) ev.teamKeys.forEach((t) => allTeamKeys.add(t));
  if (einsteinEvent) einsteinEvent.teamKeys.forEach((t) => allTeamKeys.add(t));

  const teamKeysArr = [...allTeamKeys];
  const teams: Record<string, Team> = {};
  let idx = 0;
  const worker = async (): Promise<void> => {
    while (idx < teamKeysArr.length) {
      const i = idx++;
      const k = teamKeysArr[i];
      if (!k) continue;
      try {
        const { expires: _expires, avatarPng: _avatarPng, ...pub } = await getTeam(k, year);
        teams[k] = pub;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`team ${k} failed:`, msg);
        teams[k] = {
          key: k,
          number: parseInt(k.replace("frc", ""), 10),
          nickname: "",
          city: null,
          state_prov: null,
          country: null,
          hasAvatar: false,
          flag: { kind: null, code: null, label: "Unknown" },
        };
      }
    }
  };
  await Promise.all(Array.from({ length: TEAM_CONCURRENCY }, worker));

  const allDivisionsDecided = divisionEvents.every(
    (ev) => ev && ev.alliances.length >= 8 && ev.alliances.some((a) => a.status === "won"),
  );

  return {
    year,
    updatedAt: new Date().toISOString(),
    divisions: divisionEvents,
    einstein: einsteinEvent,
    revealEinstein: allDivisionsDecided,
    teams,
  };
}

export async function pollLoop(): Promise<void> {
  try {
    const snap = await buildSnapshot(TARGET_YEAR);
    currentSnapshot = snap;
    pollErrors = 0;
    broadcast();
    console.log(
      `[poll] ok @ ${snap.updatedAt} (${Object.keys(snap.teams).length} teams, ${
        snap.divisions.filter(Boolean).length
      } divisions, einstein=${snap.einstein ? "yes" : "no"})`,
    );
  } catch (e) {
    pollErrors++;
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[poll] failed (#${pollErrors}):`, msg);
  } finally {
    setTimeout(pollLoop, POLL_MS);
  }
}
