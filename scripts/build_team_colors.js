const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const outPath = path.join(dataDir, "team_colors_full.json");

function findCSV() {
  // Preferred exact name first
  const preferred = path.join(dataDir, "team_primary_colors.csv");
  if (fs.existsSync(preferred)) return preferred;

  // Otherwise grab the first .csv in /data that looks like colors
  const files = fs.readdirSync(dataDir);
  const candidates = files
    .filter(f => f.toLowerCase().endsWith(".csv"))
    .map(f => path.join(dataDir, f));

  // Try to pick a likely one (contains "color" in filename)
  const likely = candidates.find(p => path.basename(p).toLowerCase().includes("color"));
  if (likely) return likely;

  if (candidates.length) return candidates[0];

  throw new Error("No CSV found in /data. Expected data/team_primary_colors.csv (or any .csv in /data).");
}

function parseCSVLine(line) {
  // Minimal CSV parser that handles quoted fields with commas
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"' ) {
      if (inQuotes && line[i + 1] === '"') { // escaped quote
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function normalizeHex(v) {
  if (!v) return null;
  let s = String(v).trim();

  // allow "0x" or "#"
  s = s.replace(/^0x/i, "").replace(/^#/,"").trim();

  // only keep hex chars
  s = s.replace(/[^0-9a-f]/gi, "");

  if (s.length === 3) {
    // expand shorthand
    s = s.split("").map(c => c + c).join("");
  }

  if (s.length !== 6) return null;
  return `#${s.toUpperCase()}`;
}

function main() {
  const csvPath = findCSV();
  const csv = fs.readFileSync(csvPath, "utf8");

  const lines = csv.split(/\r?\n/).filter(l => l.trim().length);
  if (lines.length < 2) throw new Error(`CSV ${path.basename(csvPath)} has no data rows.`);

  const header = parseCSVLine(lines[0]).map(h => h.trim());
  const lower = header.map(h => h.toLowerCase());

  // Find columns flexibly
  const teamIdx =
    lower.findIndex(h => h === "team") !== -1 ? lower.findIndex(h => h === "team")
    : lower.findIndex(h => h.includes("team")) !== -1 ? lower.findIndex(h => h.includes("team"))
    : -1;

  const colorIdx =
    lower.findIndex(h => h === "color") !== -1 ? lower.findIndex(h => h === "color")
    : lower.findIndex(h => h.includes("color")) !== -1 ? lower.findIndex(h => h.includes("color"))
    : lower.findIndex(h => h.includes("hex")) !== -1 ? lower.findIndex(h => h.includes("hex"))
    : -1;

  if (teamIdx === -1 || colorIdx === -1) {
    throw new Error(
      `Could not find Team/Color columns in ${path.basename(csvPath)}.\n` +
      `Headers found: ${header.join(" | ")}`
    );
  }

  const map = {};
  let ok = 0;
  let bad = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const team = (cols[teamIdx] || "").trim();
    const rawColor = (cols[colorIdx] || "").trim();
    if (!team) continue;

    const hex = normalizeHex(rawColor);
    if (!hex) {
      bad++;
      continue;
    }

    map[team] = hex;
    ok++;
  }

  fs.writeFileSync(outPath, JSON.stringify(map, null, 2));
  console.log(`Built team_colors_full.json from ${path.basename(csvPath)} — ${ok} ok, ${bad} bad/missing colors`);
}

main();
