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

function fmt(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "--";
  return x.toFixed(2);
}

function percentileRank(sortedDescValues, value) {
  // sortedDescValues: array of numbers sorted HIGH -> LOW
  // returns percentile where best is 100 and worst is ~0
  if (!Number.isFinite(value) || sortedDescValues.length === 0) return null;

  // Find first index where value would fit (descending)
  // We'll do a simple linear scan; 365 items is tiny.
  let idx = 0;
  while (idx < sortedDescValues.length && sortedDescValues[idx] > value) idx++;

  // idx = number of teams strictly better than value
  const better = idx;
  const n = sortedDescValues.length;

  // percentile = proportion you are better than
  // best team => better=0 => ~100
  // worst team => better=n-1 => ~0
  const pct = (1 - (better / (n - 1))) * 100;
  return Math.max(0, Math.min(100, pct));
}

function render(rowsEl, teams, metricKey, pctMap) {
  rowsEl.innerHTML = "";

  teams.forEach((t, i) => {
    const val = Number(t[metricKey]);
    const pct = pctMap.get(t.team); // 0..100

    const row = document.createElement("div");
    row.className = `row ${bandClass(val)}`;

    row.innerHTML = `
      <div>${i + 1}</div>
      <div>${t.team}</div>
      <div class="score">${fmt(val)}</div>
      <div class="pct">${pct == null ? "--" : `${Math.round(pct)}th`}</div>
      <div class="band">${band(val)}</div>
    `;

    rowsEl.appendChild(row);
  });
}

async function main() {
  const rowsEl = document.getElementById("rows");
  const metaEl = document.getElementById("meta");
  const colLabelEl = document.getElementById("colLabel");

  const btnHeist = document.getElementById("btnHeist");
  const btnPayday = document.getElementById("btnPayday");
  const searchEl = document.getElementById("search");

  const limitButtons = Array.from(document.querySelectorAll("[data-limit]"));

  // Defaults
  let metricKey = "heist";
  let limit = 25;
  let query = "";

  const res = await fetch(`./data/data.json?ts=${Date.now()}`);
  const payload = await res.json();

  if (metaEl) metaEl.textContent = `Updated: ${payload.updated_at}`;

  const data = payload.teams || [];

  function computePctMap(metric) {
    const vals = data
      .map(t => Number(t[metric]))
      .filter(Number.isFinite)
      .sort((a, b) => b - a);

    const map = new Map();
    data.forEach(t => {
      const v = Number(t[metric]);
      if (!Number.isFinite(v)) return;
      map.set(t.team, percentileRank(vals, v));
    });

    return map;
  }

  // Precompute percentile maps for both metrics
  const pctHeist = computePctMap("heist");
  const pctPayday = computePctMap("payday");

  function sortedByMetric(list) {
    return [...list].sort((a, b) => Number(b[metricKey]) - Number(a[metricKey]));
  }

  function applyFiltersAndRender() {
    let list = sortedByMetric(data);

    if (query) {
      list = list.filter(t => String(t.team).toLowerCase().includes(query));
    }

    let view = list;
    if (limit !== "all") view = list.slice(0, limit);

    if (colLabelEl) colLabelEl.textContent = metricKey === "payday" ? "Payday" : "Heist";

    const pctMap = metricKey === "payday" ? pctPayday : pctHeist;
    render(rowsEl, view, metricKey, pctMap);
  }

  // Metric toggle
  btnHeist?.addEventListener("click", () => {
    metricKey = "heist";
    btnHeist.classList.add("active");
    btnPayday?.classList.remove("active");
    applyFiltersAndRender();
  });

  btnPayday?.addEventListener("click", () => {
    metricKey = "payday";
    btnPayday.classList.add("active");
    btnHeist?.classList.remove("active");
    applyFiltersAndRender();
  });

  // Limit toggle
  limitButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      limitButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const v = btn.getAttribute("data-limit");
      limit = (v === "all") ? "all" : Number(v);
      applyFiltersAndRender();
    });
  });

  // Search
  searchEl?.addEventListener("input", () => {
    query = searchEl.value.trim().toLowerCase();
    applyFiltersAndRender();
  });

  // Initial render
  applyFiltersAndRender();
}

main().catch(err => {
  console.error(err);
  const rowsEl = document.getElementById("rows");
  if (rowsEl) {
    rowsEl.innerHTML = `<div class="row below">
      <div></div>
      <div>Failed to load data.json</div>
      <div class="score">--</div>
      <div class="pct">--</div>
      <div class="band">Error</div>
    </div>`;
  }
});
