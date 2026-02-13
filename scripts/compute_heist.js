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
  const teams = raw.teams;

  // ---- Inputs (percentages) ----
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

  // First pass: compute raw heist + eFG z
  const interim = teams.map(t => {
    const zOR = zScore(t.ORpct, mOR, sOR);
    const zDR = zScore(t.DRpct, mDR, sDR);
    const zDefTO = zScore(t.DefTOpct, mDefTO, sDefTO);
    const zOffTO = zScore(t.OffTOpct, mOffTO, sOffTO);
    const zeFG = zScore(t.eFGpct, meFG, seFG);

    // "Raw" heist (sum of standardized parts)
    const heist_raw = zOR + zDR + zDefTO - zOffTO;

    return {
      team: t.team,
      heist_raw,
      zeFG,
      ORpct: t.ORpct,
      DRpct: t.DRpct,
      DefTOpct: t.DefTOpct,
      OffTOpct: t.OffTOpct,
      eFGpct: t.eFGpct
    };
  });

  // Normalize heist_raw so Heist is also a true z-score (mean 0, sd 1)
  const heistRawArr = interim.map(t => t.heist_raw);
  const mHeist = mean(heistRawArr);
  const sHeist = stddev(heistRawArr, mHeist);

  const EFG_WEIGHT = 0.6;

  const computed = interim.map(t => {
    const heist = zScore(t.heist_raw, mHeist, sHeist);   // zHeist
    const payday = heist + EFG_WEIGHT * t.zeFG;

    return {
      team: t.team,
      heist,
      payday,
      // keep these so you can debug + build future filters/views
      ORpct: t.ORpct,
      DRpct: t.DRpct,
      DefTOpct: t.DefTOpct,
      OffTOpct: t.OffTOpct,
      eFGpct: t.eFGpct,
      // optional debug fields (handy for sanity checks)
      heist_raw: t.heist_raw,
      zeFG: t.zeFG,
      efg_weight: EFG_WEIGHT
    };
  });

  const payload = {
    season: raw.season,
    updated_at: new Date().toISOString(),
    teams: computed
  };

  fs.writeFileSync("data/data.json", JSON.stringify(payload, null, 2));
  console.log("Wrote data/data.json with normalized Heist + Payday (eFG weight 0.6)");
}

main();
