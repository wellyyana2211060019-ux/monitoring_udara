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
/* ================= AQI ================= */

// hitung AQI (rumus interpolasi)
function hitungAQI(C, Clow, Chigh, Ilow, Ihigh){
  return Math.round(((Ihigh - Ilow) / (Chigh - Clow)) * (C - Clow) + Ilow);
}

// AQI PM2.5
function aqiPM25(pm){
  if(pm <= 12) return hitungAQI(pm,0,12,0,50);
  if(pm <= 35.4) return hitungAQI(pm,12.1,35.4,51,100);
  if(pm <= 55.4) return hitungAQI(pm,35.5,55.4,101,150);
  if(pm <= 150.4) return hitungAQI(pm,55.5,150.4,151,200);
  if(pm <= 250.4) return hitungAQI(pm,150.5,250.4,201,300);
  return hitungAQI(pm,250.5,500.4,301,500);
}

// AQI Gas (CO ekuivalen)
function aqiGas(ppm){
  if(ppm <= 4.4) return hitungAQI(ppm,0,4.4,0,50);
  if(ppm <= 9.4) return hitungAQI(ppm,4.5,9.4,51,100);
  if(ppm <= 12.4) return hitungAQI(ppm,9.5,12.4,101,150);
  if(ppm <= 15.4) return hitungAQI(ppm,12.5,15.4,151,200);
  if(ppm <= 30.4) return hitungAQI(ppm,15.5,30.4,201,300);
  return hitungAQI(ppm,30.5,50.4,301,500);
}

// kategori AQI
function kategoriAQI(aqi){
  if(aqi <= 50) return "BAIK";
  if(aqi <= 100) return "SEDANG";
  if(aqi <= 150) return "TIDAK SEHAT (SENSITIF)";
  if(aqi <= 200) return "TIDAK SEHAT";
  if(aqi <= 300) return "SANGAT TIDAK SEHAT";
  return "BERBAHAYA";
}

/* ================= STATUS DARI FIREBASE ================= */
function mapStatusFirebase(status){
  if(!status) return "UNKNOWN";
  status = status.toLowerCase();

  if(status === "baik") return "HEALTHY";
  if(status === "sedang") return "MODERATE";
  if(status === "buruk") return "UNHEALTHY";
  if(status === "bahaya") return "DANGEROUS";

  return "UNKNOWN";
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

    if(status === "HEALTHY") card.classList.add("status-healthy");
    if(status === "MODERATE") card.classList.add("status-moderate");
    if(status === "UNHEALTHY") card.classList.add("status-unhealthy");
    if(status === "DANGEROUS") card.classList.add("status-danger");
  });
}

/* ================= ELEMENT ================= */
const tempValue = document.getElementById("tempValue");
const humValue  = document.getElementById("humValue");
const gasValue  = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const gasType   = document.getElementById("gasType");
const airStatus = document.getElementById("airStatus");

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
  options:{
    responsive:true,
    plugins:{ legend:{labels:{color:"#e0f2f1"}} },
    scales:{
      x:{ticks:{color:"#b0bec5"}},
      y:{ticks:{color:"#b0bec5"}}
    }
  }
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
  const status = mapStatusFirebase(d.status);

  tempValue.textContent = Number(d.temperature).toFixed(1)+" °C";
  humValue.textContent  = Number(d.humidity).toFixed(0)+" %";
  gasValue.textContent  = gasNum+" PPM";
  dustValue.textContent = Number(d.dust).toFixed(1)+" µg/m³";
  gasType.textContent   = jenisGas(gasNum);

  airStatus.textContent = "AIR QUALITY STATUS : " + status;
  airStatus.style.background =
    status==="HEALTHY"?"#1b5e20":
    status==="MODERATE"?"#f9a825":
    status==="UNHEALTHY"?"#c62828":
    status==="DANGEROUS"?"#6a1b9a":"#37474f";

  updateCardStatus(status);
  updateChart(new Date().toLocaleTimeString(), gasNum);
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
        <td>${mapStatusFirebase(d.status)}</td>
      </tr>` + historyBody.innerHTML;
    });
  });
}

/* ================= NAVIGATION ================= */
document.querySelectorAll(".nav-link").forEach(link=>{
  link.addEventListener("click",e=>{
    e.preventDefault();
    const target = link.textContent.toLowerCase();

    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.getElementById(`page-${target}`).classList.add("active");

    document.querySelectorAll(".nav-link").forEach(l=>l.classList.remove("active"));
    link.classList.add("active");
  });
});

/* ================= INFO POPUP (ℹ️ CARD) ================= */
document.querySelectorAll(".info-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    alert(btn.dataset.info);
  });
});

console.log("✅ SCRIPT DASHBOARD LENGKAP & BERHASIL JALAN");



