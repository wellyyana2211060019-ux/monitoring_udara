import { getDatabase, ref, onValue, query, limitToLast }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

  onValue(q, snap => {
    let labels = [], data = [];

    snap.forEach(child => {
      const d = child.val();
      labels.push(new Date(d.timestamp * 1000).toLocaleDateString());
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
          tension: .4
        }]
      },
      options: {
        plugins: {
          zoom: {
            pan: { enabled: true, mode: "x" },
            zoom: { wheel: { enabled: true }, mode: "x" }
          }
        }
      }
    });
  });
}
