const fs = require("fs");
const path = require("path");

const inPath = path.join(__dirname, "..", "data", "team_primary_colors.csv");
const outPath = path.join(__dirname, "..", "data", "team_colors_full.json");

function parseCSV(text) {
  const lines = text.split("\n").filter(l => l.trim());
  const header = lines[0].split(",").map(h => h.trim());

  const teamIdx = header.findIndex(h => /team/i.test(h));
  const colorIdx = header.findIndex(h => /color/i.test(h));

  if (teamIdx === -1 || colorIdx === -1) {
    throw new Error("CSV must contain Team and Color columns.");
  }

  const map = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const team = cols[teamIdx];
    const color = cols[colorIdx];

    if (!team || !color) continue;

    const hex = color.startsWith("#") ? color : `#${color}`;
    map[team] = hex;
  }

  return map;
}

function main() {
  const csv = fs.readFileSync(inPath, "utf8");
  const map = parseCSV(csv);

  fs.writeFileSync(outPath, JSON.stringify(map, null, 2));
  console.log("Wrote team_colors_full.json with", Object.keys(map).length, "teams");
}

main();
