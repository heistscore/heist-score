const fs = require("fs");

function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  // very simple CSV parser that supports quoted fields
  const rows = [];
  for (const line of lines) {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // double quote escape
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === "," && !inQ) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    rows.push(out);
  }
  return rows;
}

function normalizeHex(hex) {
  if (!hex) return null;
  let h = String(hex).trim();
  if (!h) return null;
  if (!h.startsWith("#")) h = "#" + h;
  h = h.toUpperCase();
  // allow #RGB -> #RRGGBB
  if (/^#[0-9A-F]{3}$/.test(h)) {
    h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (!/^#[0-9A-F]{6}$/.test(h)) return null;
  return h;
}

function main() {
  const inPath = "data/team_primary_colors.csv";
  const outPath = "data/team_primary_colors.json";

  if (!fs.existsSync(inPath)) {
    console.error(`Missing ${inPath}. Did you upload it to /data ?`);
    process.exit(1);
  }

  const csv = fs.readFileSync(inPath, "utf8");
  const rows = parseCSV(csv);
  const header = rows[0].map(h => h.toLowerCase());

  // Try to detect columns
  const teamIdx =
    header.indexOf("team") !== -1 ? header.indexOf("team")
    : header.indexOf("teamname") !== -1 ? header.indexOf("teamname")
    : header.indexOf("school") !== -1 ? header.indexOf("school")
    : 0;

  const colorIdx =
    header.indexOf("color") !== -1 ? header.indexOf("color")
    : header.indexOf("hex") !== -1 ? header.indexOf("hex")
    : header.indexOf("primary") !== -1 ? header.indexOf("primary")
    : 1;

  const map = {};
  let kept = 0;
  let dropped = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const team = (r[teamIdx] ?? "").trim();
    const hexRaw = (r[colorIdx] ?? "").trim();
    if (!team) continue;

    const hex = normalizeHex(hexRaw);
    if (!hex) {
      dropped++;
      continue;
    }
    map[team] = hex;
    kept++;
  }

  fs.writeFileSync(outPath, JSON.stringify(map, null, 2));
  console.log(`Wrote ${outPath} with ${kept} teams. Dropped ${dropped} invalid hex rows.`);
}

main();
