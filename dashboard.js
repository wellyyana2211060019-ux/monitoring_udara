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
   ISPU NASIONAL (PM2.5)
========================= */
const ispuMap = {
  "BAIK": {
    label: "Baik",
    class: "aqi-good",
    aqi: 50
  },
  "SEDANG": {
    label: "Sedang",
    class: "aqi-moderate",
    aqi: 100
  },
  "BURUK": {
    label: "Tidak Sehat",
    class: "aqi-unhealthy",
    aqi: 200
  }
};

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
  const statusArduino = d.status || "BAIK";

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

  /* =========================
     🔥 SINKRON STATUS ARDUINO
     ISPU NASIONAL
  ========================= */
  const s = ispuMap[statusArduino];

  if (s) {
    aqiValue.textContent = s.aqi;
    aqiStatus.textContent = s.label;
    aqiCard.className = "aqi-card " + s.class;
  }
});

/* =========================
   HISTORY (TETAP)
========================= */
let lastStatus = null;

onValue(ref(db, "sensor"), snap => {
  const d = snap.val();
  if (!d || !d.status) return;

  if (lastStatus === null) {
    lastStatus = d.status;
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

    lastStatus = d.status;
  }
});
