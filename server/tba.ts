import { resolveFlag } from "@shared/flags.ts";
import {
  BRACKET_SLOTS,
  type Alliance,
  type AllianceStatus,
  type DivisionEvent,
  type GrandFinalGame,
  type SideInfo,
  type Slot,
  type Team,
} from "@shared/types.ts";

const TBA = "https://www.thebluealliance.com/api/v3";
const TBA_KEY = process.env.TBA_API_KEY;

if (!TBA_KEY) {
  console.error("FATAL: TBA_API_KEY not set");
  process.exit(1);
}

// #region TBA fetch with conditional caching

interface CacheEntry {
  etag: string | null;
  lastModified: string | null;
  body: unknown;
}

const etagCache = new Map<string, CacheEntry>();

export async function tbaFetch<T>(path: string): Promise<T> {
  const url = `${TBA}${path}`;
  const cached = etagCache.get(url);
  const headers: Record<string, string> = { "X-TBA-Auth-Key": TBA_KEY as string };
  if (cached?.etag) headers["If-None-Match"] = cached.etag;
  if (cached?.lastModified) headers["If-Modified-Since"] = cached.lastModified;

  const res = await fetch(url, { headers });
  if (res.status === 304 && cached) return cached.body as T;
  if (!res.ok) throw new Error(`TBA ${path} -> ${res.status}`);
  const body = (await res.json()) as T;
  etagCache.set(url, {
    etag: res.headers.get("etag"),
    lastModified: res.headers.get("last-modified"),
    body,
  });
  return body;
}

// #endregion

// #region Team metadata cache

export interface TeamCacheEntry extends Team {
  avatarPng: Uint8Array | null;
  expires: number;
}

export function getCachedAvatar(teamKey: string): Uint8Array | null {
  return teamCache.get(teamKey)?.avatarPng ?? null;
}

const teamCache = new Map<string, TeamCacheEntry>();
const TEAM_TTL_MS = 24 * 3600 * 1000;

interface TBATeamSimple {
  key: string;
  team_number: number;
  nickname: string;
  city: string | null;
  state_prov: string | null;
  country: string | null;
}

interface TBAMedia {
  type: string;
  details?: { base64Image?: string };
}

export async function getTeam(teamKey: string, year: number): Promise<TeamCacheEntry> {
  const now = Date.now();
  const cached = teamCache.get(teamKey);
  if (cached && cached.expires > now) return cached;

  const [simple, media] = await Promise.all([
    tbaFetch<TBATeamSimple>(`/team/${teamKey}/simple`),
    tbaFetch<TBAMedia[]>(`/team/${teamKey}/media/${year}`).catch(() => [] as TBAMedia[]),
  ]);

  const avatarMedia = media.find((m) => m.type === "avatar");
  let avatarPng: Uint8Array | null = null;
  if (avatarMedia?.details?.base64Image) {
    try {
      avatarPng = Uint8Array.from(atob(avatarMedia.details.base64Image), (c) => c.charCodeAt(0));
    } catch {
      avatarPng = null;
    }
  }

  const flag = resolveFlag(simple.country, simple.state_prov);

  const entry: TeamCacheEntry = {
    key: teamKey,
    number: simple.team_number,
    nickname: simple.nickname,
    city: simple.city,
    state_prov: simple.state_prov,
    country: simple.country,
    hasAvatar: !!avatarPng,
    avatarPng,
    flag,
    expires: now + TEAM_TTL_MS,
  };
  teamCache.set(teamKey, entry);
  return entry;
}

// #endregion

// #region Event resolution

interface TBAEvent {
  key: string;
  name: string;
  short_name: string | null;
  event_type: number;
}

interface TBAAlliance {
  name: string;
  picks: string[];
  status: {
    status: AllianceStatus;
    record: { wins: number; losses: number; ties: number } | null;
    double_elim_round: string | null;
  } | null;
}

interface TBAMatch {
  comp_level: string;
  set_number: number;
  match_number: number;
  winning_alliance: string;
  alliances: {
    red: { team_keys: string[]; score: number };
    blue: { team_keys: string[]; score: number };
  };
  actual_time: number | null;
  predicted_time: number | null;
}

export async function resolveEvent(eventKey: string): Promise<DivisionEvent> {
  const [event, alliancesRaw, matchesRaw] = await Promise.all([
    tbaFetch<TBAEvent>(`/event/${eventKey}`),
    tbaFetch<TBAAlliance[]>(`/event/${eventKey}/alliances`).catch(() => [] as TBAAlliance[]),
    tbaFetch<TBAMatch[]>(`/event/${eventKey}/matches`).catch(() => [] as TBAMatch[]),
  ]);

  const alliances: Alliance[] = (alliancesRaw ?? []).map((a, i) => ({
    seed: i + 1,
    name: a.name,
    picks: a.picks,
    status: a.status?.status ?? "unknown",
    record: a.status?.record ?? null,
    double_elim_round: a.status?.double_elim_round ?? null,
  }));

  const allTeamKeys = new Set<string>();
  for (const a of alliances) for (const t of a.picks) allTeamKeys.add(t);

  const matchesByKey: Record<string, TBAMatch> = {};
  const finals: TBAMatch[] = [];
  for (const m of matchesRaw ?? []) {
    if (m.comp_level !== "sf" && m.comp_level !== "f") continue;
    if (m.comp_level === "f") {
      finals.push(m);
    } else {
      const key = `sf-${m.set_number}`;
      const prev = matchesByKey[key];
      if (!prev || m.match_number > prev.match_number) matchesByKey[key] = m;
    }
  }
  finals.sort((a, b) => a.match_number - b.match_number);

  const seedFor = (teamKeys: string[]): number | null => {
    if (!teamKeys.length) return null;
    const set = new Set(teamKeys);
    for (const a of alliances) {
      const first3 = a.picks.slice(0, 3);
      const matchCount = first3.filter((t) => set.has(t)).length;
      if (matchCount >= 2) return a.seed;
    }
    return null;
  };

  const sideOf = (m: TBAMatch | undefined, color: "red" | "blue"): SideInfo => {
    const teams = m?.alliances?.[color]?.team_keys ?? [];
    return {
      seed: seedFor(teams),
      teams,
      score: m?.alliances?.[color]?.score ?? null,
    };
  };

  const slots: Slot[] = BRACKET_SLOTS.map((def) => {
    const m = matchesByKey[`sf-${def.set}`];
    return {
      ...def,
      played: !!m && !!m.winning_alliance,
      red: sideOf(m, "red"),
      blue: sideOf(m, "blue"),
      winner: (m?.winning_alliance as "red" | "blue" | "") ? (m!.winning_alliance as "red" | "blue") : null,
      time: m?.actual_time ?? m?.predicted_time ?? null,
    };
  });

  const grandFinal: { games: GrandFinalGame[] } = {
    games: finals.map((m) => ({
      match_number: m.match_number,
      played: !!m.winning_alliance,
      red: sideOf(m, "red"),
      blue: sideOf(m, "blue"),
      winner: m.winning_alliance ? (m.winning_alliance as "red" | "blue") : null,
      time: m.actual_time ?? m.predicted_time ?? null,
    })),
  };

  return {
    key: eventKey,
    name: event.short_name || event.name,
    type: event.event_type as 3 | 4,
    teamKeys: [...allTeamKeys],
    alliances,
    slots,
    grandFinal,
  };
}

export async function discoverEventKeys(year: number): Promise<{ divisions: string[]; einstein: string | null }> {
  const events = await tbaFetch<TBAEvent[]>(`/events/${year}`);
  const divisions = events.filter((e) => e.event_type === 3).map((e) => e.key).sort();
  const einstein = events.find((e) => e.event_type === 4)?.key ?? null;
  return { divisions, einstein };
}

// #endregion
