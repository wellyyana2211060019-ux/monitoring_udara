import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { db } from "./config.js";

/* =============================
   DOM ELEMENTS
============================= */
const tempValue = document.getElementById("tempValue");
const humValue = document.getElementById("humValue");
const gasValue = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const airStatus = document.getElementById("airStatus");

const aqiValue = document.getElementById("aqiValue");
const aqiStatus = document.getElementById("aqiStatus");
const aqiCard = document.getElementById("aqiCard");

/* =============================
   AQI CALC (INFO ONLY)
============================= */
function map(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function calculateAQI(pm25) {
  let aqi = 0;

  if (pm25 <= 12) {
    aqi = map(pm25, 0, 12, 0, 50);
  } else if (pm25 <= 35.4) {
    aqi = map(pm25, 12.1, 35.4, 51, 100);
  } else if (pm25 <= 55.4) {
    aqi = map(pm25, 35.5, 55.4, 101, 150);
  } else if (pm25 <= 150.4) {
    aqi = map(pm25, 55.5, 150.4, 151, 200);
  } else if (pm25 <= 250.4) {
    aqi = map(pm25, 150.5, 250.4, 201, 300);
  } else {
    aqi = 500;
  }

  return Math.round(aqi);
}

/* =============================
   REALTIME SENSOR LISTENER
============================= */
let latestData = { gas: 0, temp: 0, hum: 0, dust: 0, status: "BAIK" };

onValue(ref(db, "sensor"), snap => {
  const d = snap.val();
  if (!d) return;

  // ===== RAW DATA FROM ARDUINO =====
  const temp = d.temperature;
  const hum = d.humidity;
  const gas = d.gas;
  const dust = d.dust;
  const status = String(d.status).trim().toUpperCase(); // SOURCE OF TRUTH

  // ===== UI UPDATE =====
  tempValue.textContent = Number(temp).toFixed(1) + " °C";
  humValue.textContent = Number(hum).toFixed(1) + " %";
  gasValue.textContent = Number(gas).toFixed(1) + " PPM";
  dustValue.textContent = Number(dust).toFixed(1) + " µg/m³";

  airStatus.textContent = status;
  airStatus.className = {
    BAIK: "status-good",
    SEDANG: "status-medium",
    BURUK: "status-bad"
  }[status] || "";

  // ===== AQI (ANGKA DARI PM2.5, STATUS DARI ARDUINO) =====
  const aqiNumber = calculateAQI(dust);
  aqiValue.textContent = aqiNumber;
  aqiStatus.textContent = status;

  const AQI_CLASS = {
    BAIK: "aqi-good",
    SEDANG: "aqi-moderate",
    BURUK: "aqi-unhealthy"
  };

  aqiCard.className = "aqi-card";
  aqiCard.classList.add(AQI_CLASS[status] || "aqi-good");

  // ===== SAVE FOR TREND =====
  latestData = { gas, temp, hum, dust, status };
});

/* =============================
   TREND CHART (REALTIME ONLY)
============================= */
const MAX_POINTS = 3600;
const ctx = document.getElementById("trendChart").getContext("2d");

const trendChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Gas (PPM)", data: [], borderColor: "#22c55e", tension: 0.4 },
      { label: "Temp (°C)", data: [], borderColor: "#ef4444", tension: 0.4 },
      { label: "Hum (%)", data: [], borderColor: "#38bdf8", tension: 0.4 },
      { label: "Dust (µg/m³)", data: [], borderColor: "#a78bfa", tension: 0.4 }
    ]
  },
  options: {
    responsive: true,
    animation: false,
    scales: {
      y: { beginAtZero: true },
      x: {
        type: "time",
        time: { unit: "second" },
        ticks: { maxTicksLimit: 10 }
      }
    }
  }
});

/* =============================
   PUSH DATA EVERY 1 SECOND
============================= */
setInterval(() => {
  const t = new Date();
  const now = t.getTime();

  trendChart.data.labels.push(t);
  trendChart.data.datasets[0].data.push(latestData.gas);
  trendChart.data.datasets[1].data.push(latestData.temp);
  trendChart.data.datasets[2].data.push(latestData.hum);
  trendChart.data.datasets[3].data.push(latestData.dust);

  if (trendChart.data.labels.length > MAX_POINTS) {
    trendChart.data.labels.shift();
    trendChart.data.datasets.forEach(ds => ds.data.shift());
  }

  const currentMax = trendChart.scales.x.max;
  const isAtEdge = !currentMax || (now - currentMax) < 2000;

  if (isAtEdge) {
    trendChart.options.scales.x.min = now - 10000;
    trendChart.options.scales.x.max = now;
  }

  trendChart.update("none");
}, 1000);
