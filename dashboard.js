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

function jenisGas(ppm) {
  if (ppm < 400) return "Healthy Air";
  if (ppm < 800) return "Low CO₂";
  if (ppm < 1200) return "Light VOC";
  if (ppm < 2000) return "Medium VOC";
  return "High Mixed Gas";
}

const tempValue = document.getElementById("tempValue");
const humValue = document.getElementById("humValue");
const gasValue = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const gasType = document.getElementById("gasType");
const airStatus = document.getElementById("airStatus");

// Detailed Gas Elements
const co2Value = document.getElementById("co2Value");
const coValue = document.getElementById("coValue");
const no2Value = document.getElementById("no2Value");
const so2Value = document.getElementById("so2Value");
const o3Value = document.getElementById("o3Value");

const aqiValue = document.getElementById("aqiValue");
const aqiStatus = document.getElementById("aqiStatus");
const aqiCard = document.getElementById("aqiCard");

// Modal Elements
const modal = document.getElementById("aqiModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeBtn = document.getElementsByClassName("close-btn")[0];
const modalTitle = document.getElementById("modalTitle");
const modalAqiRange = document.getElementById("modalAqiRange");
const modalHealth = document.getElementById("modalHealth");
const modalActions = document.getElementById("modalActions");

// AQI Data Constants
const aqiData = {
  good: {
    label: "Baik",
    range: "0-50",
    health: "Kualitas udara dianggap memuaskan, dan polusi udara menimbulkan sedikit atau tidak ada risiko.",
    action: "Nikmati, Ini hari yang baik untuk beraktifitas di luar ruangan.",
    class: "aqi-good", bg: "bg-good"
  },
  moderate: {
    label: "Sedang",
    range: "51-100",
    health: "Kualitas udara dapat diterima; namun, bagi beberapa polutan mungkin ada kekhawatiran kesehatan sedang bagi sebagian kecil orang yang sangat sensitif terhadap polusi udara.",
    action: "Anak-anak dan orang dewasa yang aktif, serta penderita penyakit pernapasan seperti asma, harus membatasi aktivitas luar ruangan yang berkepanjangan.",
    class: "aqi-moderate", bg: "bg-moderate"
  },
  sensitive: {
    label: "Tidak Sehat bagi Kelompok Sensitif",
    range: "101-150",
    health: "Anggota kelompok sensitif mungkin mengalami efek kesehatan. Masyarakat umum kemungkinan besar tidak akan terpengaruh.",
    action: "Anak-anak dan orang dewasa yang aktif, serta penderita penyakit pernapasan seperti asma, harus membatasi aktivitas luar ruangan yang berkepanjangan.",
    class: "aqi-sensitive", bg: "bg-sensitive"
  },
  unhealthy: {
    label: "Tidak Sehat",
    range: "151-200",
    health: "Setiap orang mungkin mulai mengalami efek kesehatan; anggota kelompok sensitif mungkin mengalami efek kesehatan yang lebih serius.",
    action: "Anak-anak dan orang dewasa yang aktif, serta penderita asma, harus menghindari aktivitas luar ruangan yang lama; orang lain, terutama anak-anak, harus membatasi aktivitas luar ruangan.",
    class: "aqi-unhealthy", bg: "bg-unhealthy"
  },
  very: {
    label: "Sangat Tidak Sehat",
    range: "201-300",
    health: "Peringatan kesehatan: setiap orang mungkin mengalami efek kesehatan yang lebih serius.",
    action: "Anak-anak dan orang dewasa yang aktif, serta penderita asma, harus menghindari semua aktivitas luar ruangan; orang lain, terutama anak-anak, harus membatasi aktivitas luar ruangan.",
    class: "aqi-very-unhealthy", bg: "bg-very"
  },
  hazardous: {
    label: "Berbahaya",
    range: "300+",
    health: "Peringatan kesehatan tentang kondisi darurat. Seluruh populasi kemungkinan besar akan terpengaruh.",
    action: "Setiap orang harus menghindari semua aktivitas luar ruangan.",
    class: "aqi-hazardous", bg: "bg-hazardous"
  }
};

let currentAqiCategory = "good"; // Default

function calculateAQI(dust) {
  // Simplified calculation based on PM2.5 (US EPA standard approximation)
  // This is a rough estimation for demo purposes. Real formula is piecewise linear.
  // 0-12 -> 0-50
  // 12.1-35.4 -> 51-100
  // 35.5-55.4 -> 101-150
  // 55.5-150.4 -> 151-200
  // 150.5-250.4 -> 201-300
  // 250.5+ -> 300+

  let aqi = 0;
  let category = "good";

  if (dust <= 12) {
    aqi = map(dust, 0, 12, 0, 50);
    category = "good";
  } else if (dust <= 35.4) {
    aqi = map(dust, 12.1, 35.4, 51, 100);
    category = "moderate";
  } else if (dust <= 55.4) {
    aqi = map(dust, 35.5, 55.4, 101, 150);
    category = "sensitive";
  } else if (dust <= 150.4) {
    aqi = map(dust, 55.5, 150.4, 151, 200);
    category = "unhealthy";
  } else if (dust <= 250.4) {
    aqi = map(dust, 150.5, 250.4, 201, 300);
    category = "very";
  } else {
    aqi = map(dust, 250.5, 500, 301, 500); // Caps at 500 roughly
    category = "hazardous";
  }

  return { val: Math.round(aqi), cat: category };
}

function map(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// Modal Logic
openModalBtn.onclick = function () {
  updateModal(currentAqiCategory);
  modal.style.display = "block";
}
closeBtn.onclick = function () {
  modal.style.display = "none";
}
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

function updateModal(catKey) {
  const data = aqiData[catKey];
  modalTitle.textContent = data.label;
  modalTitle.className = data.class; // Text color
  modalAqiRange.textContent = data.range;
  modalHealth.textContent = data.health;
  modalActions.innerHTML = `<p>${data.action}</p>`;
}

const ctx = document.getElementById("trendChart").getContext("2d");
const trendChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Gas (PPM)",
        data: [],
        borderColor: "#4ade80", // Green
        backgroundColor: "rgba(74, 222, 128, 0.1)",
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: "Temperature (°C)",
        data: [],
        borderColor: "#f87171", // Red
        backgroundColor: "rgba(248, 113, 113, 0.1)",
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: "Humidity (%)",
        data: [],
        borderColor: "#38bdf8", // Blue
        backgroundColor: "rgba(56, 189, 248, 0.1)",
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: "Dust (µg/m³)",
        data: [],
        borderColor: "#a78bfa", // Purple
        backgroundColor: "rgba(167, 139, 250, 0.1)",
        tension: 0.4,
        yAxisID: 'y'
      }
    ]
  },
  options: {
    responsive: true,
    animation: false, // Disable animation for performance
    elements: {
      point: {
        radius: 0 // Clean look for continuous stream
      },
      line: {
        tension: 0.4 // Smooth curves
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)"
        },
        ticks: { color: "#94a3b8" }
      },
      x: {
        grid: { display: false },
        ticks: { color: "#94a3b8", maxTicksLimit: 10 } // Limit x-axis labels
      }
    },
    plugins: {
      legend: {
        labels: { color: "#94a3b8" }
      }
    }
  }
});

let currentMetric = 'all';

window.selectMetric = function (metric) {
  currentMetric = metric;

  // Update Active Class on Cards
  document.querySelectorAll('.card').forEach(c => c.classList.remove('active-card'));
  if (metric !== 'all') {
    const cardId = "card-" + metric;
    const card = document.getElementById(cardId);
    if (card) card.classList.add('active-card');
  }

  // Filter Chart Datasets
  // 0: Gas, 1: Temp, 2: Hum, 3: Dust
  trendChart.data.datasets.forEach((ds, index) => {
    if (metric === 'all') {
      ds.hidden = false;
    } else {
      if (metric === 'gas' && index === 0) ds.hidden = false;
      else if (metric === 'temp' && index === 1) ds.hidden = false;
      else if (metric === 'hum' && index === 2) ds.hidden = false;
      else if (metric === 'dust' && index === 3) ds.hidden = false;
      else ds.hidden = true;
    }
  });

  trendChart.update();
};

// Store latest data
let latestData = {
  gas: 0,
  temp: 0,
  hum: 0,
  dust: 0
};
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

  // Update Global Latest Data
  latestData.gas = gas;
  latestData.temp = d.temperature;
  latestData.hum = d.humidity;
  latestData.dust = dust;

  // Update DOM Elements Immediately (Real-time reading)
  tempValue.textContent = d.temperature + " °C";
  humValue.textContent = d.humidity + " %";
  gasValue.textContent = gas + " PPM";
  dustValue.textContent = dust + " µg/m³";
  gasType.textContent = jenisGas(gas);

  // Update Detailed Gases in Settings
if (co2Value) {
  const co2 = resolveGasValue(d, ["co2", "gas"]);
  co2Value.innerHTML = co2 + " <small>ppm</small>";
}

if (coValue) {
  const co = resolveGasValue(d, ["co"]);
  coValue.innerHTML = co + " <small>ppm</small>";
}

if (no2Value) {
  const no2 = resolveGasValue(d, ["no2"]);
  no2Value.innerHTML = no2 + " <small>ppm</small>";
}

if (so2Value) {
  const so2 = resolveGasValue(d, ["so2"]);
  so2Value.innerHTML = so2 + " <small>ppm</small>";
}

if (o3Value) {
  const o3 = resolveGasValue(d, ["o3"]);
  o3Value.innerHTML = o3 + " <small>ppm</small>";
}
;

  // Update AQI
  const aqiResult = calculateAQI(dust);
  currentAqiCategory = aqiResult.cat;
  const aqiInfo = aqiData[currentAqiCategory];

  aqiValue.textContent = aqiResult.val;
  aqiStatus.textContent = aqiInfo.label;
  aqiCard.className = "aqi-card " + aqiInfo.class;
});

// Fixed Interval Chart Update (Heartbeat)
// Updates every 1 second regardless of data arrival rate
setInterval(() => {
  const now = new Date().toLocaleTimeString();

  // Push latest known data
  trendChart.data.labels.push(now);

  // 0: Gas, 1: Temp, 2: Hum, 3: Dust
  trendChart.data.datasets[0].data.push(latestData.gas);
  trendChart.data.datasets[1].data.push(latestData.temp);
  trendChart.data.datasets[2].data.push(latestData.hum);
  trendChart.data.datasets[3].data.push(latestData.dust);

  // Maintain Sliding Window (60 seconds)
  if (trendChart.data.labels.length > 60) {
    trendChart.data.labels.shift();
    trendChart.data.datasets.forEach(ds => ds.data.shift());
  }

  // Update Chart
  trendChart.update();
}, 1000);


/* ===========================
   THEME SWITCHING LOGIC
   =========================== */
const themeToggleBtn = document.getElementById("themeToggle");
const themeIcon = themeToggleBtn.querySelector("i");
const root = document.documentElement;

// Function to set theme
function setTheme(isLight) {
  if (isLight) {
    root.setAttribute("data-theme", "light");
    themeIcon.classList.replace("fa-moon", "fa-sun");
    localStorage.setItem("theme", "light");
    updateChartsTheme(true);
  } else {
    root.removeAttribute("data-theme");
    themeIcon.classList.replace("fa-sun", "fa-moon");
    localStorage.setItem("theme", "dark");
    updateChartsTheme(false);
  }
}

// Global Toggle Function for onclick
window.toggleTheme = function () {
  const isDark = !root.hasAttribute("data-theme"); // Currently dark? then switch to light
  setTheme(isDark);
};

// Toggle Button Listener
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", window.toggleTheme);
}

// Updates Chart.js colors based on theme
function updateChartsTheme(isLight) {
  const textColor = isLight ? "#64748b" : "#94a3b8";
  const gridColor = isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)";

  if (typeof trendChart !== 'undefined') {
    trendChart.options.scales.x.ticks.color = textColor;
    trendChart.options.scales.y.ticks.color = textColor;
    trendChart.options.scales.y.grid.color = gridColor;
    trendChart.update();
  }

  if (typeof window.historyChart !== 'undefined') {
    // If history chart exists (loaded via history.js but accessible if on window or we invoke logic)
    // Since historyChart is scoped in history.js, we might need a custom event or shared scope.
    // For now, let's trigger a re-render if we can, or just let it update on next interaction.
    // Ideally, history.js handles its own theme check.
  }
}

// Initial Load
(function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    setTheme(true);
  } else {
    setTheme(false);
  }
})();
