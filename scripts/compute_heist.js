/**
 * scripts/compute_heist.js
 *
 * Reads data/raw.json (from KenPom)
 * Computes Heist + Payday (weighted eFG)
 * Writes data/data.json
 */

const fs = require("fs");

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr, m) {
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function zScore(value, m, s) {
  if (!Number.isFinite(value) || s === 0) return 0;
  return (value - m) / s;
}

function loadRaw() {
  return JSON.parse(fs.readFileSync("data/raw.json", "utf8"));
}

function main() {
  const raw = loadRaw();
  const teams = raw.teams || [];

  // Weight for Payday (shot-making)
  const EFG_WEIGHT = 0.6;

  // Collect arrays for normalization
  const ORs = teams.map(t => t.ORpct);
  const DRs = teams.map(t => t.DRpct);
  const DefTOs = teams.map(t => t.DefTOpct);
  const OffTOs = teams.map(t => t.OffTOpct);
  const eFGs = teams.map(t => t.eFGpct);

  // Means
  const mOR = mean(ORs);
  const mDR = mean(DRs);
  const mDefTO = mean(DefTOs);
  const mOffTO = mean(OffTOs);
  const meFG = mean(eFGs);

  // Std devs
  const sOR = stddev(ORs, mOR);
  const sDR = stddev(DRs, mDR);
  const sDefTO = stddev(DefTOs, mDefTO);
  const sOffTO = stddev(OffTOs, mOffTO);
  const seFG = stddev(eFGs, meFG);

  const computed = teams.map(t => {
    const zOR = zScore(t.ORpct, mOR, sOR);
    const zDR = zScore(t.DRpct, mDR, sDR);
    const zDefTO = zScore(t.DefTOpct, mDefTO, sDefTO);
    const zOffTO = zScore(t.OffTOpct, mOffTO, sOffTO);
    const zeFG = zScore(t.eFGpct, meFG, seFG);

    // raw possession control
    const heist_raw = zOR + zDR + zDefTO - zOffTO;

    // normalize heist_raw itself (optional) — BUT you already like current scale,
    // so we keep "heist" as raw z-sum.
    const heist = heist_raw;

    // Payday: explicit weight on shotmaking
    const payday = heist_raw + (EFG_WEIGHT * zeFG);

    return {
      team: t.team,

      // metrics
      heist,
      payday,

      // inputs
      ORpct: t.ORpct,
      DRpct: t.DRpct,
      DefTOpct: t.DefTOpct,
      OffTOpct: t.OffTOpct,
      eFGpct: t.eFGpct,

      // conference metadata (THIS IS THE IMPORTANT PART)
      confShort: t.confShort || null,
      confLong: t.confLong || null
    };
  });

  const payload = {
    season: raw.season,
    updated_at: new Date().toISOString(),
    teams: computed
  };

  fs.writeFileSync("data/data.json", JSON.stringify(payload, null, 2));
  console.log("Wrote data/data.json with Heist + Payday + conferences");
}

main();
