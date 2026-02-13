const fs = require("fs");

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr) {
  const m = mean(arr);
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
  return Math.sqrt(v) || 1;
}

function zscores(arr) {
  const m = mean(arr);
  const s = std(arr);
  return arr.map(x => (x - m) / s);
}

function main() {
  const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf8"));
  const teams = raw.teams;

  const OR = teams.map(t => Number(t.ORpct));
  const DR = teams.map(t => Number(t.DRpct));
  const DefTO = teams.map(t => Number(t.DefTOpct));
  const OffTO = teams.map(t => Number(t.OffTOpct));

  const zOR = zscores(OR);
  const zDR = zscores(DR);
  const zDefTO = zscores(DefTO);
  const zOffTO = zscores(OffTO);

  const outTeams = teams.map((t, i) => {
    const heist =
      0.25 * zOR[i] +
      0.25 * zDR[i] +
      0.25 * zDefTO[i] -
      0.25 * zOffTO[i];

    return {
      team: t.team,
      heist: Number(heist.toFixed(6)),
      ORpct: t.ORpct,
      DRpct: t.DRpct,
      DefTOpct: t.DefTOpct,
      OffTOpct: t.OffTOpct
    };
  });

  const payload = {
    updated_at: new Date().toISOString(),
    teams: outTeams
  };

  fs.writeFileSync("data/data.json", JSON.stringify(payload, null, 2));
  console.log("Wrote data/data.json with", outTeams.length, "teams");
}

main();
