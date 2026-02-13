const fs = require("fs");

function asPct(x) {
  // KenPom might return percent as 33.4 OR decimal as 0.334
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? n * 100 : n;
}

async function main() {
  const API_KEY = process.env.KENPOM_API_KEY;
  if (!API_KEY) {
    throw new Error("Missing KENPOM_API_KEY env var (set as GitHub Actions secret).");
  }

  // KenPom uses ending-year season like 2026 for 2025-26
  const SEASON = process.env.SEASON || String(new Date().getFullYear());

  const url = `https://kenpom.com/api.php?endpoint=four-factors&y=${encodeURIComponent(SEASON)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`KenPom API error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const rows = await res.json();

  // Convert KenPom -> our raw format (now includes eFG%)
  const teams = rows
    .map(r => ({
      team: r.TeamName,
      ORpct: asPct(r.OR_Pct),
      DRpct: asPct(r.DOR_Pct),
      DefTOpct: asPct(r.DTO_Pct),
      OffTOpct: asPct(r.TO_Pct),
      eFGpct: asPct(r.eFG_Pct), // <-- NEW (for Payday)
    }))
    .filter(t =>
      t.team &&
      [t.ORpct, t.DRpct, t.DefTOpct, t.OffTOpct, t.eFGpct].every(v => Number.isFinite(v))
    );

  const payload = {
    season: Number(SEASON),
    updated_at: new Date().toISOString(),
    teams,
  };

  fs.writeFileSync("data/raw.json", JSON.stringify(payload, null, 2));
  console.log(`Wrote data/raw.json for season ${SEASON} with ${teams.length} teams`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
