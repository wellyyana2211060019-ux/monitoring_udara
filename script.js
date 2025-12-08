// =========================
// FIREBASE REST URL (pakai SECRET legacy token)
// =========================
const firebaseURL = "https://airqualitymonitoring-28fa9-default-rtdb.asia-southeast1.firebasedatabase.app/sensor.json?auth=pUiWkItaGg7wSAuEU5U6swbnRLb9QiFId4UObTwG";

// ===== session history (client-side) =====
const history = []; // store last N snapshots for history table
const MAX_HISTORY = 200;

// ===== Chart setup =====
const ctx = document.getElementById("trendChart").getContext("2d");
const trendChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Temperature (°C)", data: [], borderColor: "#44f0e6", backgroundColor: "transparent", tension: 0.3 },
      { label: "Humidity (%)", data: [], borderColor: "#7ee787", backgroundColor: "transparent", tension: 0.3 },
      { label: "PM2.5", data: [], borderColor: "#ff9f68", backgroundColor: "transparent", tension: 0.3 },
      { label: "Gas (score)", data: [], borderColor: "#f5f86d", backgroundColor: "transparent", tension: 0.3 }
    ]
  },
  options: {
    responsive: true,
    scales: {
      x: { display: true },
      y: { display: true, beginAtZero: false }
    },
    plugins: {
      legend: { labels: { color: '#dff7f4' } }
    }
  }
});

// Map gas text to numeric score for chart (BAIK -> 1, BURUK -> 100)
function gasToScore(g) {
  if (!g) return 0;
  return (g.toUpperCase() === "BAIK") ? 1 : 100;
}

// Determine status by thresholds
function evaluateStatus(dust, gasText) {
  // thresholds (tweak as needed)
  if ((gasText && gasText.toUpperCase() === "BURUK") || dust > 100) return "UNHEALTHY";
  if (dust > 50) return "MODERATE";
  return "HEALTHY";
}

// render cards & status
function renderData(data) {
  document.getElementById("tempValue").innerText = (data.temperature ?? "--") + " °C";
  document.getElementById("humValue").innerText = (data.humidity ?? "--") + " %";
  document.getElementById("gasValue").innerText = (data.gas ?? "--");
  document.getElementById("dustValue").innerText = (data.dust ?? "--") + " μg/m³";

  const status = evaluateStatus(Number(data.dust), data.gas);
  const statusEl = document.getElementById("airStatus");
  statusEl.innerText = "AIR QUALITY STATUS: " + status;

  // color by status
  if (status === "HEALTHY") {
    statusEl.style.borderColor = "rgba(126,231,135,0.25)";
    statusEl.style.background = "linear-gradient(90deg,#071017,#071518)";
  } else if (status === "MODERATE") {
    statusEl.style.borderColor = "rgba(255,191,68,0.18)";
    statusEl.style.background = "linear-gradient(90deg,#1a1209,#0b1413)";
  } else {
    statusEl.style.borderColor = "rgba(255,92,92,0.18)";
    statusEl.style.background = "linear-gradient(90deg,#2b0808,#0b0b0b)";
    // optionally play alert sound / flash (not included)
  }
}

// push data to chart + history
function pushSnapshot(data) {
  const timeLabel = new Date().toLocaleTimeString();

  // chart
  trendChart.data.labels.push(timeLabel);
  trendChart.data.datasets[0].data.push(Number(data.temperature ?? 0));
  trendChart.data.datasets[1].data.push(Number(data.humidity ?? 0));
  trendChart.data.datasets[2].data.push(Number(data.dust ?? 0));
  trendChart.data.datasets[3].data.push(gasToScore(data.gas));
  if (trendChart.data.labels.length > 40) {
    trendChart.data.labels.shift();
    trendChart.data.datasets.forEach(ds => ds.data.shift());
  }
  trendChart.update();

  // history (client-side)
  const snapshot = {
    ts: data.timestamp ? new Date(data.timestamp * 1000) : new Date(),
    temperature: data.temperature ?? null,
    humidity: data.humidity ?? null,
    gas: data.gas ?? null,
    dust: data.dust ?? null,
    status: evaluateStatus(Number(data.dust), data.gas)
  };
  history.unshift(snapshot); // recent first
  if (history.length > MAX_HISTORY) history.pop();
  renderHistoryTable();
}

// fill history table (session)
function renderHistoryTable() {
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML = "";
  for (let i = 0; i < history.length; i++) {
    const r = history[i];
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.ts.toLocaleString()}</td>
                    <td>${r.temperature ?? '-'}</td>
                    <td>${r.humidity ?? '-'}</td>
                    <td>${r.gas ?? '-'}</td>
                    <td>${r.dust ?? '-'}</td>
                    <td>${r.status}</td>`;
    tbody.appendChild(tr);
  }
}

// Export CSV
function exportCSV() {
  if (history.length === 0) return alert("No data to export");
  const header = ["timestamp","temperature","humidity","gas","dust","status"];
  const rows = history.map(h => [
    `"${h.ts.toISOString()}"`,
    h.temperature ?? "",
    h.humidity ?? "",
    `"${h.gas ?? ""}"`,
    h.dust ?? "",
    h.status
  ].join(","));
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `air_quality_history_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Clear session history
function clearHistory() {
  if (!confirm("Clear session history?")) return;
  history.length = 0;
  renderHistoryTable();
  // also clear chart
  trendChart.data.labels = [];
  trendChart.data.datasets.forEach(ds => ds.data = []);
  trendChart.update();
}

// fetch from firebase (REST)
async function fetchSensor() {
  try {
    const res = await fetch(firebaseURL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!data) return;
    renderData(data);
    pushSnapshot(data);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

// init
document.getElementById("btnExport").addEventListener("click", exportCSV);
document.getElementById("btnClear").addEventListener("click", clearHistory);

// first load + interval
fetchSensor();
setInterval(fetchSensor, 3000);
