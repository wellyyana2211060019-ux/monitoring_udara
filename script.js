/* ================= FIREBASE IMPORT ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  query,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ================= FIREBASE CONFIG ================= */
const firebaseConfig = {
  apiKey: "AIzaSyDNx_YJ8sXo-PQzBhwTCoeLeaymaN_Wifc",
  authDomain: "airqualitymonitoring-28fa9.firebaseapp.com",
  databaseURL: "https://airqualitymonitoring-28fa9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "airqualitymonitoring-28fa9",
  messagingSenderId: "772590326433",
  appId: "1:772590326433:web:ff356431c0bfb606a496e0"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

/* ================= LOGIKA GAS ================= */
function jenisGas(ppm){
  if(ppm < 400)  return "Healthy Air";
  if(ppm < 800)  return "Low CO₂";
  if(ppm < 1200) return "Light VOC";
  if(ppm < 2000) return "Medium VOC / NH₃";
  return "High Mixed Gas";
}

/* ================= STATUS ================= */
function mapStatusFirebase(status){
  if(!status) return "UNKNOWN";
  status = status.toLowerCase();

  if(status === "baik")   return "HEALTHY";
  if(status === "sedang") return "MODERATE";
  if(status === "buruk")  return "UNHEALTHY";
  if(status === "bahaya") return "DANGEROUS";

  return "UNKNOWN";
}

/* ================= UPDATE CARD COLOR ================= */
function updateCardStatus(status){
  document.querySelectorAll(".card").forEach(card=>{
    card.classList.remove(
      "status-healthy",
      "status-moderate",
      "status-unhealthy",
      "status-danger"
    );

    if(status === "HEALTHY")    card.classList.add("status-healthy");
    if(status === "MODERATE")   card.classList.add("status-moderate");
    if(status === "UNHEALTHY")  card.classList.add("status-unhealthy");
    if(status === "DANGEROUS")  card.classList.add("status-danger");
  });
}

/* ================= ELEMENT ================= */
const tempValue = document.getElementById("tempValue");
const humValue  = document.getElementById("humValue");
const gasValue  = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const gasType   = document.getElementById("gasType");
const airStatus = document.getElementById("airStatus");

/* ================= CHART TREND ================= */
const ctx = document.getElementById("trendChart")?.getContext("2d");

let trendChart = null;

if(ctx){
  const gradGas = ctx.createLinearGradient(0,0,0,200);
  gradGas.addColorStop(0,"rgba(255,120,120,.4)");
  gradGas.addColorStop(1,"rgba(255,120,120,0)");

  trendChart = new Chart(ctx,{
    type:"line",
    data:{
      labels:[],
      datasets:[{
        label:"Gas (PPM)",
        data:[],
        borderColor:"#ff7b7b",
        backgroundColor:gradGas,
        fill:true,
        tension:0.4,
        pointRadius:3
      }]
    },
    options:{
      responsive:true,
      animation:false,
      plugins:{ legend:{labels:{color:"#e0f2f1"}} },
      scales:{
        x:{ticks:{color:"#b0bec5"}},
        y:{ticks:{color:"#b0bec5"}}
      }
    }
  });
}

function updateChart(label, value){
  if(!trendChart) return;

  trendChart.data.labels.push(label);
  trendChart.data.datasets[0].data.push(value);

  if(trendChart.data.labels.length > 12){
    trendChart.data.labels.shift();
    trendChart.data.datasets[0].data.shift();
  }
  trendChart.update();
}

/* ================= REALTIME DASHBOARD ================= */
onValue(ref(db,"sensor"), snap=>{
  const d = snap.val();
  if(!d) return;

  const gasNum = Math.round(Number(d.gas));
  const status = mapStatusFirebase(d.status);

  tempValue.textContent = Number(d.temperature).toFixed(1)+" °C";
  humValue.textContent  = Number(d.humidity).toFixed(0)+" %";
  gasValue.textContent  = gasNum+" PPM";
  dustValue.textContent = Number(d.dust).toFixed(1)+" µg/m³";
  gasType.textContent   = jenisGas(gasNum);

  airStatus.textContent = "AIR QUALITY STATUS : " + status;
  airStatus.style.background =
    status==="HEALTHY"   ? "#1b5e20" :
    status==="MODERATE"  ? "#f9a825" :
    status==="UNHEALTHY" ? "#c62828" :
    status==="DANGEROUS" ? "#6a1b9a" : "#37474f";

  updateCardStatus(status);
  updateChart(new Date().toLocaleTimeString(), gasNum);
});

/* ================= HISTORY TABLE ================= */
const historyBody = document.getElementById("historyBody");

if(historyBody){
  const q = query(ref(db,"history"), limitToLast(30));
  onValue(q,snap=>{
    historyBody.innerHTML="";
    snap.forEach(child=>{
      const d = child.val();
      historyBody.insertAdjacentHTML("afterbegin",`
        <tr>
          <td>${new Date(d.timestamp*1000).toLocaleString()}</td>
          <td>${d.temperature} °C</td>
          <td>${d.humidity} %</td>
          <td>${d.gas} PPM</td>
          <td>${d.dust} µg/m³</td>
          <td>${mapStatusFirebase(d.status)}</td>
        </tr>
      `);
    });
  });
}

/* ================= NAVIGATION ================= */
document.querySelectorAll(".nav-link").forEach(link=>{
  link.addEventListener("click",e=>{
    e.preventDefault();
    const target = link.dataset.target;

    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.getElementById(target)?.classList.add("active");

    document.querySelectorAll(".nav-link").forEach(l=>l.classList.remove("active"));
    link.classList.add("active");
  });
});

/* ================= INFO POPUP ================= */
document.querySelectorAll(".info-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    alert(btn.dataset.info);
  });
});

console.log("✅ DASHBOARD SCRIPT FIXED & STABLE");
