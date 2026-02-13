// app.js
// Renders Heist / Payday leaderboard with search + conference filter
// Ensures rows have 5 columns to match the header grid:
// RANK | TEAM | SCORE | PCT | BAND

const $ = (sel) => document.querySelector(sel);

const rowsEl = $("#rows");
const metaEl = $("#meta");

const btnHeist = $("#btnHeist");
const btnPayday = $("#btnPayday");
const btn25 = $("#btn25");
const btn50 = $("#btn50");
const btn100 = $("#btn100");
const btnAll = $("#btnAll");

const confSel = $("#conf");
const searchEl = $("#search");

let DATA = null;

let mode = "heist";        // "heist" | "payday"
let limit = 25;            // 25 | 50 | 100 | Infinity
let conf = "ALL";
let q = "";

// ---------- helpers ----------
function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function ordinal(n) {
  // 1 -> 1st, 2 -> 2nd, 3 -> 3rd ... 11 -> 11th, 12 -> 12th, 13 -> 13th
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function bandFromPct(p) {
  if (p >= 95) return "Elite";
  if (p >= 80) return "Strong";
  if (p >= 50) return "Average";
  return "Below";
}

function rowClassFromBand(b) {
  const x = String(b || "").toLowerCase();
  if (x === "elite") return "elite";
  if (x === "strong") return "strong";
  if (x === "below") return "below";
  return "neutral";
}

function setActive(btn, on) {
  btn.classList.toggle("active", !!on);
}

function scoreKey() {
  // Support a few possible field names depending on your compute script
  // Prefer exact mode-named fields if they exist.
  return mode; // expects t.heist / t.payday
}

function getScore(teamObj) {
  const k = scoreKey();
  if (teamObj && teamObj[k] != null) return toNum(teamObj[k]);

  // fallbacks (in case compute script uses different names)
  if (mode === "heist") return toNum(teamObj.heistScore ?? teamObj.score ?? teamObj.heist);
  return toNum(teamObj.paydayScore ?? teamObj.score ?? teamObj.payday);
}

function getConf(teamObj) {
  return teamObj.confShort || teamObj.conf || teamObj.conference || "";
}

// ---------- ranking / pct ----------
function buildRankAndPctMaps(teams) {
  const n = teams.length;

  // rank map per mode so conference filter keeps original ranks like your screenshot
  const sorted = [...teams].sort((a, b) => getScore(b) - getScore(a));
  const rankByTeam = new Map();

  sorted.forEach((t, i) => {
    rankByTeam.set(t.team, i + 1);
  });

  const pctByTeam = new Map();
  sorted.forEach((t, i) => {
    // percentile: best team ~ 100, worst ~ 1
    const rank = i + 1;
    const pct = n <= 1 ? 100 : Math.round((1 - (rank - 1) / (n - 1)) * 100);
    pctByTeam.set(t.team, pct);
  });

  return { rankByTeam, pctByTeam };
}

// ---------- render ----------
function render() {
  if (!DATA) return;

  const teams = DATA.teams || [];
  const { rankByTeam, pctByTeam } = buildRankAndPctMaps(teams);

  // filters
  const qq = q.trim().toLowerCase();
  let filtered = teams.filter((t) => {
    if (conf !== "ALL") {
      const c = getConf(t);
      if (c !== conf) return false;
    }
    if (qq) {
      const name = String(t.team || "").toLowerCase();
      if (!name.includes(qq)) return false;
    }
    return true;
  });

  // sort by current mode score
  filtered.sort((a, b) => getScore(b) - getScore(a));

  // apply limit
  if (limit !== Infinity) filtered = filtered.slice(0, limit);

  // build rows
  rowsEl.innerHTML = "";

  for (const t of filtered) {
    const teamName = String(t.team || "");
    const rank = rankByTeam.get(teamName) ?? "";
    const score = getScore(t);

    // pct/band: use existing data if present, otherwise compute
    const pctNum = t.pct != null ? Number(t.pct) : (pctByTeam.get(teamName) ?? 0);
    const pctLabel = t.pctLabel || ordinal(pctNum);
    const band = t.band || bandFromPct(pctNum);

    const row = document.createElement("div");
    row.className = `row ${rowClassFromBand(band)}`;

    // IMPORTANT: 5 separate cells (this fixes your PCT/BAND squish)
    row.innerHTML = `
      <div>${rank}</div>
      <div class="teamcell"><span class="teamname">${escapeHtml(teamName)}</span></div>
      <div class="right score">${score.toFixed(2)}</div>
      <div class="right pct">${escapeHtml(pctLabel)}</div>
      <div class="right band">${escapeHtml(band)}</div>
    `;

    rowsEl.appendChild(row);
  }

  // meta
  if (metaEl && DATA.updated_at) {
    metaEl.textContent = `Updated: ${DATA.updated_at}`;
  }
}

// ---------- populate conf dropdown ----------
function populateConferences() {
  const teams = DATA.teams || [];
  const confs = new Set();

  teams.forEach((t) => {
    const c = getConf(t);
    if (c) confs.add(c);
  });

  const list = Array.from(confs).sort((a, b) => a.localeCompare(b));
  confSel.innerHTML = `<option value="ALL">All Conferences</option>` + list.map(c => {
    return `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`;
  }).join("");
}

// ---------- events ----------
function setMode(newMode) {
  mode = newMode;
  setActive(btnHeist, mode === "heist");
  setActive(btnPayday, mode === "payday");
  render();
}

function setLimit(newLimit) {
  limit = newLimit;
  setActive(btn25, limit === 25);
  setActive(btn50, limit === 50);
  setActive(btn100, limit === 100);
  setActive(btnAll, limit === Infinity);
  render();
}

btnHeist?.addEventListener("click", () => setMode("heist"));
btnPayday?.addEventListener("click", () => setMode("payday"));

btn25?.addEventListener("click", () => setLimit(25));
btn50?.addEventListener("click", () => setLimit(50));
btn100?.addEventListener("click", () => setLimit(100));
btnAll?.addEventListener("click", () => setLimit(Infinity));

confSel?.addEventListener("change", (e) => {
  conf = e.target.value;
  render();
});

searchEl?.addEventListener("input", (e) => {
  q = e.target.value || "";
  render();
});

// ---------- load ----------
async function load() {
  const res = await fetch("./data/data.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load data/data.json");
  DATA = await res.json();

  populateConferences();
  render();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', "&quot;");
}

load().catch((err) => {
  console.error(err);
  rowsEl.innerHTML = `<div style="padding:14px;color:rgba(255,255,255,.8)">Error loading data.</div>`;
});
