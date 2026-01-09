import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

function jenisGas(ppm){
  if(ppm < 400) return "Healthy Air";
  if(ppm < 800) return "Low CO₂";
  if(ppm < 1200) return "Light VOC";
  if(ppm < 2000) return "Medium VOC";
  return "High Mixed Gas";
}

const tempValue = document.getElementById("tempValue");
const humValue  = document.getElementById("humValue");
const gasValue  = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const gasType   = document.getElementById("gasType");
const airStatus = document.getElementById("airStatus");

const ctx = document.getElementById("trendChart").getContext("2d");
const trendChart = new Chart(ctx,{
  type:"line",
  data:{ labels:[], datasets:[{label:"Gas (PPM)", data:[], tension:.4}] }
});

onValue(ref(db,"sensor"),snap=>{
  const d = snap.val();
  if(!d) return;

  const gas = Math.round(d.gas);

  tempValue.textContent = d.temperature+" °C";
  humValue.textContent  = d.humidity+" %";
  gasValue.textContent  = gas+" PPM";
  dustValue.textContent = d.dust+" µg/m³";
  gasType.textContent   = jenisGas(gas);

  airStatus.textContent = "AIR QUALITY STATUS : " + d.status;

  trendChart.data.labels.push(new Date().toLocaleTimeString());
  trendChart.data.datasets[0].data.push(gas);

  if(trendChart.data.labels.length > 12){
    trendChart.data.labels.shift();
    trendChart.data.datasets[0].data.shift();
  }
  trendChart.update();
});
