const fs = require("fs");

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const rows = [];
  // Basic CSV parser that supports quoted fields
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];

      if (ch === '"' && line[j + 1] === '"') {
        cur += '"';
        j++;
        continue;
      }

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }

      cur += ch;
    }
    out.push(cur);
    rows.push(out.map(v => v.trim()));
  }
  return rows;
}

function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Common mascots/suffixes we want to strip off the END of the CSV “Team” value
// (CSV often has “School Mascot”, while your data often has “School”)
const TWO_WORD_MASCOTS = new Set([
  "red storm",
  "blue devils",
  "red raiders",
  "golden eagles",
  "fighting irish",
  "mountain hawks",
  "blue hens",
  "golden flashes",
  "scarlet knights",
  "crimson tide",
  "tar heels",
  "blue jays",
  "green wave",
  "fighting illini",
  "red wolves",
  "golden bears",
  "sun devils",
  "wildcats", // included as fallback below too
]);

const ONE_WORD_MASCOTS = new Set([
  "wildcats","tigers","bulldogs","bears","eagles","hawks","knights","cougars","rams","hornets",
  "spartans","trojans","bruins","panthers","lions","falcons","dolphins","gators","seminoles",
  "volunteers","razorbacks","sooners","longhorns","aggies","buckeyes","beavers","terrapins",
  "bearcats","pirates","rebels","commodores","cardinals","jayhawks","cyclones","broncos",
  "cowboys","lobos","aztecs","utes","utes","blazers","jaguars","titans","dons","gaels",
  "zags","mocs","bison","bisons","bears","owls","mustangs","eagles","vikings","spartans",
  "miners","mean","rainbow","warriors","crusaders","spartans","landers","lakers","penguins",
  "wolverines","badgers","huskies","utes","gophers","scarlet","orange","hoosiers",
]);

function stripMascot(fullTeam) {
  const parts = String(fullTeam || "").trim().split(/\s+/);
  if (parts.length < 2) return fullTeam;

  const last2 = (parts.slice(-2).join(" ")).toLowerCase();
  if (TWO_WORD_MASCOTS.has(last2)) {
    return parts.slice(0, -2).join(" ");
  }

  const last1 = (parts.slice(-1)[0] || "").toLowerCase();
  if (ONE_WORD_MASCOTS.has(last1)) {
    return parts.slice(0, -1).join(" ");
  }

  return fullTeam;
}

function cleanHex(h) {
  return String(h || "")
    .trim()
    .replace(/;+/g, "")
    .toUpperCase();
}

function main() {
  const csvPath = "data/team_colors.csv";
  if (!fs.existsSync(csvPath)) {
    console.error(`Missing ${csvPath}. Put your CSV at /data/team_colors.csv`);
    process.exit(1);
  }

  const text = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(text);
  if (rows.length < 2) {
    console.error("CSV appears empty.");
    process.exit(1);
  }

  // Expect header row including: Team, Hex_Code, color_level
  const header = rows[0].map(h => h.trim());
  const idxTeam = header.findIndex(h => h.toLowerCase() === "team");
  const idxHex = header.findIndex(h => h.toLowerCase() === "hex_code");
  const idxLvl = header.findIndex(h => h.toLowerCase() === "color_level");

  if (idxTeam === -1 || idxHex === -1 || idxLvl === -1) {
    console.error("CSV header must include Team, Hex_Code, color_level");
    console.error("Found header:", header);
    process.exit(1);
  }

  // Build: fullTeam -> best primary color (lowest color_level)
  const best = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const team = r[idxTeam];
    const hex = cleanHex(r[idxHex]);
    const lvl = Number(r[idxLvl]);

    if (!team || !hex || !Number.isFinite(lvl)) continue;

    if (!best.has(team) || lvl < best.get(team).color_level) {
      best.set(team, { hex, color_level: lvl });
    }
  }

  // Output map keyed by normalized names (both full + stripped)
  const out = {};
  for (const [teamFull, info] of best.entries()) {
    const fullKey = normName(teamFull);
    const stripped = stripMascot(teamFull);
    const stripKey = normName(stripped);

    // Store primary color
    out[fullKey] = { primary: info.hex, source: teamFull };
    out[stripKey] = { primary: info.hex, source: teamFull };
  }

  fs.writeFileSync("data/team_colors.json", JSON.stringify(out, null, 2));
  console.log(`Wrote data/team_colors.json with ${Object.keys(out).length} keys`);
}

main();
