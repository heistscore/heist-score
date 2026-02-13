function band(score) {
  if (score >= 1.0) return "Elite";
  if (score >= 0.5) return "Strong";
  if (score <= -0.5) return "Below";
  return "Neutral";
}

function bandClass(score) {
  if (score >= 1.0) return "elite";
  if (score >= 0.5) return "strong";
  if (score <= -0.5) return "below";
  return "neutral";
}

function pctLabelFromRank(rankIndex, total) {
  if (total <= 1) return "—";
  const pct = Math.round(((total - rankIndex) / total) * 100);
  const mod10 = pct % 10;
  const mod100 = pct % 100;
  let suf = "th";
  if (mod10 === 1 && mod100 !== 11) suf = "st";
  else if (mod10 === 2 && mod100 !== 12) suf = "nd";
  else if (mod10 === 3 && mod100 !== 13) suf = "rd";
  return `${pct}${suf}`;
}

function setActive(btn, on) {
  if (!btn) return;
  btn.classList.toggle("active", !!on);
}

// ---------- fallback color helpers (only used if JSON missing a team) ----------
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (v) => {
    const n = Math.round((v + m) * 255);
    return n.toString(16).padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function autoTeamColor(teamName) {
  const h = hashString(teamName);
  const hue = h % 360;
  return hslToHex(hue, 70, 42);
}

async function loadJson(path) {
  const res = await fetch(`${path}?ts=${Date.now()}`);
  if (!res.ok) return null;
  return await res.json();
}

function getTeamColor(teamName, colorMap) {
  const c = colorMap?.[teamName];
  if (typeof c === "string" && c.startsWith("#") && c.length === 7) return c;
  return autoTeamColor(teamName);
}

// ---------- render ----------
function render(rowsEl, teamsToShow, fullSorted, metricKey, colorMap) {
  rowsEl.innerHTML = "";
  const total = fullSorted.length;

  teamsToShow.forEach((t) => {
    const rankIndex = fullSorted.findIndex(x => x.team === t.team);
    const pct = rankIndex >= 0 ? pctLabelFromRank(rankIndex, total) : "—";

    const val = Number(t[metricKey]);
    const row = document.createElement("div");
    row.className = `row ${bandClass(val)}`;

    row.style.setProperty("--team", getTeamColor(t.team, colorMap));

    row.innerHTML = `
      <div>${rankIndex >= 0 ? rankIndex + 1 : ""}</div>
      <div class="teamcell"><span class="teamname">${t.team}</span></div>
      <div class="score">${Number.isFinite(val) ? val.toFixed(2) : "--"}</div>
      <div class="pct">${pct}</div>
      <div class="band">${band(val)}</div>
    `;

    rowsEl.appendChild(row);
  });
}

async function main() {
  const rowsEl = document.getElementById("rows");
  const meta = document.getElementById("meta");

  const btnHeist = document.getElementById("btnHeist");
  const btnPayday = document.getElementById("btnPayday");
  const btn25 = document.getElementById("btn25");
  const btn50 = document.getElementById("btn50");
  const btn100 = document.getElementById("btn100");
  const btnAll = document.getElementById("btnAll");
  const searchEl = document.getElementById("search");

  // Load colors (single file)
  const colorMap = (await loadJson("./data/team_primary_colors.json")) || {};

  // Load leaderboard data
  const res = await fetch(`./data/data.json?ts=${Date.now()}`);
  const payload = await res.json();
  if (meta) meta.textContent = `Updated: ${payload.updated_at}`;

  const data = payload.teams || [];

  let metricKey = "heist";
  let limit = 25;
  let query = "";

  function getSorted() {
    return [...data].sort((a, b) => Number(b[metricKey]) - Number(a[metricKey]));
  }

  function getFiltered(sorted) {
    if (!query) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(t => String(t.team).toLowerCase().includes(q));
  }

  function rerender() {
    const sorted = getSorted();
    const filtered = getFiltered(sorted);
    const sliced = Number.isFinite(limit) ? filtered.slice(0, limit) : filtered;
    render(rowsEl, sliced, sorted, metricKey, colorMap);
  }

  btnHeist?.addEventListener("click", () => {
    metricKey = "heist";
    setActive(btnHeist, true);
    setActive(btnPayday, false);
    rerender();
  });

  btnPayday?.addEventListener("click", () => {
    metricKey = "payday";
    setActive(btnHeist, false);
    setActive(btnPayday, true);
    rerender();
  });

  btn25?.addEventListener("click", () => {
    limit = 25;
    setActive(btn25, true); setActive(btn50, false); setActive(btn100, false); setActive(btnAll, false);
    rerender();
  });

  btn50?.addEventListener("click", () => {
    limit = 50;
    setActive(btn25, false); setActive(btn50, true); setActive(btn100, false); setActive(btnAll, false);
    rerender();
  });

  btn100?.addEventListener("click", () => {
    limit = 100;
    setActive(btn25, false); setActive(btn50, false); setActive(btn100, true); setActive(btnAll, false);
    rerender();
  });

  btnAll?.addEventListener("click", () => {
    limit = Infinity;
    setActive(btn25, false); setActive(btn50, false); setActive(btn100, false); setActive(btnAll, true);
    rerender();
  });

  searchEl?.addEventListener("input", () => {
    query = searchEl.value.trim();
    rerender();
  });

  // Default active
  setActive(btnHeist, true);
  setActive(btn25, true);

  rerender();
}

main().catch(err => {
  console.error(err);
  const rowsEl = document.getElementById("rows");
  if (rowsEl) {
    rowsEl.innerHTML = `<div class="row below">
      <div></div>
      <div>Failed to load data.json / team_primary_colors.json</div>
      <div class="score">--</div>
      <div class="pct">--</div>
      <div class="band">Error</div>
    </div>`;
  }
});
