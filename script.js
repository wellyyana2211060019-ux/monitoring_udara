import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ================= FIREBASE ================= */
const firebaseConfig = {
  apiKey: "AIzaSyDNx_YJ8sXo-PQzBhwTCoeLeaymaN_Wifc",
  authDomain: "airqualitymonitoring-28fa9.firebaseapp.com",
  databaseURL: "https://airqualitymonitoring-28fa9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "airqualitymonitoring-28fa9",
  storageBucket: "airqualitymonitoring-28fa9.appspot.com",
  messagingSenderId: "772590326433",
  appId: "1:772590326433:web:ff356431c0bfb606a496e0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ================= LOGIKA GAS ================= */
function jenisGas(ppm){
  if (ppm < 400) return "Udara Bersih";
  if (ppm < 800) return "CO₂ Rendah";
  if (ppm < 1200) return "VOC Ringan";
  if (ppm < 2000) return "VOC / NH₃ Sedang";
  return "VOC / CO₂ / NH₃ Tinggi";
}

function statusUdara(ppm){
  if (ppm < 400) return "BAIK";
  if (ppm < 800) return "SEDANG";
  if (ppm < 1500) return "BURUK";
  return "BERBAHAYA";
}

/* ================= ELEMENT ================= */
const tempValue = document.getElementById("tempValue");
const humValue  = document.getElementById("humValue");
const dustValue = document.getElementById("dustValue");
const gasValue  = document.getElementById("gasValue");
const gasType   = document.getElementById("gasType");
const airStatus = document.getElementById("airStatus");

/* ================= CHART ================= */
const ctx = document.getElementById("trendChart").getContext("2d");

const trendChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Suhu (°C)", data: [], tension: 0.4 },
      { label: "Kelembapan (%)", data: [], tension: 0.4 },
      { label: "Gas (PPM)", data: [], tension: 0.4 },
      { label: "PM2.5 (µg/m³)", data: [], tension: 0.4 }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: "white" }
      }
    },
    scales: {
      x: { ticks: { color: "white" } },
      y: { ticks: { color: "white" } }
    }
  }
});

/* ================= UPDATE GRAFIK ================= */
function updateChart(waktu, suhu, hum, gas, debu) {
  trendChart.data.labels.push(waktu);
  trendChart.data.datasets[0].data.push(suhu);
  trendChart.data.datasets[1].data.push(hum);
  trendChart.data.datasets[2].data.push(gas);
  trendChart.data.datasets[3].data.push(debu);

  // Batasi 15 data terakhir
  if (trendChart.data.labels.length > 15) {
    trendChart.data.labels.shift();
    trendChart.data.datasets.forEach(ds => ds.data.shift());
  }

  trendChart.update();
}

/* ================= REALTIME FIREBASE ================= */
onValue(ref(db, "sensor"), (snap) => {
  const d = snap.val();
  if (!d) return;

  const suhu = Number(d.temperature);
  const hum  = Number(d.humidity);
  const gas  = Number(d.gas);
  const debu = Number(d.dust);

  tempValue.textContent = suhu.toFixed(1) + " °C";
  humValue.textContent  = hum.toFixed(0) + " %";
  dustValue.textContent = debu.toFixed(1) + " µg/m³";
  gasValue.textContent  = gas.toFixed(0) + " PPM";

  gasType.textContent = jenisGas(gas);

  const status = statusUdara(gas);
  airStatus.textContent = "AIR QUALITY STATUS : " + status;

  airStatus.style.background =
    status === "BAIK" ? "green" :
    status === "SEDANG" ? "orange" :
    status === "BURUK" ? "red" : "purple";

  // waktu realtime
  const waktu = new Date().toLocaleTimeString();

  updateChart(waktu, suhu, hum, gas, debu);
});


