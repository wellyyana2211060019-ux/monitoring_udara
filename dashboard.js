/* =============================
   FIREBASE INIT
============================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNx_YJ8sXo-PQzBhwTCoeLeaymaN_Wifc",
  authDomain: "airqualitymonitoring-28fa9.firebaseapp.com",
  databaseURL: "https://airqualitymonitoring-28fa9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "airqualitymonitoring-28fa9",
  messagingSenderId: "772590326433",
  appId: "1:772590326433:web:ff356431c0bfb606a496e0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* =============================
   DOM ELEMENTS
============================= */
const tempValue = document.getElementById("tempValue");
const humValue  = document.getElementById("humValue");
const gasValue  = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const airStatus = document.getElementById("airStatus");

const aqiValue  = document.getElementById("aqiValue");
const aqiStatus = document.getElementById("aqiStatus");
const aqiCard   = document.getElementById("aqiCard");

/* =============================
   AQI CALC (INFO ONLY)
============================= */
function map(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function calculateAQI(pm25) {
  let aqi = 0;
  let cat = "good";

  if (pm25 <= 12) {
    aqi = map(pm25, 0, 12, 0, 50);
    cat = "good";
  } else if (pm25 <= 35.4) {
    aqi = map(pm25, 12.1, 35.4, 51, 100);
    cat = "moderate";
  } else if (pm25 <= 55.4) {
    aqi = map(pm25, 35.5, 55.4, 101, 150);
    cat = "sensitive";
  } else if (pm25 <= 150.4) {
    aqi = map(pm25, 55.5, 150.4, 151, 200);
    cat = "unhealthy";
  } else if (pm25 <= 250.4) {
    aqi = map(pm25, 150.5, 250.4, 201, 300);
    cat = "very";
  } else {
    aqi = 500;
    cat = "hazardous";
  }

  return { val: Math.round(aqi), cat };
}

const AQI_LABEL = {
  good: "Baik",
  moderate: "Sedang",
  sensitive: "Tidak Sehat (Sensitif)",
  unhealthy: "Tidak Sehat",
  very: "Sangat Tidak Sehat",
  hazardous: "Berbahaya"
};

/* =============================
   REALTIME SENSOR LISTENER
============================= */
let latestData = { gas: 0, temp: 0, hum: 0, dust: 0 };

onValue(ref(db, "sensor"), snap => {
  const d = snap.val();
  if (!d) return;

  // ===== RAW DATA FROM ARDUINO =====
  const temp  = d.temperature;
  const hum   = d.humidity;
  const gas   = d.gas;
  const dust  = d.dust;
  const status = d.status; // 🔥 SOURCE OF TRUTH

  // ===== UI UPDATE =====
  tempValue.textContent = temp.toFixed(1) + " °C";
  humValue.textContent  = hum.toFixed(1) + " %";
  gasValue.textContent  = gas.toFixed(1) + " PPM";
  dustValue.textContent = dust.toFixed(1) + " µg/m³";

  airStatus.textContent = status;
  airStatus.className = {
    BAIK: "status-good",
    SEDANG: "status-medium",
    BURUK: "status-bad"
  }[status] || "";

  // ===== AQI (INFO ONLY, NOT STATUS) =====
  const aqi = calculateAQI(dust);
  aqiValue.textContent = aqi.val;
  aqiStatus.textContent = AQI_LABEL[aqi.cat];
  aqiCard.className = "aqi-card aqi-" + aqi.cat;

  // ===== SAVE FOR TREND =====
  latestData = { gas, temp, hum, dust };
});

/* =============================
   TREND CHART (REALTIME ONLY)
============================= */
const MAX_POINTS = 300;
const ctx = document.getElementById("trendChart").getContext("2d");

const trendChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Gas (PPM)", data: [], borderColor: "#22c55e", tension: 0.4 },
      { label: "Temp (°C)", data: [], borderColor: "#ef4444", tension: 0.4 },
      { label: "Hum (%)",  data: [], borderColor: "#38bdf8", tension: 0.4 },
      { label: "Dust (µg/m³)", data: [], borderColor: "#a78bfa", tension: 0.4 }
    ]
  },
  options: {
    responsive: true,
    animation: false,
    scales: {
      y: { beginAtZero: true },
      x: { display: false }
    }
  }
});

// PUSH DATA EVERY 1 SECOND (DISPLAY ONLY)
setInterval(() => {
  const t = new Date().toLocaleTimeString();

  trendChart.data.labels.push(t);
  trendChart.data.datasets[0].data.push(latestData.gas);
  trendChart.data.datasets[1].data.push(latestData.temp);
  trendChart.data.datasets[2].data.push(latestData.hum);
  trendChart.data.datasets[3].data.push(latestData.dust);

  if (trendChart.data.labels.length > MAX_POINTS) {
    trendChart.data.labels.shift();
    trendChart.data.datasets.forEach(ds => ds.data.shift());
  }

  trendChart.update("none");
}, 1000);
