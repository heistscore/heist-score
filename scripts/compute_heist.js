const fs = require("fs");

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr, m) {
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function zScore(value, m, s) {
  if (!Number.isFinite(value) || !Number.isFinite(m) || !Number.isFinite(s) || s === 0) return 0;
  return (value - m) / s;
}

function loadRaw() {
  return JSON.parse(fs.readFileSync("data/raw.json", "utf8"));
}

function main() {
  const raw = loadRaw();
  const teams = raw.teams || [];

  // Pull arrays for first-pass z scoring of the components
  const ORs = teams.map(t => Number(t.ORpct)).filter(Number.isFinite);
  const DRs = teams.map(t => Number(t.DRpct)).filter(Number.isFinite);
  const DefTOs = teams.map(t => Number(t.DefTOpct)).filter(Number.isFinite);
  const OffTOs = teams.map(t => Number(t.OffTOpct)).filter(Number.isFinite);
  const eFGs = teams.map(t => Number(t.eFGpct)).filter(Number.isFinite);

  const mOR = mean(ORs), sOR = stddev(ORs, mOR);
  const mDR = mean(DRs), sDR = stddev(DRs, mDR);
  const mDefTO = mean(DefTOs), sDefTO = stddev(DefTOs, mDefTO);
  const mOffTO = mean(OffTOs), sOffTO = stddev(OffTOs, mOffTO);
  const meFG = mean(eFGs), seFG = stddev(eFGs, meFG);

  // 1) Build weighted heist_raw + zeFG for every team
  const interim = teams.map(t => {
    const ORpct = Number(t.ORpct);
    const DRpct = Number(t.DRpct);
    const DefTOpct = Number(t.DefTOpct);
    const OffTOpct = Number(t.OffTOpct);
    const eFGpct = Number(t.eFGpct);

    const zOR = zScore(ORpct, mOR, sOR);
    const zDR = zScore(DRpct, mDR, sDR);
    const zDefTO = zScore(DefTOpct, mDefTO, sDefTO);
    const zOffTO = zScore(OffTOpct, mOffTO, sOffTO);
    const zeFG = zScore(eFGpct, meFG, seFG);

    // Weighted components (your original philosophy)
    const heist_raw = 0.25 * zOR + 0.25 * zDR + 0.25 * zDefTO - 0.25 * zOffTO;

    return {
      team: String(t.team),
      confShort: t.confShort ?? null,
      confLong: t.confLong ?? null,

      ORpct: Number.isFinite(ORpct) ? ORpct : null,
      DRpct: Number.isFinite(DRpct) ? DRpct : null,
      DefTOpct: Number.isFinite(DefTOpct) ? DefTOpct : null,
      OffTOpct: Number.isFinite(OffTOpct) ? OffTOpct : null,
      eFGpct: Number.isFinite(eFGpct) ? eFGpct : null,

      heist_raw,
      zeFG
    };
  });

  // 2) Normalize heist_raw into a clean z-score (so "1.0" = 1 SD)
  const heistRawArr = interim.map(x => x.heist_raw);
  const mH = mean(heistRawArr);
  const sH = stddev(heistRawArr, mH);

  const computed = interim.map(x => {
    const heist = zScore(x.heist_raw, mH, sH);

    // Payday weight explicit (0.60/0.40)
    const payday = 0.60 * heist + 0.40 * x.zeFG;

    return {
      team: x.team,
      confShort: x.confShort,
      confLong: x.confLong,

      heist,
      payday,

      // keep the ingredients (optional but useful for debugging)
      heist_raw: x.heist_raw,
      eFG_z: x.zeFG,

      ORpct: x.ORpct,
      DRpct: x.DRpct,
      DefTOpct: x.DefTOpct,
      OffTOpct: x.OffTOpct,
      eFGpct: x.eFGpct
    };
  });

  const payload = {
    season: raw.season,
    updated_at: new Date().toISOString(),
    teams: computed
  };

  fs.writeFileSync("data/data.json", JSON.stringify(payload, null, 2));
  console.log("Wrote data/data.json with normalized Heist + weighted Payday (0.60/0.40).");
}

main();
