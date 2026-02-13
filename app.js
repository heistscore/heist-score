const data = [
  { team: "Houston", heist: 1.42 },
  { team: "Purdue", heist: 0.88 },
  { team: "Kentucky", heist: 0.52 },
  { team: "Tennessee", heist: -0.12 },
  { team: "Alabama", heist: -0.63 }
];

function band(score) {
  if (score >= 1.0) return "Elite";
  if (score >= 0.5) return "Strong";
  if (score <= -0.5) return "Below";
  return "Neutral";
}

function bandClass(score) {
  if (score >= 1.0) return "elite";
  if (score >= 0.5) return "strong";
  if (score <= -0.5) return "below";
  return "neutral";
}

const sorted = [...data].sort((a, b) => b.heist - a.heist);

const rows = document.getElementById("rows");

sorted.forEach((t, i) => {
  const row = document.createElement("div");
  row.className = `row ${bandClass(t.heist)}`;

  row.innerHTML = `
    <div>${i + 1}</div>
    <div>${t.team}</div>
    <div class="score">${t.heist.toFixed(2)}</div>
    <div class="band">${band(t.heist)}</div>
  `;

  rows.appendChild(row);
});
