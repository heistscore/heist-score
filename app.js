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
  const pills = Array.from(document.querySelectorAll(".pill"));

  const res = await fetch(`./data/data.json?ts=${Date.now()}`);
  const payload = await res.json();

  const meta = document.getElementById("meta");
  if (meta) meta.textContent = `Updated: ${payload.updated_at}`;

  const data = payload.teams || [];
  const sorted = [...data].sort((a, b) => Number(b.heist) - Number(a.heist));

  let currentLimit = 25;

  function getLimitedList(list) {
    if (currentLimit === "all") return list;
    return list.slice(0, currentLimit);
  }

  function applyFilters() {
    const q = (searchEl?.value || "").trim().toLowerCase();
    const base = getLimitedList(sorted);

    if (!q) {
      render(rowsEl, base);
      return;
    }

    const filtered = base.filter(t =>
      String(t.team).toLowerCase().includes(q)
    );

    render(rowsEl, filtered);
  }

  // Default render
  applyFilters();

  // Search
  if (searchEl) {
    searchEl.addEventListener("input", applyFilters);
    searchEl.addEventListener("change", applyFilters);
    searchEl.addEventListener("keyup", applyFilters);
  }

  // Toggle pills
  pills.forEach(btn => {
    btn.addEventListener("click", () => {
      pills.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const v = btn.getAttribute("data-limit");
      currentLimit = (v === "all") ? "all" : Number(v);

      applyFilters();
    });
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
