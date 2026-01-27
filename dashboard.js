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
   INDICATOR STATUS (DISESUAIKAN)
   → BUKAN AQI RESMI
   → BERDASARKAN AMBANG SENSOR
============================= */
const aqiData = {
  BAIK: {
    label: "Baik",
    kategori: "Indikator Kualitas Udara",
    range: `
      PM2.5 ≤ 35 µg/m³<br>
      Gas ≤ 5 ppm
    `,
    health: "Udara bersih, konsentrasi debu halus dan gas rendah sehingga aman bagi kesehatan.",
    action: "Aman dan nyaman untuk seluruh aktivitas di dalam ruangan.",
    reference: "WHO & US EPA – Indoor Air Quality Guidelines",
    class: "aqi-good"
  },

  SEDANG: {
    label: "Sedang",
    kategori: "Indikator Kualitas Udara",
    range: `
      PM2.5 36–75 µg/m³<br>
      Gas 6–10 ppm
    `,
    health: "Kualitas udara masih dapat diterima, namun kelompok sensitif dapat merasakan efek ringan.",
    action: "Kelompok sensitif disarankan mengurangi aktivitas berat.",
    reference: "WHO & US EPA – Indoor Air Quality Guidelines",
    class: "aqi-moderate"
  },

  BURUK: {
    label: "Buruk",
    kategori: "Indikator Kualitas Udara",
    range: `
      PM2.5 > 75 µg/m³<br>
      Gas > 10 ppm
    `,
    health: "Kualitas udara buruk akibat tingginya konsentrasi debu halus dan gas yang berbahaya.",
    action: "Disarankan membatasi aktivitas dan menggunakan masker.",
    reference: "WHO & US EPA – Indoor Air Quality Guidelines",
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

  const temp = d.temperature;
  const hum = d.humidity;
  const gas = d.gas;
  const dust = d.dust;
  const status = String(d.status).trim().toUpperCase();

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

  const aqiNumber = calculateAQI(dust);
  aqiValue.textContent = aqiNumber;

  const infoAQI = aqiData[status] || aqiData.BAIK;
  aqiStatus.textContent = infoAQI.label;
  aqiCard.className = "aqi-card " + infoAQI.class;

  latestData = { gas, temp, hum, dust, status };
});

/* =============================
   POPUP "APA ARTINYA?"
============================= */
const modal = document.getElementById("aqiModal");
const openBtn = document.getElementById("openModalBtn");
const closeBtn = document.querySelector(".close-btn");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalHealth");

if (openBtn) {
  openBtn.onclick = () => {
    const status = latestData.status || "BAIK";
    const info = aqiData[status];

    modalTitle.textContent = `Status Udara: ${info.label}`;
    modalContent.innerHTML = `
      <p><strong>Kategori:</strong> ${info.kategori}</p>
      <p><strong>Rentang Parameter:</strong><br>${info.range}</p>
      <p><strong>Dampak Kesehatan:</strong><br>${info.health}</p>
      <p><strong>Anjuran:</strong><br>${info.action}</p>
      <hr>
      <small><strong>Referensi:</strong> ${info.reference}</small>
    `;

    modal.style.display = "block";
  };
}

if (closeBtn) {
  closeBtn.onclick = () => modal.style.display = "none";
}

window.onclick = e => {
  if (e.target === modal) modal.style.display = "none";
};
/* =============================
   TREND CHART (DASHBOARD)
============================= */
const ctx = document.getElementById("trendChart");
let trendChart = null;

if (ctx) {
  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Gas (PPM)",
          data: [],
          borderColor: "#22c55e",
          tension: 0.4
        },
        {
          label: "Temperature (°C)",
          data: [],
          borderColor: "#ef4444",
          tension: 0.4
        },
        {
          label: "Humidity (%)",
          data: [],
          borderColor: "#38bdf8",
          tension: 0.4
        },
        {
          label: "Dust (µg/m³)",
          data: [],
          borderColor: "#a78bfa",
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: {
          type: "time",
          time: { unit: "second" },
          ticks: { maxTicksLimit: 10 }
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

/* =============================
   UPDATE CHART REALTIME
============================= */
setInterval(() => {
  if (!trendChart) return;

  const now = new Date();

  trendChart.data.labels.push(now);
  trendChart.data.datasets[0].data.push(latestData.gas);
  trendChart.data.datasets[1].data.push(latestData.temp);
  trendChart.data.datasets[2].data.push(latestData.hum);
  trendChart.data.datasets[3].data.push(latestData.dust);

  if (trendChart.data.labels.length > 60) {
    trendChart.data.labels.shift();
    trendChart.data.datasets.forEach(ds => ds.data.shift());
  }

  trendChart.update("none");
}, 1000);
