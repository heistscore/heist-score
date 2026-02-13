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

function render(rowsEl, teams, metricKey) {
  rowsEl.innerHTML = "";

  teams.forEach((t, i) => {
    const val = Number(t[metricKey]);
    const row = document.createElement("div");
    row.className = `row ${bandClass(val)}`;

    row.innerHTML = `
      <div>${i + 1}</div>
      <div>${t.team}</div>
      <div class="score">${Number.isFinite(val) ? val.toFixed(2) : "--"}</div>
      <div class="band">${Number.isFinite(val) ? band(val) : "--"}</div>
    `;

    rowsEl.appendChild(row);
  });
}

function applySearch(sorted, query) {
  const q = query.trim().toLowerCase();
  if (!q) return sorted.slice(0, 50);
  return sorted.filter(t => String(t.team).toLowerCase().includes(q));
}

async function main() {
  const rowsEl = document.getElementById("rows");
  const searchEl = document.getElementById("search");

  const btnHeist = document.getElementById("btnHeist");
  const btnPayday = document.getElementById("btnPayday");
  const metricHeader = document.getElementById("metricHeader");

  // default metric
  let metricKey = "heist";

  const res = await fetch(`./data/data.json?ts=${Date.now()}`);
  const payload = await res.json();

  const meta = document.getElementById("meta");
  if (meta) meta.textContent = `Updated: ${payload.updated_at}`;

  const data = payload.teams || [];

  function getSorted() {
    return [...data].sort((a, b) => Number(b[metricKey]) - Number(a[metricKey]));
  }

  function refresh() {
    const sorted = getSorted();
    const view = applySearch(sorted, searchEl ? searchEl.value : "");
    if (metricHeader) metricHeader.textContent = metricKey === "heist" ? "Heist" : "Payday";
    render(rowsEl, view, metricKey);
  }

  // wire up buttons
  if (btnHeist) {
    btnHeist.addEventListener("click", () => {
      metricKey = "heist";
      btnHeist.classList.add("active");
      btnPayday && btnPayday.classList.remove("active");
      refresh();
    });
  }

  if (btnPayday) {
    btnPayday.addEventListener("click", () => {
      metricKey = "payday";
      btnPayday.classList.add("active");
      btnHeist && btnHeist.classList.remove("active");
      refresh();
    });
  }

  // wire up search
  if (searchEl) {
    searchEl.addEventListener("input", refresh);
  }

  // initial render
  refresh();
}

main().catch(err => {
  console.error(err);
  const rowsEl = document.getElementById("rows");
  if (rowsEl) {
    rowsEl.innerHTML = `<div class="row below">
      <div></div>
      <div>Failed to load data.json</div>
      <div class="score">--</div>
      <div class="band">Error</div>
    </div>`;
  }
});
