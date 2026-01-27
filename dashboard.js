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
   AQI CALC (ANGKA SAJA)
============================= */
function map(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function calculateAQI(pm25) {
  if (pm25 <= 12) return Math.round(map(pm25, 0, 12, 0, 50));
  if (pm25 <= 35.4) return Math.round(map(pm25, 12.1, 35.4, 51, 100));
  if (pm25 <= 55.4) return Math.round(map(pm25, 35.5, 55.4, 101, 150));
  if (pm25 <= 150.4) return Math.round(map(pm25, 55.5, 150.4, 151, 200));
  if (pm25 <= 250.4) return Math.round(map(pm25, 150.5, 250.4, 201, 300));
  return 500;
}

/* =============================
   STATUS INDICATOR (NON AQI RESMI)
============================= */
const aqiData = {
  BAIK: {
    label: "Baik",
    kategori: "Indikator Kualitas Udara",
    range: "PM2.5 ≤ 35 µg/m³<br>Gas ≤ 5 ppm",
    health: "Udara bersih dan aman.",
    action: "Aman untuk semua aktivitas.",
    reference: "WHO & US EPA – Indoor Air Quality",
    class: "aqi-good"
  },
  SEDANG: {
    label: "Sedang",
    kategori: "Indikator Kualitas Udara",
    range: "PM2.5 36–75 µg/m³<br>Gas 6–10 ppm",
    health: "Kelompok sensitif dapat terdampak.",
    action: "Kurangi aktivitas berat.",
    reference: "WHO & US EPA – Indoor Air Quality",
    class: "aqi-moderate"
  },
  BURUK: {
    label: "Buruk",
    kategori: "Indikator Kualitas Udara",
    range: "PM2.5 > 75 µg/m³<br>Gas > 10 ppm",
    health: "Berisiko bagi kesehatan.",
    action: "Gunakan masker, batasi aktivitas.",
    reference: "WHO & US EPA – Indoor Air Quality",
    class: "aqi-unhealthy"
  }
};

/* =============================
   REALTIME SENSOR LISTENER
============================= */
let latestData = { gas: 0, temp: 0, hum: 0, dust: 0, status: "BAIK" };

onValue(ref(db, "sensor"), snap => {
  const d = snap.val();
  if (!d) return;

  const status = String(d.status).trim().toUpperCase();

  tempValue.textContent = `${Number(d.temperature).toFixed(1)} °C`;
  humValue.textContent = `${Number(d.humidity).toFixed(1)} %`;
  gasValue.textContent = `${Number(d.gas).toFixed(1)} PPM`;
  dustValue.textContent = `${Number(d.dust).toFixed(1)} µg/m³`;

  airStatus.textContent = status;
  airStatus.className = {
    BAIK: "status-good",
    SEDANG: "status-medium",
    BURUK: "status-bad"
  }[status] || "";

  aqiValue.textContent = calculateAQI(d.dust);

  const info = aqiData[status] || aqiData.BAIK;
  aqiStatus.textContent = info.label;
  aqiCard.className = `aqi-card ${info.class}`;

  latestData = {
    gas: Number(d.gas),
    temp: Number(d.temperature),
    hum: Number(d.humidity),
    dust: Number(d.dust),
    status
  };
});

/* =============================
   TREND CHART (DASHBOARD)
============================= */
const canvas = document.getElementById("trendChart");
let trendChart = null;

if (canvas) {
  trendChart = new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        { label: "Gas (PPM)", data: [], borderColor: "#22c55e", tension: 0.3 },
        { label: "Temperature (°C)", data: [], borderColor: "#ef4444", tension: 0.3 },
        { label: "Humidity (%)", data: [], borderColor: "#38bdf8", tension: 0.3 },
        { label: "Dust (µg/m³)", data: [], borderColor: "#a78bfa", tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      parsing: false,
      scales: {
        x: { type: "time", time: { tooltipFormat: "HH:mm:ss" } },
        y: { beginAtZero: true }
      },
      plugins: {
        zoom: {
          pan: { enabled: true, mode: "x", modifierKey: "ctrl" },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" }
        }
      }
    }
  });
}

/* =============================
   REALTIME UPDATE (STABIL)
============================= */
setInterval(() => {
  if (!trendChart) return;

  const t = new Date();

  trendChart.data.datasets[0].data.push({ x: t, y: latestData.gas });
  trendChart.data.datasets[1].data.push({ x: t, y: latestData.temp });
  trendChart.data.datasets[2].data.push({ x: t, y: latestData.hum });
  trendChart.data.datasets[3].data.push({ x: t, y: latestData.dust });

  trendChart.data.datasets.forEach(ds => {
    if (ds.data.length > 60) ds.data.shift();
  });

  trendChart.update("none");
}, 1000);
