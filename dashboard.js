import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* =========================
   FIREBASE INIT
========================= */
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

/* =========================
   HELPER
========================= */
function jenisGas(ppm) {
  if (ppm < 400) return "Healthy Air";
  if (ppm < 800) return "Low CO₂";
  if (ppm < 1200) return "Light VOC";
  if (ppm < 2000) return "Medium VOC";
  return "High Mixed Gas";
}

/* =========================
   DOM ELEMENTS
========================= */
const tempValue = document.getElementById("tempValue");
const humValue = document.getElementById("humValue");
const gasValue = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const gasType = document.getElementById("gasType");

const co2Value = document.getElementById("co2Value");
const coValue = document.getElementById("coValue");
const no2Value = document.getElementById("no2Value");
const so2Value = document.getElementById("so2Value");
const o3Value = document.getElementById("o3Value");

const aqiValue = document.getElementById("aqiValue");
const aqiStatus = document.getElementById("aqiStatus");
const aqiCard = document.getElementById("aqiCard");

/* =========================
   AQI DATA
========================= */
const aqiData = {
  good: { label: "Baik", class: "aqi-good" },
  moderate: { label: "Sedang", class: "aqi-moderate" },
  sensitive: { label: "Tidak Sehat Sensitif", class: "aqi-sensitive" },
  unhealthy: { label: "Tidak Sehat", class: "aqi-unhealthy" },
  very: { label: "Sangat Tidak Sehat", class: "aqi-very-unhealthy" },
  hazardous: { label: "Berbahaya", class: "aqi-hazardous" }
};

let currentAqiCategory = "good";

/* =========================
   AQI CALCULATION
========================= */
function calculateAQI(dust) {
  let aqi = 0;
  let category = "good";

  if (dust <= 12) {
    aqi = map(dust, 0, 12, 0, 50);
    category = "good";
  } else if (dust <= 35.4) {
    aqi = map(dust, 12.1, 35.4, 51, 100);
    category = "moderate";
  } else if (dust <= 55.4) {
    aqi = map(dust, 35.5, 55.4, 101, 150);
    category = "sensitive";
  } else if (dust <= 150.4) {
    aqi = map(dust, 55.5, 150.4, 151, 200);
    category = "unhealthy";
  } else if (dust <= 250.4) {
    aqi = map(dust, 150.5, 250.4, 201, 300);
    category = "very";
  } else {
    aqi = 500;
    category = "hazardous";
  }

  return { val: Math.round(aqi), cat: category };
}

function map(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

/* =========================
   REALTIME SENSOR
========================= */
let latestData = { gas: 0, temp: 0, hum: 0, dust: 0 };

function resolveGasValue(data, keys) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== 0) {
      return data[key];
    }
  }
  return "--";
}

onValue(ref(db, "sensor"), snap => {
  const d = snap.val();
  if (!d) return;

  const gas = Math.round(d.gas);
  const dust = d.dust || 0;

  latestData = {
    gas,
    temp: d.temperature,
    hum: d.humidity,
    dust
  };

  tempValue.textContent = d.temperature + " °C";
  humValue.textContent = d.humidity + " %";
  gasValue.textContent = gas + " PPM";
  dustValue.textContent = dust + " µg/m³";
  gasType.textContent = jenisGas(gas);

  if (co2Value) co2Value.innerHTML = resolveGasValue(d, ["co2", "gas"]) + " ppm";
  if (coValue) coValue.innerHTML = resolveGasValue(d, ["co"]) + " ppm";
  if (no2Value) no2Value.innerHTML = resolveGasValue(d, ["no2"]) + " ppm";
  if (so2Value) so2Value.innerHTML = resolveGasValue(d, ["so2"]) + " ppm";
  if (o3Value) o3Value.innerHTML = resolveGasValue(d, ["o3"]) + " ppm";

  const aqiResult = calculateAQI(dust);
  currentAqiCategory = aqiResult.cat;

  aqiValue.textContent = aqiResult.val;
  aqiStatus.textContent = aqiData[currentAqiCategory].label;
  aqiCard.className = "aqi-card " + aqiData[currentAqiCategory].class;
});

/* =========================
   🔥 FIXED HISTORY LOGIC
   SIMPAN HANYA SAAT STATUS BERUBAH
========================= */
let lastStatus = null;

onValue(ref(db, "sensor"), snap => {
  const d = snap.val();
  if (!d || !d.status) return;

  if (lastStatus === null) {
    lastStatus = d.status; // sync awal
    return;
  }

  if (d.status !== lastStatus) {
    push(ref(db, "history"), {
      temperature: d.temperature,
      humidity: d.humidity,
      gas: d.gas,
      dust: d.dust,
      status: d.status,
      timestamp: d.timestamp ? d.timestamp * 1000 : Date.now()
    });

    console.log("✅ HISTORY DISIMPAN:", d.status);
    lastStatus = d.status;
  }
});
