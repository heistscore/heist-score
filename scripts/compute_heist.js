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
  const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf8"));
  return raw;
}

function main() {
  const raw = loadRaw();
  const teams = raw.teams;

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

    // Heist = possession control
    const heist = zOR + zDR + zDefTO - zOffTO;

    // Payday = possession control + shot-making
    const payday = heist + zeFG;

    return {
      team: t.team,
      heist,
      payday,
      ORpct: t.ORpct,
      DRpct: t.DRpct,
      DefTOpct: t.DefTOpct,
      OffTOpct: t.OffTOpct,
      eFGpct: t.eFGpct
    };
  });

  const payload = {
    season: raw.season,
    updated_at: new Date().toISOString(),
    teams: computed
  };

  fs.writeFileSync("data/data.json", JSON.stringify(payload, null, 2));
  console.log("Wrote data/data.json with Heist + Payday");
}

main();
