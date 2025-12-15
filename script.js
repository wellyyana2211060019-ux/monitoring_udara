import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ================= FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyDNx_YJ8sXo-PQzBhwTCoeLeaymaN_Wifc",
  FIREBASE_SECRET: "pUiWkItaGg7wSAuEU5U6swbnRLb9QiFId4UObTwG",
  authDomain: "airqualitymonitoring-28fa9.firebaseapp.com",
  databaseURL: "https://airqualitymonitoring-28fa9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "airqualitymonitoring-28fa9",
  storageBucket: "airqualitymonitoring-28fa9.firebasestorage.app",
  messagingSenderId: "772590326433",
  appId: "1:772590326433:web:ff356431c0bfb606a496e0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ================= LOGIKA GAS =================
function jenisGas(ppm){
  if (ppm < 400)
    return "Udara Bersih";

  if (ppm < 800)
    return "CO₂ Rendah (Aktivitas Manusia)";

  if (ppm < 1200)
    return "VOC Ringan / Alkohol";

  if (ppm < 2000)
    return "VOC / NH₃ Sedang";

  return "VOC / CO₂ / NH₃ Tinggi (Campuran Gas)";
}
function statusUdara(ppm){
  if (ppm < 400)  return "BAIK";
  if (ppm < 800)  return "SEDANG";
  if (ppm < 1500) return "BURUK";
  return "BERBAHAYA";
}

// ================= ELEMENT =================
const tempValue = document.getElementById("tempValue");
const humValue  = document.getElementById("humValue");
const dustValue = document.getElementById("dustValue");
const gasValue  = document.getElementById("gasValue");
const gasType   = document.getElementById("gasType");
const airStatus = document.getElementById("airStatus");

// ================= REALTIME =================
onValue(ref(db, "sensor"), (snap)=>{
  const d = snap.val();
  if(!d) return;

  const gas = Number(d.gas);

  tempValue.textContent = Number(d.temperature).toFixed(1) + " °C";
  humValue.textContent  = Number(d.humidity).toFixed(0) + " %";
  dustValue.textContent = Number(d.dust).toFixed(1) + " µg/m³";
  gasValue.textContent  = gas.toFixed(0) + " PPM";

  gasType.textContent = jenisGas(gas);

  const status = statusUdara(gas);
  airStatus.textContent = "AIR QUALITY STATUS : " + status;

  airStatus.style.backgroundColor =
    status === "BAIK" ? "green" :
    status === "SEDANG" ? "orange" :
    status === "BURUK" ? "red" : "purple";
});

