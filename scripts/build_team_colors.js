const fs = require("fs");

function stripQuotes(s) {
  s = String(s ?? "").trim();
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}

function cleanHex(hex) {
  let h = String(hex ?? "").trim().replace(/"+/g, "").toUpperCase();
  if (!h) return "";
  if (!h.startsWith("#")) h = "#" + h;
  // basic validation: #RRGGBB
  if (!/^#[0-9A-F]{6}$/.test(h)) return "";
  return h;
}

function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function main() {
  const inPath = "data/team_primary_colors.csv";
  const outPath = "data/team_colors.json";

  if (!fs.existsSync(inPath)) {
    console.error(`Missing ${inPath}. Upload your CSV to /data/team_primary_colors.csv`);
    process.exit(1);
  }

  const lines = fs.readFileSync(inPath, "utf8").split(/\r?\n/).filter(Boolean);

  // Your CSV is like:
  // "Team,PrimaryHex"
  // "Alabama,#9E1B32"
  // so each line is one quoted string with a comma inside.
  // We'll parse both:
  //  - normal CSV rows: Team,PrimaryHex
  //  - quoted single-field rows: "Team,PrimaryHex"
  const map = {};
  let added = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    // Remove outer quotes if the whole line is quoted
    const line = stripQuotes(rawLine);

    // Skip header
    if (i === 0 && /team/i.test(line) && /primary/i.test(line)) continue;

    // Split on first comma: Team,Hex
    const commaIndex = line.indexOf(",");
    if (commaIndex === -1) continue;

    const team = line.slice(0, commaIndex).trim();
    const hexRaw = line.slice(commaIndex + 1).trim();

    const hex = cleanHex(hexRaw);
    if (!team || !hex) continue;

    // Store both exact + normalized keys so we match more reliably
    map[team] = hex;
    map[normName(team)] = hex;
    added++;
  }

  fs.writeFileSync(outPath, JSON.stringify(map, null, 2));
  console.log(`Wrote ${outPath}. Parsed ${added} rows. Keys: ${Object.keys(map).length}`);
}

main();
