import { getDatabase, ref, onValue, query, limitToLast }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const db = getDatabase();

let selectedSensor = "suhu";
let rangeDay = 30;
let chart;

window.setRange = (day) => {
  rangeDay = day;
  loadSensorChart(selectedSensor);
};

window.loadSensorChart = (sensor) => {
  selectedSensor = sensor;

  const dataRef = query(ref(db, "sensor_data"), limitToLast(rangeDay * 24));

  onValue(dataRef, (snapshot) => {
    let labels = [];
    let data = [];

    snapshot.forEach(child => {
      labels.push(child.key);
      data.push(child.val()[sensor]);
    });

    renderChart(labels, data, sensor);
  });
};

function renderChart(labels, data, sensor) {
  const ctx = document.getElementById("detailChart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: sensor.toUpperCase(),
        data: data,
        borderWidth: 2,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        zoom: {
          pan: { enabled: true, mode: "x" },
          zoom: { wheel: { enabled: true }, mode: "x" }
        }
      }
    }
  });
}

/* ===== ISI CARD DATA TERBARU ===== */
onValue(query(ref(db, "sensor_data"), limitToLast(1)), (snap) => {
  snap.forEach(child => {
    const d = child.val();
    document.getElementById("card-suhu").innerText = d.suhu + " °C";
    document.getElementById("card-kelembaban").innerText = d.kelembaban + " %";
    document.getElementById("card-pm25").innerText = d.pm25 + " µg/m³";
    document.getElementById("card-gas").innerText = d.gas + " ppm";
  });
});
