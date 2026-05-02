// SSE client with poll fallback. Renders all 8 division brackets + Einstein.

const YEAR = new Date().getFullYear();
document.getElementById("year").textContent = YEAR;

const statusEl = document.getElementById("status");
const updatedEl = document.getElementById("updated");
const divisionsEl = document.getElementById("divisions");
const einsteinEl = document.getElementById("einstein");
const einsteinWrap = document.getElementById("einstein-wrap");
const popover = document.getElementById("popover");

let state = null;

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = `status status-${cls}`;
}

// ---------- Render ----------

function renderBracket(eventData, isEinstein = false) {
  if (!eventData) {
    const d = document.createElement("div");
    d.className = "bracket empty";
    d.textContent = "No data";
    return d;
  }

  const winner = eventData.alliances.find(a => a.status === "won");

  const root = document.createElement("div");
  root.className = "bracket" + (isEinstein ? " einstein" : "");
  root.innerHTML = `
    <div class="title">
      <span>${escapeHtml(eventData.name)}</span>
      ${winner ? `<span class="winner-badge">A${winner.seed} won</span>` : ""}
    </div>
    <div class="layout"></div>
  `;
  const layout = root.querySelector(".layout");

  const slotsBySet = {};
  for (const s of eventData.slots) slotsBySet[s.set] = s;

  // 5 grid columns × 2 rows (top = UB, bottom = LB), plus right column for GF.
  // Render columns: UB R1, UB R2, UB F (split vertically with LB rows), GF
  // Simpler: 5 columns total, each with top + bottom panel.
  const cols = [
    { upper: [1,2,3,4], lower: [5,6], label: "R1" },
    { upper: [7,8], lower: [9,10], label: "R2" },
    { upper: [11], lower: [12], label: "R3 / UF" },
    { upper: [], lower: [13], label: "LF" },
    { upper: ["gf"], lower: [], label: "GF" },
  ];

  for (const col of cols) {
    const colEl = document.createElement("div");
    colEl.className = "col";
    const upWrap = document.createElement("div");
    upWrap.className = "col";
    upWrap.style.gap = "4px";
    for (const setNum of col.upper) {
      if (setNum === "gf") {
        upWrap.appendChild(renderGrandFinal(eventData));
      } else {
        upWrap.appendChild(renderMatch(slotsBySet[setNum], eventData));
      }
    }
    const downWrap = document.createElement("div");
    downWrap.className = "col";
    downWrap.style.gap = "4px";
    for (const setNum of col.lower) {
      downWrap.appendChild(renderMatch(slotsBySet[setNum], eventData));
    }
    colEl.appendChild(upWrap);
    colEl.appendChild(downWrap);
    layout.appendChild(colEl);
  }

  return root;
}

function renderMatch(slot, eventData) {
  const m = document.createElement("div");
  m.className = "match";
  if (!slot || (!slot.red.teams.length && !slot.blue.teams.length)) {
    m.classList.add("empty");
    m.innerHTML = `<div class="match-row"><span class="seed">—</span><span class="teams"></span></div><div class="match-row"><span class="seed">—</span><span class="teams"></span></div>`;
    return m;
  }
  m.appendChild(renderMatchRow(slot.red, "red", slot.winner === "red", slot.played, eventData));
  m.appendChild(renderMatchRow(slot.blue, "blue", slot.winner === "blue", slot.played, eventData));
  return m;
}

function renderMatchRow(side, color, isWinner, played, eventData) {
  const row = document.createElement("div");
  const eliminated = played && !isWinner;
  row.className = `match-row ${color}` + (isWinner ? " winner" : "") + (eliminated ? " loser" : "");
  const seed = side.seed ? `A${side.seed}` : "";
  const score = side.score != null && side.score >= 0 ? `<span class="score">${side.score}</span>` : "";
  row.innerHTML = `<span class="seed">${seed}</span><span class="teams"></span>${score}`;
  const teamsEl = row.querySelector(".teams");
  for (const tk of side.teams) teamsEl.appendChild(renderTeam(tk, eventData));
  return row;
}

function renderTeam(teamKey, eventData) {
  const t = state.teams[teamKey] || { number: parseInt(teamKey.replace("frc",""),10), nickname: "", flag: { kind: null } };
  const span = document.createElement("span");
  span.className = "team";
  span.dataset.teamKey = teamKey;
  const flagSpan = renderFlagSpan(t.flag);
  span.innerHTML = `<span class="num">${t.number}</span>`;
  if (flagSpan) span.appendChild(flagSpan);
  // Hover handlers — popover for team info
  span.addEventListener("mouseenter", e => showPopover(e, t));
  span.addEventListener("mousemove", movePopover);
  span.addEventListener("mouseleave", hidePopover);
  return span;
}

function renderFlagSpan(flag) {
  if (!flag || !flag.code) return null;
  const span = document.createElement("span");
  if (flag.kind === "country") {
    span.className = `fi fi-${flag.code}`;
  } else if (flag.kind === "state") {
    span.className = `fi fi-us-${flag.code}`;
  }
  span.title = flag.label;
  return span;
}

function renderGrandFinal(eventData) {
  const wrap = document.createElement("div");
  wrap.className = "gf";
  const games = eventData.grandFinal?.games || [];
  wrap.innerHTML = `<div class="gf-title">Grand Final (Bo3)</div>`;
  if (!games.length) {
    wrap.innerHTML += `<div style="color:var(--fg-2);font-size:10px">pending</div>`;
    return wrap;
  }
  for (const g of games) {
    const line = document.createElement("div");
    line.className = "gf-game";
    line.innerHTML = `<span class="label">G${g.match_number}</span>`;
    const redSide = document.createElement("span");
    redSide.className = "side" + (g.winner === "red" ? " winner" : (g.played ? " loser" : ""));
    redSide.appendChild(seedBadge(g.red, "red"));
    if (g.red.score != null) {
      const s = document.createElement("span");
      s.className = "score";
      s.textContent = ` ${g.red.score}`;
      redSide.appendChild(s);
    }
    const sep = document.createElement("span");
    sep.textContent = " vs ";
    sep.style.color = "var(--fg-2)";
    const blueSide = document.createElement("span");
    blueSide.className = "side" + (g.winner === "blue" ? " winner" : (g.played ? " loser" : ""));
    blueSide.appendChild(seedBadge(g.blue, "blue"));
    if (g.blue.score != null) {
      const s = document.createElement("span");
      s.className = "score";
      s.textContent = ` ${g.blue.score}`;
      blueSide.appendChild(s);
    }
    line.appendChild(redSide);
    line.appendChild(sep);
    line.appendChild(blueSide);
    wrap.appendChild(line);
  }
  return wrap;
}

function seedBadge(side, color) {
  const span = document.createElement("span");
  span.style.borderLeft = `2px solid var(--${color})`;
  span.style.paddingLeft = "3px";
  span.textContent = side.seed ? `A${side.seed}` : "—";
  return span;
}

// ---------- Popover ----------

function showPopover(e, team) {
  popover.innerHTML = "";
  if (team.avatar) {
    const img = document.createElement("img");
    img.className = "avatar";
    img.src = team.avatar;
    popover.appendChild(img);
  }
  const body = document.createElement("div");
  body.className = "body";
  body.innerHTML = `
    <div><span class="num">${team.number}</span> <span class="name">${escapeHtml(team.nickname || "")}</span></div>
    <div class="loc">${escapeHtml([team.city, team.state_prov, team.country].filter(Boolean).join(", "))}</div>
  `;
  popover.appendChild(body);
  popover.hidden = false;
  movePopover(e);
}
function movePopover(e) {
  const offset = 14;
  const w = popover.offsetWidth;
  const h = popover.offsetHeight;
  let x = e.clientX + offset;
  let y = e.clientY + offset;
  if (x + w > window.innerWidth) x = e.clientX - w - offset;
  if (y + h > window.innerHeight) y = e.clientY - h - offset;
  popover.style.left = x + "px";
  popover.style.top = y + "px";
}
function hidePopover() { popover.hidden = true; }

// ---------- Render entrypoint ----------

function render() {
  if (!state) return;
  document.getElementById("year").textContent = state.year;
  updatedEl.textContent = `updated ${new Date(state.updatedAt).toLocaleTimeString()}`;

  divisionsEl.innerHTML = "";
  for (const ev of state.divisions || []) {
    divisionsEl.appendChild(renderBracket(ev, false));
  }

  if (state.revealEinstein && state.einstein) {
    einsteinEl.innerHTML = "";
    einsteinEl.appendChild(renderBracket(state.einstein, true));
    einsteinWrap.hidden = false;
  } else {
    einsteinWrap.hidden = true;
  }
}

// ---------- Helpers ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
}

// ---------- Wire up SSE / fallback ----------

function connect() {
  const url = `/api/champs/${YEAR}/stream`;
  const es = new EventSource(url);
  setStatus("connecting…", "pending");
  es.onopen = () => setStatus("live", "live");
  es.onmessage = e => {
    try {
      state = JSON.parse(e.data);
      render();
    } catch (err) { console.error("parse", err); }
  };
  es.onerror = () => {
    setStatus("reconnecting…", "error");
    // EventSource auto-reconnects; if it's hard-closed, fall back to polling.
    if (es.readyState === EventSource.CLOSED) {
      setTimeout(connect, 5000);
    }
  };
}

// Poll fallback (only used if SSE never opens — just in case)
async function pollOnce() {
  try {
    const r = await fetch(`/api/champs/${YEAR}`);
    if (r.ok) {
      state = await r.json();
      render();
      setStatus("polling", "live");
    }
  } catch (e) { setStatus("offline", "error"); }
}

// Initial best-effort poll for first paint while SSE handshakes
pollOnce();
connect();
