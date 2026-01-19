import { getDatabase, ref, onValue, query, limitToLast }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const db = getDatabase();

let historyUnsubscribe = null;
let selectedSensor = "gas";
let rangeDay = 30;
let historyChart;

// === Mapping nama sensor (HTML → Firebase) ===
const sensorKeyMap = {
  temperature: "temperature",
  humidity: "humidity",
  gas: "gas",
  dust: "dust"
};

window.selectSensor = s => {
  selectedSensor = s;

  const map = {
    temperature: "hist-temp",
    humidity: "hist-humidity",
    gas: "hist-gas",
    dust: "hist-dust"
  };

  Object.values(map).forEach(id => {
    document.getElementById(id).classList.remove("active-card");
  });

  if (map[s]) {
    document.getElementById(map[s]).classList.add("active-card");
  }

  loadHistory();
};

window.setRange = d => {
  rangeDay = d;
  loadHistory();
};

function loadHistory() {
  const canvas = document.getElementById("historyChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // ⏱️ estimasi: 1 data / detik
  const limit = rangeDay * 24 * 60 * 60;

  const q = query(ref(db, "history"), limitToLast(limit));

  if (historyUnsubscribe) historyUnsubscribe();

  historyUnsubscribe = onValue(q, snap => {
    let labels = [];
    let data = [];

    snap.forEach(child => {
      const d = child.val();
      const key = sensorKeyMap[selectedSensor];

      if (!d || d[key] === undefined || d.timestamp === undefined) return;

      labels.push(
        new Date(d.timestamp).toLocaleString("id-ID")
      );

      data.push(d[key]);
    });

    if (historyChart) historyChart.destroy();

    historyChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: selectedSensor.toUpperCase(),
          data,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          legend: { display: true },
          zoom: {
            pan: { enabled: true, mode: "x" },
            zoom: { wheel: { enabled: true }, mode: "x" }
          }
        },
        scales: {
          y: { beginAtZero: true },
          x: { ticks: { maxTicksLimit: 10 } }
        }
      }
    });
  });
}

// === Load default ===
loadHistory();

