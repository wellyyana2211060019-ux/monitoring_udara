
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, query, limitToLast } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ================= FIREBASE ================= */
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

/* ================= LOGIKA GAS ================= */
function jenisGas(ppm){
  if(ppm < 400) return "Healthy Air";
  if(ppm < 800) return "Low CO₂";
  if(ppm < 1200) return "Light VOC";
  if(ppm < 2000) return "Medium VOC / NH₃";
  return "High Mixed Gas";
}

/* ================= ISPU KLHK ================= */
function hitungISPU(C, Clow, Chigh, Ilow, Ihigh){
  return Math.round(((Ihigh - Ilow) / (Chigh - Clow)) * (C - Clow) + Ilow);
}

// ISPU PM2.5 (KLHK)
function ispuPM25(pm){
  if(pm <= 15.5) return hitungISPU(pm,0,15.5,0,50);
  if(pm <= 55.4) return hitungISPU(pm,15.6,55.4,51,100);
  if(pm <= 150.4) return hitungISPU(pm,55.5,150.4,101,200);
  if(pm <= 250.4) return hitungISPU(pm,150.5,250.4,201,300);
  return hitungISPU(pm,250.5,500,301,500);
}

// ISPU Gas (indikatif MQ135)
function ispuGas(ppm){
  if(ppm <= 400) return 50;
  if(ppm <= 800) return 100;
  if(ppm <= 1200) return 200;
  if(ppm <= 2000) return 300;
  return 400;
}

// Kategori ISPU
function kategoriISPU(ispu){
  if(ispu <= 50) return "BAIK";
  if(ispu <= 100) return "SEDANG";
  if(ispu <= 200) return "TIDAK SEHAT";
  if(ispu <= 300) return "SANGAT TIDAK SEHAT";
  return "BERBAHAYA";
}

/* ================= UPDATE WARNA CARD ================= */
function updateCardStatus(status){
  document.querySelectorAll(".card").forEach(card=>{
    card.classList.remove(
      "status-healthy",
      "status-moderate",
      "status-unhealthy",
      "status-danger"
    );

    if(status === "BAIK") card.classList.add("status-healthy");
    if(status === "SEDANG") card.classList.add("status-moderate");
    if(status === "TIDAK SEHAT") card.classList.add("status-unhealthy");
    if(status === "SANGAT TIDAK SEHAT" || status === "BERBAHAYA")
      card.classList.add("status-danger");
  });
}

/* ================= ELEMENT ================= */
const tempValue = document.getElementById("tempValue");
const humValue  = document.getElementById("humValue");
const gasValue  = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const gasType   = document.getElementById("gasType");
const airStatus = document.getElementById("airStatus");

const ispuPM25El  = document.getElementById("ispuPM25");
const ispuGasEl   = document.getElementById("ispuGas");
const ispuFinalEl = document.getElementById("ispuFinal");
const ispuCatEl   = document.getElementById("ispuCategory");

/* ================= CHART ================= */
const ctx = document.getElementById("trendChart").getContext("2d");
const gradGas = ctx.createLinearGradient(0,0,0,200);
gradGas.addColorStop(0,"rgba(255,120,120,.4)");
gradGas.addColorStop(1,"rgba(255,120,120,0)");

const chart = new Chart(ctx,{
  type:"line",
  data:{
    labels:[],
    datasets:[{
      label:"Gas (PPM)",
      data:[],
      borderColor:"#ff7b7b",
      backgroundColor:gradGas,
      fill:true,
      tension:.4,
      pointRadius:3
    }]
  },
  options:{ responsive:true }
});

function updateChart(time,gas){
  chart.data.labels.push(time);
  chart.data.datasets[0].data.push(gas);
  if(chart.data.labels.length > 12){
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update();
}

/* ================= DASHBOARD ================= */
onValue(ref(db,"sensor"),snap=>{
  const d = snap.val();
  if(!d) return;

  const gasNum = Number(String(Math.floor(Number(d.gas))).substring(0,3));
  const pm25   = Number(d.dust);

  tempValue.textContent = Number(d.temperature).toFixed(1)+" °C";
  humValue.textContent  = Number(d.humidity).toFixed(0)+" %";
  gasValue.textContent  = gasNum+" PPM";
  dustValue.textContent = pm25.toFixed(1)+" µg/m³";
  gasType.textContent   = jenisGas(gasNum);

  // === HITUNG ISPU ===
  const ispu_pm   = ispuPM25(pm25);
  const ispu_gas  = ispuGas(gasNum);
  const ispuFinal = Math.max(ispu_pm, ispu_gas);
  const ispuStat  = kategoriISPU(ispuFinal);

  airStatus.textContent = "STATUS ISPU : " + ispuStat;
  airStatus.style.background =
    ispuStat==="BAIK"?"#1b5e20":
    ispuStat==="SEDANG"?"#f9a825":
    ispuStat==="TIDAK SEHAT"?"#ef6c00":
    ispuStat==="SANGAT TIDAK SEHAT"?"#c62828":"#000";

  updateCardStatus(ispuStat);
  updateChart(new Date().toLocaleTimeString(), gasNum);

  // === SETTINGS PAGE ===
  if(ispuPM25El){
    ispuPM25El.textContent  = ispu_pm;
    ispuGasEl.textContent   = ispu_gas;
    ispuFinalEl.textContent = ispuFinal;
    ispuCatEl.textContent   = ispuStat;
  }
});

/* ================= HISTORY ================= */
const historyBody = document.getElementById("historyBody");
if(historyBody){
  const q = query(ref(db,"history"), limitToLast(20));
  onValue(q,snap=>{
    historyBody.innerHTML="";
    snap.forEach(child=>{
      const d = child.val();
      historyBody.innerHTML =
      `<tr>
        <td>${new Date(d.timestamp*1000).toLocaleString()}</td>
        <td>${d.temperature} °C</td>
        <td>${d.humidity} %</td>
        <td>${d.gas} PPM</td>
        <td>${d.dust} µg/m³</td>
        <td>${kategoriISPU(ispuPM25(d.dust))}</td>
      </tr>` + historyBody.innerHTML;
    });
  });
}

console.log("✅ ISPU KLHK AKTIF — SISTEM NASIONAL SIAP SIDANG");
