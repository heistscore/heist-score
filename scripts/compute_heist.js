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

function num(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : NaN;
}

function loadRaw() {
  return JSON.parse(fs.readFileSync("data/raw.json", "utf8"));
}

function main() {
  const raw = loadRaw();
  const teams = raw.teams;

  // Collect arrays for normalization (convert to numbers + filter NaNs just in case)
  const ORs = teams.map(t => num(t.ORpct)).filter(Number.isFinite);
  const DRs = teams.map(t => num(t.DRpct)).filter(Number.isFinite);
  const DefTOs = teams.map(t => num(t.DefTOpct)).filter(Number.isFinite);
  const OffTOs = teams.map(t => num(t.OffTOpct)).filter(Number.isFinite);
  const eFGs = teams.map(t => num(t.eFGpct)).filter(Number.isFinite);

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

  // Step 1: compute RAW (summed) scores
  const withRaw = teams.map(t => {
    const ORpct = num(t.ORpct);
    const DRpct = num(t.DRpct);
    const DefTOpct = num(t.DefTOpct);
    const OffTOpct = num(t.OffTOpct);
    const eFGpct = num(t.eFGpct);

    const zOR = zScore(ORpct, mOR, sOR);
    const zDR = zScore(DRpct, mDR, sDR);
    const zDefTO = zScore(DefTOpct, mDefTO, sDefTO);
    const zOffTO = zScore(OffTOpct, mOffTO, sOffTO);
    const zeFG = zScore(eFGpct, meFG, seFG);

    // Raw Heist = possession control (sum)
    const heist_raw = zOR + zDR + zDefTO - zOffTO;

    // Raw Payday = heist + shot-making (sum)
    const payday_raw = heist_raw + zeFG;

    return {
      team: t.team,
      ORpct, DRpct, DefTOpct, OffTOpct, eFGpct,
      heist_raw,
      payday_raw
    };
  });

  // Step 2: re-normalize RAW scores so the final outputs are clean z-scores
  const heistRawArr = withRaw.map(t => t.heist_raw).filter(Number.isFinite);
  const paydayRawArr = withRaw.map(t => t.payday_raw).filter(Number.isFinite);

  const mHeist = mean(heistRawArr);
  const sHeist = stddev(heistRawArr, mHeist);

  const mPayday = mean(paydayRawArr);
  const sPayday = stddev(paydayRawArr, mPayday);

  const computed = withRaw.map(t => {
    const heist = zScore(t.heist_raw, mHeist, sHeist);
    const payday = zScore(t.payday_raw, mPayday, sPayday);

    return {
      team: t.team,

      // Final, display-ready metrics (these will no longer hit crazy 7s often)
      heist,
      payday,

      // Keep these for transparency/debugging (optional but helpful)
      heist_raw: t.heist_raw,
      payday_raw: t.payday_raw,

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
  console.log("Wrote data/data.json with normalized Heist + Payday");
}

main();
