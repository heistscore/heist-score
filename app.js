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

function render(rowsEl, teams) {
  rowsEl.innerHTML = "";

  teams.forEach((t, i) => {
    const row = document.createElement("div");
    row.className = `row ${bandClass(Number(t.heist))}`;

    row.innerHTML = `
      <div>${i + 1}</div>
      <div>${t.team}</div>
      <div class="score">${Number(t.heist).toFixed(2)}</div>
      <div class="band">${band(Number(t.heist))}</div>
    `;

    rowsEl.appendChild(row);
  });
}

async function main() {
  const rowsEl = document.getElementById("rows");
  const searchEl = document.getElementById("search");

  const res = await fetch(`./data/data.json?ts=${Date.now()}`);
  const payload = await res.json();

  const meta = document.getElementById("meta");
  if (meta) meta.textContent = `Updated: ${payload.updated_at}`;

  const data = payload.teams || [];
  const sorted = [...data].sort((a, b) => Number(b.heist) - Number(a.heist));

  // Default view = top 50
  render(rowsEl, sorted.slice(0, 50));

  // If no search box exists, stop here
  if (!searchEl) return;

  searchEl.addEventListener("input", () => {
    const q = searchEl.value.trim().toLowerCase();

    if (!q) {
      render(rowsEl, sorted.slice(0, 50));
      return;
    }

    const filtered = sorted.filter(t =>
      String(t.team).toLowerCase().includes(q)
    );

    render(rowsEl, filtered);
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
