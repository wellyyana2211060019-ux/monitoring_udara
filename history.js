import { getDatabase, ref, onValue, query, limitToLast }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
let historyUnsubscribe = null;
const db = getDatabase();

let selectedSensor = "gas";
let rangeDay = 30;
let historyChart;

window.selectSensor = s => {
  selectedSensor = s;

  // Update visual state
  const map = {
    'temperature': 'hist-temp',
    'humidity': 'hist-humidity',
    'gas': 'hist-gas',
    'dust': 'hist-dust'
  };

  // Remove active form all
  Object.values(map).forEach(id => {
    document.getElementById(id).classList.remove('active-card');
  });

  // Add to selected
  if (map[s]) {
    document.getElementById(map[s]).classList.add('active-card');
  }

  loadHistory();
};

window.setRange = d => {
  rangeDay = d;
  loadHistory();
};
function loadHistory() {
  const ctx = document.getElementById("historyChart").getContext("2d");
  const q = query(ref(db, "history"), limitToLast(rangeDay * 24));

  // 🔥 HENTIKAN LISTENER LAMA (PENTING REALTIME)
  if (historyUnsubscribe) historyUnsubscribe();

  historyUnsubscribe = onValue(q, snap => {
    let labels = [];
    let data = [];

    snap.forEach(child => {
      const d = child.val();

      // ⛔ Skip jika data sensor tidak ada
      if (d[selectedSensor] === undefined || d[selectedSensor] === null) return;

      labels.push(
        d.timestamp
          ? new Date(d.timestamp * 1000).toLocaleDateString()
          : ""
      );

      data.push(d[selectedSensor]);
    });

    if (historyChart) historyChart.destroy();

    historyChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: selectedSensor.toUpperCase(),
          data,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          zoom: {
            pan: { enabled: true, mode: "x" },
            zoom: { wheel: { enabled: true }, mode: "x" }
          }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  });
}


   
