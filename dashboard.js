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
   AQI INFO (3 STATUS + PENJELASAN)
============================= */
const aqiData = {
  BAIK: {
    kategoriAQI: "Baik (AQI 0–50) → Sedang (AQI 51–100) → Buruk (AQI > 100)",
    label: "Baik",
    range: "AQI 0–50",
    health: "Kualitas udara sangat baik, konsentrasi gas dan debu rendah sehingga aman bagi kesehatan.",
    action: "Aman dan nyaman untuk seluruh aktivitas di dalam ruangan.",
    class: "aqi-good"
  },

  SEDANG: {
    kategoriAQI: "Baik (AQI 0–50) → Sedang (AQI 51–100) → Buruk (AQI > 100)",
    label: "Sedang",
    range: "AQI 51–100",
    health: "Kualitas udara masih dapat diterima, namun kelompok sensitif dapat mulai merasakan dampak ringan.",
    action: "Kelompok sensitif disarankan mengurangi aktivitas berat di dalam ruangan.",
    class: "aqi-moderate"
  },

  BURUK: {
    kategoriAQI: "Baik (AQI 0–50) → Sedang (AQI 51–100) → Buruk (AQI > 100)",
    label: "Buruk",
    range: "AQI > 100",
    health: "Kualitas udara buruk akibat tingginya konsentrasi gas dan debu yang berpotensi membahayakan kesehatan.",
    action: "Disarankan menghindari aktivitas di dalam ruangan dan menggunakan masker.",
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
      <p><strong>Kategori AQI:</strong> ${info.kategoriAQI}</p>
      <p><strong>Rentang:</strong> ${info.range}</p>
      <p><strong>Dampak Kesehatan:</strong> ${info.health}</p>
      <p><strong>Anjuran:</strong> ${info.action}</p>
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
