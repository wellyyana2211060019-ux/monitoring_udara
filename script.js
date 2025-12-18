import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

function updateCardStatus(status){
  const cards = document.querySelectorAll(".card");
  cards.forEach(card=>{
    card.classList.remove(
      "status-healthy",
      "status-moderate",
      "status-unhealthy",
      "status-danger"
    );

    if(status === "HEALTHY") card.classList.add("status-healthy");
    else if(status === "MODERATE") card.classList.add("status-moderate");
    else if(status === "UNHEALTHY") card.classList.add("status-unhealthy");
    else if(status === "DANGEROUS") card.classList.add("status-danger");
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
    plugins:{
      legend:{labels:{color:"#e0f2f1"}}
    },
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

/* ================= REALTIME FIREBASE ================= */
onValue(ref(db,"sensor"),snap=>{
  const d = snap.val();
  if(!d) return;

  const t = Number(d.temperature);
  const h = Number(d.humidity);
  const p = Number(d.dust);
  const gasNum = Math.floor(Number(d.gas));

  tempValue.textContent = t.toFixed(1)+" °C";
  humValue.textContent  = h.toFixed(0)+" %";
  gasValue.textContent  = gasNum+" PPM";
  dustValue.textContent = p.toFixed(1)+" µg/m³";

  gasType.textContent = jenisGas(gasNum);

  /* 🔥 STATUS DIAMBIL LANGSUNG DARI FIREBASE */
  const status = mapStatusFirebase(d.status);

  airStatus.textContent = "STATUS : " + status;

  airStatus.style.background =
    status==="HEALTHY"?"#1b5e20":
    status==="MODERATE"?"#f9a825":
    status==="UNHEALTHY"?"#c62828":
    status==="DANGEROUS"?"#6a1b9a":"#37474f";

  updateCardStatus(status);
  updateChart(new Date().toLocaleTimeString(), gasNum);
});

console.log("SCRIPT BERHASIL JALAN");

