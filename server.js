import express from "express";
import { resolveFlag } from "./flags.js";

const PORT = process.env.PORT || 3000;
const TBA_KEY = process.env.TBA_API_KEY;
const POLL_MS = parseInt(process.env.POLL_MS || "20000", 10);
const TBA = "https://www.thebluealliance.com/api/v3";

if (!TBA_KEY) {
  console.error("FATAL: TBA_API_KEY not set");
  process.exit(1);
}

// ---------------- TBA fetch with ETag-style caching ----------------
const etagCache = new Map(); // url -> { etag, lastModified, body }

async function tbaFetch(path) {
  const url = `${TBA}${path}`;
  const cached = etagCache.get(url);
  const headers = { "X-TBA-Auth-Key": TBA_KEY };
  if (cached?.etag) headers["If-None-Match"] = cached.etag;
  if (cached?.lastModified) headers["If-Modified-Since"] = cached.lastModified;

  const res = await fetch(url, { headers });
  if (res.status === 304 && cached) return cached.body;
  if (!res.ok) throw new Error(`TBA ${path} -> ${res.status}`);
  const body = await res.json();
  etagCache.set(url, {
    etag: res.headers.get("etag"),
    lastModified: res.headers.get("last-modified"),
    body,
  });
  return body;
}

// ---------------- Team metadata cache (24h) ----------------
const teamCache = new Map(); // teamKey -> { simple, avatar, expires }
const TEAM_TTL_MS = 24 * 3600 * 1000;

async function getTeam(teamKey, year) {
  const now = Date.now();
  const cached = teamCache.get(teamKey);
  if (cached && cached.expires > now) return cached;
  const [simple, media] = await Promise.all([
    tbaFetch(`/team/${teamKey}/simple`),
    tbaFetch(`/team/${teamKey}/media/${year}`).catch(() => []),
  ]);
  const avatarMedia = (media || []).find(m => m.type === "avatar");
  const avatar = avatarMedia?.details?.base64Image
    ? `data:image/png;base64,${avatarMedia.details.base64Image}`
    : null;
  const flag = resolveFlag(simple.country, simple.state_prov);
  const entry = {
    key: teamKey,
    number: simple.team_number,
    nickname: simple.nickname,
    city: simple.city,
    state_prov: simple.state_prov,
    country: simple.country,
    avatar,
    flag,
    expires: now + TEAM_TTL_MS,
  };
  teamCache.set(teamKey, entry);
  return entry;
}

// ---------------- Bracket geometry (8-alliance double-elim) ----------------
// FIRST 2023+ playoff structure: 13 sf sets + 1 f set. Each match is identified
// by (comp_level, set_number, match_number=1). The schedule below gives the
// alliance seed pairing for upper-bracket round 1 and which prior matches feed
// each subsequent slot. We don't *predict* — we just slot in matches we have.
// Slot layout for the UI grid:
//   UB R1: sets 1,2,3,4   (alliances by seed)
//   LB R1: sets 5,6       (losers of UB R1)
//   UB R2: sets 7,8       (winners of UB R1)
//   LB R2: sets 9,10      (winners of LB R1 vs losers of UB R2)
//   UB F:  set 11         (winners of UB R2)
//   LB R3: set 12         (loser of UB F vs winner of LB R2)  -- wait, see below
//   LB F:  set 13         (winner LB R3 vs loser UB F)
//   GF:    f set 1 (best of 3, match_number 1..3)
// Actual TBA mapping verified against 2025arc:
//   sf 1: A1 vs A8     sf 2: A4 vs A5     sf 3: A2 vs A7     sf 4: A3 vs A6
//   sf 5: L1 vs L2     sf 6: L3 vs L4
//   sf 7: W1 vs W2     sf 8: W3 vs W4
//   sf 9: W5 vs L7     sf 10: W6 vs L8
//   sf 11: W7 vs W8     (upper final)
//   sf 12: W9 vs W10    (lower R3)
//   sf 13: L11 vs W12   (lower final)
//   f 1 (best of 3): W11 vs W13
export const BRACKET_SLOTS = [
  { id: "sf-1", level: "sf", set: 1, round: "UB R1" },
  { id: "sf-2", level: "sf", set: 2, round: "UB R1" },
  { id: "sf-3", level: "sf", set: 3, round: "UB R1" },
  { id: "sf-4", level: "sf", set: 4, round: "UB R1" },
  { id: "sf-5", level: "sf", set: 5, round: "LB R1" },
  { id: "sf-6", level: "sf", set: 6, round: "LB R1" },
  { id: "sf-7", level: "sf", set: 7, round: "UB R2" },
  { id: "sf-8", level: "sf", set: 8, round: "UB R2" },
  { id: "sf-9", level: "sf", set: 9, round: "LB R2" },
  { id: "sf-10", level: "sf", set: 10, round: "LB R2" },
  { id: "sf-11", level: "sf", set: 11, round: "UB Final" },
  { id: "sf-12", level: "sf", set: 12, round: "LB R3" },
  { id: "sf-13", level: "sf", set: 13, round: "LB Final" },
];

// ---------------- Event resolution ----------------
async function resolveEvent(eventKey, year) {
  const [event, alliancesRaw, matchesRaw] = await Promise.all([
    tbaFetch(`/event/${eventKey}`),
    tbaFetch(`/event/${eventKey}/alliances`).catch(() => []),
    tbaFetch(`/event/${eventKey}/matches`).catch(() => []),
  ]);

  const alliances = (alliancesRaw || []).map((a, i) => ({
    seed: i + 1,
    name: a.name,
    picks: a.picks,
    status: a.status?.status || "unknown",  // won, eliminated, playing
    record: a.status?.record,
    double_elim_round: a.status?.double_elim_round,
  }));

  // Collect every team key from alliances
  const allTeamKeys = new Set();
  for (const a of alliances) for (const t of a.picks) allTeamKeys.add(t);

  // Index matches by (level, set) and collect the GF (f set 1) matches
  const matchesByKey = {};
  const finals = [];
  for (const m of matchesRaw || []) {
    if (m.comp_level !== "sf" && m.comp_level !== "f") continue;
    const key = `${m.comp_level}-${m.set_number}`;
    if (m.comp_level === "f") {
      finals.push(m);
    } else {
      const prev = matchesByKey[key];
      if (!prev || (m.match_number > prev.match_number)) matchesByKey[key] = m;
    }
  }
  finals.sort((a, b) => a.match_number - b.match_number);

  function pickedTeams(match, color) {
    return (match?.alliances?.[color]?.team_keys) || [];
  }

  // Match → alliance seed lookup (find which alliance has these picks)
  function seedFor(teamKeys) {
    if (!teamKeys?.length) return null;
    const set = new Set(teamKeys);
    for (const a of alliances) {
      // first 3 picks are the playing alliance; backup is 4th
      const first3 = a.picks.slice(0, 3);
      const matchCount = first3.filter(t => set.has(t)).length;
      if (matchCount >= 2) return a.seed;
    }
    return null;
  }

  const slots = BRACKET_SLOTS.map(slot => {
    const m = matchesByKey[`sf-${slot.set}`];
    const red = pickedTeams(m, "red");
    const blue = pickedTeams(m, "blue");
    return {
      ...slot,
      played: !!m && !!m.winning_alliance,
      red: { seed: seedFor(red), teams: red, score: m?.alliances?.red?.score ?? null },
      blue: { seed: seedFor(blue), teams: blue, score: m?.alliances?.blue?.score ?? null },
      winner: m?.winning_alliance || null,  // 'red' | 'blue' | ''
      time: m?.actual_time || m?.predicted_time || null,
    };
  });

  // Grand Final (best of 3)
  const grandFinal = {
    games: finals.map(m => {
      const red = pickedTeams(m, "red");
      const blue = pickedTeams(m, "blue");
      return {
        match_number: m.match_number,
        played: !!m.winning_alliance,
        red: { seed: seedFor(red), teams: red, score: m.alliances.red.score },
        blue: { seed: seedFor(blue), teams: blue, score: m.alliances.blue.score },
        winner: m.winning_alliance || null,
        time: m.actual_time || m.predicted_time || null,
      };
    }),
  };

  return {
    key: eventKey,
    name: event.short_name || event.name,
    type: event.event_type,  // 3 = division, 4 = einstein
    teamKeys: [...allTeamKeys],
    alliances,
    slots,
    grandFinal,
  };
}

// ---------------- Master poll ----------------
let currentSnapshot = null;
let pollErrors = 0;
const sseClients = new Set();

function broadcast() {
  if (!currentSnapshot) return;
  const data = `data: ${JSON.stringify(currentSnapshot)}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch {}
  }
}

async function discoverEventKeys(year) {
  const events = await tbaFetch(`/events/${year}`);
  const divisions = events.filter(e => e.event_type === 3).map(e => e.key).sort();
  const einstein = events.find(e => e.event_type === 4)?.key || null;
  return { divisions, einstein };
}

async function buildSnapshot(year) {
  const { divisions, einstein } = await discoverEventKeys(year);
  const divisionEvents = await Promise.all(
    divisions.map(k => resolveEvent(k, year).catch(err => {
      console.error(`event ${k} failed:`, err.message);
      return null;
    }))
  );
  const einsteinEvent = einstein
    ? await resolveEvent(einstein, year).catch(err => {
        console.error(`einstein ${einstein} failed:`, err.message);
        return null;
      })
    : null;

  // Resolve team metadata for every team in any event
  const allTeamKeys = new Set();
  for (const ev of divisionEvents) if (ev) ev.teamKeys.forEach(t => allTeamKeys.add(t));
  if (einsteinEvent) einsteinEvent.teamKeys.forEach(t => allTeamKeys.add(t));

  // Limit concurrency on team lookups
  const teamKeysArr = [...allTeamKeys];
  const teams = {};
  const CONCURRENCY = 8;
  let idx = 0;
  async function worker() {
    while (idx < teamKeysArr.length) {
      const i = idx++;
      const k = teamKeysArr[i];
      try {
        const { expires, ...pub } = await getTeam(k, year);
        teams[k] = pub;
      } catch (e) {
        console.error(`team ${k} failed:`, e.message);
        teams[k] = { key: k, number: parseInt(k.replace("frc", ""), 10), nickname: "", flag: { kind: null, label: "" } };
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Reveal Einstein only when all 8 divisions are decided
  const allDivisionsDecided = divisionEvents.every(ev =>
    ev && ev.alliances.length >= 8 && ev.alliances.some(a => a.status === "won")
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

const TARGET_YEAR = parseInt(process.env.YEAR || String(new Date().getFullYear()), 10);

async function pollLoop() {
  try {
    const snap = await buildSnapshot(TARGET_YEAR);
    currentSnapshot = snap;
    pollErrors = 0;
    broadcast();
    console.log(`[poll] ok @ ${snap.updatedAt} (${Object.keys(snap.teams).length} teams, ${snap.divisions.filter(Boolean).length} divisions, einstein=${snap.einstein ? "yes" : "no"})`);
  } catch (e) {
    pollErrors++;
    console.error(`[poll] failed (#${pollErrors}):`, e.message);
  } finally {
    setTimeout(pollLoop, POLL_MS);
  }
}

// ---------------- HTTP ----------------
const app = express();
app.use(express.static("public", { maxAge: "1h" }));

app.get("/api/champs/:year", async (req, res) => {
  if (currentSnapshot && currentSnapshot.year === parseInt(req.params.year, 10)) {
    res.json(currentSnapshot);
  } else {
    res.status(503).json({ error: "snapshot not ready" });
  }
});

app.get("/api/champs/:year/stream", (req, res) => {
  if (parseInt(req.params.year, 10) !== TARGET_YEAR) {
    return res.status(404).end();
  }
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(": connected\n\n");
  if (currentSnapshot) {
    res.write(`data: ${JSON.stringify(currentSnapshot)}\n\n`);
  }
  sseClients.add(res);
  const ka = setInterval(() => { try { res.write(": ka\n\n"); } catch {} }, 25000);
  req.on("close", () => {
    clearInterval(ka);
    sseClients.delete(res);
  });
});

app.get("/healthz", (_req, res) => {
  res.json({
    ok: !!currentSnapshot,
    updatedAt: currentSnapshot?.updatedAt || null,
    pollErrors,
    sseClients: sseClients.size,
  });
});

app.listen(PORT, () => {
  console.log(`frc-champs-brackets listening on :${PORT}, year=${TARGET_YEAR}, poll=${POLL_MS}ms`);
  pollLoop();
});
