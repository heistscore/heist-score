/**
 * scripts/fetch_kp.js
 *
 * Fetches KenPom data needed for Heist/Payday and writes data/raw.json
 * Adds conference fields via `teams` + `conferences` endpoints.
 *
 * Required env (either works):
 *   KENPOM_API_KEY  (GitHub Secret)
 *   KP_API_KEY      (GitHub Secret)  <-- allowed for backwards compatibility
 *
 * Optional env:
 *   KP_SEASON   (ending year, e.g. 2026). If omitted, defaults to current year.
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = "https://kenpom.com/api.php";

function getSeasonYear() {
  const envY = process.env.KP_SEASON;
  if (envY && Number.isFinite(Number(envY))) return Number(envY);
  return new Date().getFullYear();
}

function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  return sp.toString();
}

async function kpFetch(endpoint, params = {}) {
  // ✅ Accept either secret name
  const apiKey = process.env.KENPOM_API_KEY || process.env.KP_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing KENPOM_API_KEY (or KP_API_KEY) env var (set as GitHub Secret)."
    );
  }

  const url = `${BASE_URL}?${qs({ endpoint, ...params })}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`KenPom fetch failed (${res.status}) ${endpoint} ${url}\n${text}`);
  }

  return await res.json();
}

function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function safeArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.teams)) return payload.teams;
  return [];
}

async function main() {
  const y = getSeasonYear();

  // 1) Four Factors
  const ffPayload = await kpFetch("four-factors", { y });
  const ffRows = safeArray(ffPayload);

  // 2) Teams (TeamName + ConfShort + TeamID)
  const teamsPayload = await kpFetch("teams", { y });
  const teamRows = safeArray(teamsPayload);

  // 3) Conferences (ConfShort => ConfLong)
  const confPayload = await kpFetch("conferences", { y });
  const confRows = safeArray(confPayload);

  const confLongByShort = {};
  confRows.forEach((c) => {
    const short = c.ConfShort ?? c.confShort ?? c.conf ?? c.short;
    const long = c.ConfLong ?? c.confLong ?? c.name ?? c.long;
    if (short) confLongByShort[String(short)] = long ? String(long) : "";
  });

  const teamInfoByName = {};
  teamRows.forEach((t) => {
    const name = t.TeamName ?? t.team ?? t.name;
    if (!name) return;
    const confShort = t.ConfShort ?? t.confShort ?? "";
    const teamId = t.TeamID ?? t.team_id ?? t.id ?? null;

    teamInfoByName[String(name)] = {
      team: String(name),
      team_id: teamId,
      confShort: confShort ? String(confShort) : "",
      confLong: confShort ? (confLongByShort[String(confShort)] || "") : "",
    };
  });

  const teams = ffRows
    .map((r) => {
      const team = r.TeamName ?? r.team ?? r.name;
      if (!team) return null;

      const eFGpct = toNum(r.eFG_Pct);
      const OffTOpct = toNum(r.TO_Pct);
      const ORpct = toNum(r.OR_Pct);

      const DefTOpct = toNum(r.DTO_Pct);
      const DRpct = toNum(r.DOR_Pct);

      const info = teamInfoByName[String(team)] || {
        team: String(team),
        team_id: null,
        confShort: "",
        confLong: "",
      };

      return {
        team: String(team),
        ORpct,
        DRpct,
        DefTOpct,
        OffTOpct,
        eFGpct,
        confShort: info.confShort || null,
        confLong: info.confLong || null,
        team_id: info.team_id ?? null,
      };
    })
    .filter(Boolean);

  const out = {
    season: y,
    updated_at: new Date().toISOString(),
    teams,
  };

  const outPath = path.join("data", "raw.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outPath} with ${teams.length} teams (with confShort/confLong)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
