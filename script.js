import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, query, limitToLast } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNx_YJ8sXo-PQzBhwTCoeLeaymaN_Wifc",
  databaseURL: "https://airqualitymonitoring-28fa9-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function jenisGas(ppm){
  if(ppm < 400) return "Healthy Air";
  if(ppm < 800) return "Low CO₂";
  return "High Gas";
}

/* ISPU */
function ispuPM25(pm){
  if(pm <= 15.5) return 50;
  if(pm <= 55.4) return 100;
  if(pm <= 150.4) return 200;
  if(pm <= 250.4) return 300;
  return 400;
}

function ispuGas(ppm){
  if(ppm <= 400) return 50;
  if(ppm <= 800) return 100;
  if(ppm <= 1200) return 200;
  return 300;
}

function kategoriISPU(v){
  if(v <= 50) return "BAIK";
  if(v <= 100) return "SEDANG";
  if(v <= 200) return "TIDAK SEHAT";
  if(v <= 300) return "SANGAT TIDAK SEHAT";
  return "BERBAHAYA";
}

const tempValue = document.getElementById("tempValue");
const humValue  = document.getElementById("humValue");
const gasValue  = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const gasType   = document.getElementById("gasType");
const airStatus = document.getElementById("airStatus");

const ispuPM25El = document.getElementById("ispuPM25");
const ispuGasEl  = document.getElementById("ispuGas");
const ispuFinalEl= document.getElementById("ispuFinal");
const ispuCatEl  = document.getElementById("ispuCategory");

/* Chart */
const ctx = document.getElementById("trendChart").getContext("2d");
const chart = new Chart(ctx,{
  type:"line",
  data:{ labels:[], datasets:[{label:"Gas",data:[]}] },
  options:{ responsive:true }
});

function updateChart(t,v){
  chart.data.labels.push(t);
  chart.data.datasets[0].data.push(v);
  if(chart.data.labels.length>10){
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update();
}

/* Firebase */
onValue(ref(db,"sensor"),snap=>{
  const d = snap.val();
  if(!d) return;

  const gas = Number(d.gas);
  const pm  = Number(d.dust);

  tempValue.textContent = d.temperature+" °C";
  humValue.textContent  = d.humidity+" %";
  gasValue.textContent  = gas+" PPM";
  dustValue.textContent = pm+" µg/m³";
  gasType.textContent   = jenisGas(gas);

  const ipm = ispuPM25(pm);
  const ig  = ispuGas(gas);
  const fin = Math.max(ipm,ig);
  const kat = kategoriISPU(fin);

  airStatus.textContent = "STATUS ISPU : " + kat;

  ispuPM25El.textContent = ipm;
  ispuGasEl.textContent  = ig;
  ispuFinalEl.textContent= fin;
  ispuCatEl.textContent  = kat;

  updateChart(new Date().toLocaleTimeString(), gas);
});

/* NAV */
document.querySelectorAll(".nav-link").forEach(link=>{
  link.onclick=e=>{
    e.preventDefault();
    const id = link.getAttribute("href").replace("#","");
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.getElementById("page-"+id).classList.add("active");
    document.querySelectorAll(".nav-link").forEach(l=>l.classList.remove("active"));
    link.classList.add("active");
  };
});
