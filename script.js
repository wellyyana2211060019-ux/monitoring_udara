import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* FIREBASE */
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

/* LOGIKA */
function jenisGas(ppm){
  if(ppm < 400) return "Healthy Air";
  if(ppm < 800) return "Low CO₂";
  if(ppm < 1200) return "Light VOC";
  if(ppm < 2000) return "Medium VOC / NH₃";
  return "High Mixed Gas";
}
function statusUdara(ppm){
  if(ppm < 400) return "HEALTHY";
  if(ppm < 800) return "MODERATE";
  if(ppm < 1500) return "UNHEALTHY";
  return "DANGEROUS";
}
function updateCardStatus(status){
  document.querySelectorAll(".card").forEach(card=>{
    card.classList.remove("status-healthy","status-moderate","status-unhealthy");
    if(status==="HEALTHY") card.classList.add("status-healthy");
    else if(status==="MODERATE") card.classList.add("status-moderate");
    else card.classList.add("status-unhealthy");
  });
}

/* ELEMENT */
const tempValue = document.getElementById("tempValue");
const humValue  = document.getElementById("humValue");
const gasValue  = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const gasType   = document.getElementById("gasType");
const airStatus = document.getElementById("airStatus");

/* CHART */
const ctx = document.getElementById("trendChart").getContext("2d");

const chart = new Chart(ctx,{
  type:"line",
  data:{
    labels:[],
    datasets:[
      { label:"Temperature", data:[], borderColor:"#3fffd8", tension:.4 },
      { label:"Humidity", data:[], borderColor:"#6fa8ff", tension:.4 },
      { label:"Gas", data:[], borderColor:"#ff7b7b", tension:.4 }
    ]
  },
  options:{ responsive:true }
});

function updateChart(time,t,h,g){
  chart.data.labels.push(time);
  chart.data.datasets[0].data.push(t);
  chart.data.datasets[1].data.push(h);
  chart.data.datasets[2].data.push(g);

  if(chart.data.labels.length > 12){
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds=>ds.data.shift());
  }
  chart.update();
}

/* REALTIME */
onValue(ref(db,"sensor"), snap=>{
  const d = snap.val();
  if(!d) return;

  const t = Number(d.temperature);
  const h = Number(d.humidity);
  const p = Number(d.dust);

  const gasRaw = Number(d.gas);
  const gas = Math.floor(gasRaw).toString().slice(0,3);
  const gasNum = Number(gas);

  tempValue.textContent = t.toFixed(1)+" °C";
  humValue.textContent  = h.toFixed(0)+" %";
  gasValue.textContent  = gas+" PPM";
  dustValue.textContent = p.toFixed(1)+" µg/m³";

  gasType.textContent = jenisGas(gasNum);

  const s = statusUdara(gasNum);
  airStatus.textContent = "AIR QUALITY STATUS : "+s;
  updateCardStatus(s);

  updateChart(new Date().toLocaleTimeString(),t,h,gasNum);
});
