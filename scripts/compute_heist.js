// scripts/compute_heist.js
// Computes:
// - z-scored components for OR%, DR%, DefTO%, OffTO%
// - heist_raw = 0.25*zOR + 0.25*zDR + 0.25*zDefTO - 0.25*zOffTO
// - heist = z(heist_raw)
// - payday_raw = 0.60*heist + 0.40*z(eFG%)
// - payday = z(payday_raw)   <-- NEW: normalize payday for a clean SD scale

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

function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function main() {
  const raw = loadRaw();
  const teams = raw.teams || [];

  // Collect arrays for component normalization
  const ORs = teams.map(t => toNum(t.ORpct)).filter(Number.isFinite);
  const DRs = teams.map(t => toNum(t.DRpct)).filter(Number.isFinite);
  const DefTOs = teams.map(t => toNum(t.DefTOpct)).filter(Number.isFinite);
  const OffTOs = teams.map(t => toNum(t.OffTOpct)).filter(Number.isFinite);
  const eFGs = teams.map(t => toNum(t.eFGpct)).filter(Number.isFinite);

  const mOR = mean(ORs), sOR = stddev(ORs, mOR);
  const mDR = mean(DRs), sDR = stddev(DRs, mDR);
  const mDefTO = mean(DefTOs), sDefTO = stddev(DefTOs, mDefTO);
  const mOffTO = mean(OffTOs), sOffTO = stddev(OffTOs, mOffTO);
  const meFG = mean(eFGs), seFG = stddev(eFGs, meFG);

  // 1) Build heist_raw and zeFG for each team
  const interim = teams.map(t => {
    const ORpct = toNum(t.ORpct);
    const DRpct = toNum(t.DRpct);
    const DefTOpct = toNum(t.DefTOpct);
    const OffTOpct = toNum(t.OffTOpct);
    const eFGpct = toNum(t.eFGpct);

    const zOR = zScore(ORpct ?? NaN, mOR, sOR);
    const zDR = zScore(DRpct ?? NaN, mDR, sDR);
    const zDefTO = zScore(DefTOpct ?? NaN, mDefTO, sDefTO);
    const zOffTO = zScore(OffTOpct ?? NaN, mOffTO, sOffTO);
    const zeFG = zScore(eFGpct ?? NaN, meFG, seFG);

    const heist_raw = 0.25 * zOR + 0.25 * zDR + 0.25 * zDefTO - 0.25 * zOffTO;

    return {
      team: String(t.team),
      confShort: t.confShort ?? null,
      confLong: t.confLong ?? null,

      ORpct,
      DRpct,
      DefTOpct,
      OffTOpct,
      eFGpct,

      heist_raw,
      zeFG
    };
  });

  // 2) Normalize heist_raw -> heist z-score
  const heistRawArr = interim.map(x => x.heist_raw);
  const mH = mean(heistRawArr);
  const sH = stddev(heistRawArr, mH);

  const withHeist = interim.map(x => {
    const heist = zScore(x.heist_raw, mH, sH);
    const payday_raw = 0.60 * heist + 0.40 * x.zeFG;
    return { ...x, heist, payday_raw };
  });

  // 3) Normalize payday_raw -> payday z-score (NEW)
  const paydayRawArr = withHeist.map(x => x.payday_raw);
  const mP = mean(paydayRawArr);
  const sP = stddev(paydayRawArr, mP);

  const computed = withHeist.map(x => {
    const payday = zScore(x.payday_raw, mP, sP);

    return {
      team: x.team,
      confShort: x.confShort,
      confLong: x.confLong,

      heist: x.heist,
      payday,

      // keep these for debugging / transparency (optional)
      heist_raw: x.heist_raw,
      payday_raw: x.payday_raw,
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
  console.log("Wrote data/data.json with normalized Heist + normalized Payday.");
}

main();
