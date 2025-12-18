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

/* LOGIKA GAS */
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
  const cards = document.querySelectorAll(".card");

  cards.forEach(card=>{
    card.classList.remove(
      "status-healthy",
      "status-moderate",
      "status-unhealthy"
    );

    if(status === "HEALTHY"){
      card.classList.add("status-healthy");
    }
    else if(status === "MODERATE"){
      card.classList.add("status-moderate");
    }
    else{
      card.classList.add("status-unhealthy");
    }
  });
}


/* ELEMENT */
const tempValue = document.getElementById("tempValue");
const humValue  = document.getElementById("humValue");
const gasValue  = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const gasType   = document.getElementById("gasType");
const airStatus = document.getElementById("airStatus");

/* CHART STYLE MIRIP CONTOH */
const ctx = document.getElementById("trendChart").getContext("2d");

const gradTemp = ctx.createLinearGradient(0,0,0,200);
gradTemp.addColorStop(0,"rgba(63,255,216,.4)");
gradTemp.addColorStop(1,"rgba(63,255,216,0)");

const gradHum = ctx.createLinearGradient(0,0,0,200);
gradHum.addColorStop(0,"rgba(100,150,255,.4)");
gradHum.addColorStop(1,"rgba(100,150,255,0)");

const gradGas = ctx.createLinearGradient(0,0,0,200);
gradGas.addColorStop(0,"rgba(255,120,120,.4)");
gradGas.addColorStop(1,"rgba(255,120,120,0)");

const chart = new Chart(ctx,{
  type:"line",
  data:{
    labels:[],
    datasets:[
      {
        label:"Temperature – Last 24 Hours",
        data:[],
        borderColor:"#3fffd8",
        backgroundColor:gradTemp,
        fill:true,
        tension:.45,
        pointRadius:3
      },
      {
        label:"Humidity – Last 24 Hours",
        data:[],
        borderColor:"#6fa8ff",
        backgroundColor:gradHum,
        fill:true,
        tension:.45,
        pointRadius:3
      },
      {
        label:"Gas – Last 24 Hours",
        data:[],
        borderColor:"#ff7b7b",
        backgroundColor:gradGas,
        fill:true,
        tension:.45,
        pointRadius:3
      }
    ]
  },
  options:{
    responsive:true,
    plugins:{
      legend:{
        position:"top",
        labels:{color:"#dff7f4",usePointStyle:true}
      }
    },
    scales:{
      x:{ticks:{color:"#9aa3ad"},grid:{display:false}},
      y:{ticks:{color:"#9aa3ad"},grid:{color:"rgba(255,255,255,.05)"}}
    }
  }
});

/* UPDATE CHART */
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
let chartData = [];
let chartLabels = [];
/* REALTIME FIREBASE */
onValue(ref(db,"sensor"),snap=>{
  const d = snap.val();
  if(!d) return;
  const avgQuality =
(
  gasNum +
  Number(d.dust) +
  Number(d.temperature) +
  Number(d.humidity)
) / 4;
  const time = new Date().toLocaleTimeString();

chartLabels.push(time);
chartData.push(avgQuality.toFixed(1));

if(chartData.length > 10){
  chartData.shift();
  chartLabels.shift();
}

trendChart.update();

  const t = Number(d.temperature);
  const h = Number(d.humidity);
  const gasRaw = Number(d.gas);
  const gas = Math.floor(gasRaw).toString().slice(0,3);
  const gasNum = Number(gas); // dipakai untuk perhitungan
  const p = Number(d.dust);

  tempValue.textContent = t.toFixed(1)+" °C";
  humValue.textContent  = h.toFixed(0)+" %";
  gasValue.textContent = gas + " PPM";
  dustValue.textContent = p.toFixed(1)+" µg/m³";

  gasType.textContent = jenisGas(g);

  const s = statusUdara(g);
  airStatus.textContent = "AIR QUALITY STATUS : "+s;
  airStatus.style.background =
    s==="HEALTHY"?"#1b5e20":
    s==="MODERATE"?"#f9a825":
    s==="UNHEALTHY"?"#c62828":"#6a1b9a";

  updateChart(new Date().toLocaleTimeString(),t,h,g);
});
const ctx = document.getElementById("trendChart").getContext("2d");

const trendChart = new Chart(ctx,{
  type:"line",
  data:{
    labels: chartLabels,
    datasets:[{
      label:"Average Air Quality",
      data: chartData,
      borderWidth:2,
      tension:0.4,
      fill:true
    }]
  },
  options:{
    responsive:true,
    scales:{
      y:{
        beginAtZero:true,
        ticks:{
          stepSize:10
        }
      }
    }
  }
});




