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

async function main() {
  const rowsEl = document.getElementById("rows");
  rowsEl.innerHTML = "";

  const res = await fetch(`./data/data.json?ts=${Date.now()}`);
  const payload = await res.json();

  const meta = document.getElementById("meta");
  if (meta) meta.textContent = `Updated: ${payload.updated_at}`;

  const data = payload.teams || [];
  const sorted = [...data].sort((a, b) => b.heist - a.heist);

  sorted.forEach((t, i) => {
    const row = document.createElement("div");
    row.className = `row ${bandClass(t.heist)}`;

    row.innerHTML = `
      <div>${i + 1}</div>
      <div>${t.team}</div>
      <div class="score">${Number(t.heist).toFixed(2)}</div>
      <div class="band">${band(t.heist)}</div>
    `;

    rowsEl.appendChild(row);
  });
}

main().catch(err => {
  console.error(err);
  const rowsEl = document.getElementById("rows");
  rowsEl.innerHTML = `<div class="row below">
    <div></div>
    <div>Failed to load data.json</div>
    <div class="score">--</div>
    <div class="band">Error</div>
  </div>`;
});
