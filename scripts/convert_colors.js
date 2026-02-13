const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join("data", "team_primary_colors.csv");
const OUT_PATH = path.join("data", "team_primary_colors.json");

function isHexColor(s) {
  return typeof s === "string" && /^#[0-9A-Fa-f]{6}$/.test(s.trim());
}

function stripQuotes(s) {
  s = String(s ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseWeirdCsv(lines) {
  // Your file is like:
  // "Team,PrimaryHex"
  // "Alabama,#9E1B32"
  // (each row is one quoted string containing a comma)
  const out = [];
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;

    const unq = stripQuotes(line);
    // skip header
    if (unq.toLowerCase() === "team,primaryhex") continue;

    const idx = unq.indexOf(",");
    if (idx === -1) continue;

    const team = unq.slice(0, idx).trim();
    const hex = unq.slice(idx + 1).trim();

    if (!team) continue;
    if (!isHexColor(hex)) continue;

    out.push({ team, hex: hex.toUpperCase() });
  }
  return out;
}

function parseNormalCsv(lines) {
  // fallback if it’s a normal CSV with actual commas
  // Team,PrimaryHex
  // Alabama,#9E1B32
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // skip header row
    if (i === 0 && line.toLowerCase().includes("team") && line.toLowerCase().includes("primary")) {
      continue;
    }

    const parts = line.split(",");
    if (parts.length < 2) continue;

    const team = stripQuotes(parts[0]).trim();
    const hex = stripQuotes(parts[1]).trim();

    if (!team) continue;
    if (!isHexColor(hex)) continue;

    out.push({ team, hex: hex.toUpperCase() });
  }
  return out;
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Missing ${CSV_PATH}`);
    process.exit(1);
  }

  const text = fs.readFileSync(CSV_PATH, "utf8");
  const lines = text.split(/\r?\n/);

  // Try “weird quoted single-column CSV” first, then normal.
  let rows = parseWeirdCsv(lines);
  if (rows.length < 50) {
    rows = parseNormalCsv(lines);
  }

  const map = {};
  for (const r of rows) {
    map[r.team] = r.hex;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(map, null, 2) + "\n");
  console.log(`Wrote ${OUT_PATH} with ${Object.keys(map).length} teams`);
}

main();
