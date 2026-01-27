import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { db } from "./config.js";

/* =============================
   DOM ELEMENTS
============================= */
const tempValue = document.getElementById("tempValue");
const humValue = document.getElementById("humValue");
const gasValue = document.getElementById("gasValue");
const dustValue = document.getElementById("dustValue");
const airStatus = document.getElementById("airStatus");

const aqiValue = document.getElementById("aqiValue");
const aqiStatus = document.getElementById("aqiStatus");
const aqiCard = document.getElementById("aqiCard");

/* =============================
   AQI CALC (ANGKA SAJA)
============================= */
function map(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function calculateAQI(pm25) {
  let aqi = 0;

  if (pm25 <= 12) {
    aqi = map(pm25, 0, 12, 0, 50);
  } else if (pm25 <= 35.4) {
    aqi = map(pm25, 12.1, 35.4, 51, 100);
  } else if (pm25 <= 55.4) {
    aqi = map(pm25, 35.5, 55.4, 101, 150);
  } else if (pm25 <= 150.4) {
    aqi = map(pm25, 55.5, 150.4, 151, 200);
  } else if (pm25 <= 250.4) {
    aqi = map(pm25, 150.5, 250.4, 201, 300);
  } else {
    aqi = 500;
  }

  return Math.round(aqi);
}

/* =============================
   INDICATOR STATUS (DISESUAIKAN)
   → BUKAN AQI RESMI
   → BERDASARKAN AMBANG SENSOR
============================= */
const aqiData = {
  BAIK: {
    label: "Baik",
    kategori: "Indikator Kualitas Udara",
    range: `
      PM2.5 ≤ 35 µg/m³<br>
      Gas ≤ 5 ppm
    `,
    health: "Udara bersih, konsentrasi debu halus dan gas rendah sehingga aman bagi kesehatan.",
    action: "Aman dan nyaman untuk seluruh aktivitas di dalam ruangan.",
    reference: "WHO & US EPA – Indoor Air Quality Guidelines",
    class: "aqi-good"
  },

  SEDANG: {
    label: "Sedang",
    kategori: "Indikator Kualitas Udara",
    range: `
      PM2.5 36–75 µg/m³<br>
      Gas 6–10 ppm
    `,
    health: "Kualitas udara masih dapat diterima, namun kelompok sensitif dapat merasakan efek ringan.",
    action: "Kelompok sensitif disarankan mengurangi aktivitas berat.",
    reference: "WHO & US EPA – Indoor Air Quality Guidelines",
    class: "aqi-moderate"
  },

  BURUK: {
    label: "Buruk",
    kategori: "Indikator Kualitas Udara",
    range: `
      PM2.5 > 75 µg/m³<br>
      Gas > 10 ppm
    `,
    health: "Kualitas udara buruk akibat tingginya konsentrasi debu halus dan gas yang berbahaya.",
    action: "Disarankan membatasi aktivitas dan menggunakan masker.",
    reference: "WHO & US EPA – Indoor Air Quality Guidelines",
    class: "aqi-unhealthy"
  }
};

/* =============================
   REALTIME SENSOR LISTENER
============================= */
let latestData = { gas: 0, temp: 0, hum: 0, dust: 0, status: "BAIK" };

onValue(ref(db, "sensor"), snap => {
  const d = snap.val();
  if (!d) return;

  const temp = d.temperature;
  const hum = d.humidity;
  const gas = d.gas;
  const dust = d.dust;
  const status = String(d.status).trim().toUpperCase();

  tempValue.textContent = Number(temp).toFixed(1) + " °C";
  humValue.textContent = Number(hum).toFixed(1) + " %";
  gasValue.textContent = Number(gas).toFixed(1) + " PPM";
  dustValue.textContent = Number(dust).toFixed(1) + " µg/m³";

  airStatus.textContent = status;
  airStatus.className = {
    BAIK: "status-good",
    SEDANG: "status-medium",
    BURUK: "status-bad"
  }[status] || "";

  const aqiNumber = calculateAQI(dust);
  aqiValue.textContent = aqiNumber;

  const infoAQI = aqiData[status] || aqiData.BAIK;
  aqiStatus.textContent = infoAQI.label;
  aqiCard.className = "aqi-card " + infoAQI.class;

  latestData = { gas, temp, hum, dust, status };
});

/* =============================
   POPUP "APA ARTINYA?"
============================= */
const modal = document.getElementById("aqiModal");
const openBtn = document.getElementById("openModalBtn");
const closeBtn = document.querySelector(".close-btn");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalHealth");

if (openBtn) {
  openBtn.onclick = () => {
    const status = latestData.status || "BAIK";
    const info = aqiData[status];

    modalTitle.textContent = `Status Udara: ${info.label}`;
    modalContent.innerHTML = `
      <p><strong>Kategori:</strong> ${info.kategori}</p>
      <p><strong>Rentang Parameter:</strong><br>${info.range}</p>
      <p><strong>Dampak Kesehatan:</strong><br>${info.health}</p>
      <p><strong>Anjuran:</strong><br>${info.action}</p>
      <hr>
      <small><strong>Referensi:</strong> ${info.reference}</small>
    `;

    modal.style.display = "block";
  };
}

if (closeBtn) {
  closeBtn.onclick = () => modal.style.display = "none";
}

window.onclick = e => {
  if (e.target === modal) modal.style.display = "none";
}; ini index.html <!DOCTYPE html>
<html lang="id">

<head>
  <meta charset="UTF-8">
  <title>Air Quality Monitoring</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- ===== Chart.js ===== -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom"></script>
  <script
    src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>

  <!-- ===== FontAwesome ===== -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

  <!-- ===== XLSX Export ===== -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

  <!-- ===== Styles ===== -->
  <link rel="stylesheet" href="style.css">
</head>

<body>

  <!-- ===== NAVBAR ===== -->
  <nav class="navbar">
    <div class="nav-brand">
      <i class="fa-solid fa-cloud"></i> Air Quality Monitoring
    </div>
    <div class="nav-links">
      <a class="nav-link active" data-target="page-dashboard">Dashboard</a>
      <a class="nav-link" data-target="page-history">History</a>
      <button id="themeToggle" class="theme-toggle" aria-label="Toggle Theme">
        <i class="fa-solid fa-moon"></i>
      </button>
    </div>
  </nav>

  <!-- ================= DASHBOARD ================= -->
  <div id="page-dashboard" class="page active">

    <!-- ===== METRIC CARDS ===== -->
    <div class="cards">

      <!-- Temperature -->
      <div class="card" id="card-temp" onclick="selectMetric('temp')">
        <div class="card-header">
          <h4>Temperature</h4>
          <i class="fa-solid fa-temperature-high card-icon"></i>
        </div>
        <div class="card-body">
          <p id="tempValue" class="metric-value">-- °C</p>
        </div>
      </div>

      <!-- Humidity -->
      <div class="card" id="card-hum" onclick="selectMetric('hum')">
        <div class="card-header">
          <h4>Humidity</h4>
          <i class="fa-solid fa-droplet card-icon"></i>
        </div>
        <div class="card-body">
          <p id="humValue" class="metric-value">-- %</p>
        </div>
      </div>

      <!-- Gas -->
      <div class="card" id="card-gas" onclick="selectMetric('gas')">
        <div class="card-header">
          <h4>Gas</h4>
          <i class="fa-solid fa-cloud card-icon"></i>
        </div>
        <div class="card-body">
          <p id="gasValue" class="metric-value">-- ppm</p>
        </div>
      </div>

      <!-- Dust -->
      <div class="card" id="card-dust" onclick="selectMetric('dust')">
        <div class="card-header">
          <h4>Dust</h4>
          <i class="fa-solid fa-wind card-icon"></i>
        </div>
        <div class="card-body">
          <p id="dustValue" class="metric-value">-- µg/m³</p>
        </div>
      </div>

    </div>

    <!-- ===== STATUS UDARA (SOURCE OF TRUTH: ARDUINO) ===== -->
    <div class="air-status">
      <span>Status Udara:</span>
      <strong id="airStatus" class="status-good">--</strong>
    </div>

    <!-- ===== AQI CARD (INFORMASI SAJA) ===== -->
    <div class="aqi-card" id="aqiCard">
      <div class="aqi-main">
        <div class="aqi-number" id="aqiValue">--</div>
        <div class="aqi-text">
          <h3 id="aqiStatus">Loading...</h3>
          <p>Air Quality Index</p>
        </div>
      </div>
      <button class="aqi-info-btn" id="openModalBtn">
        <i class="fa-regular fa-circle-question"></i> Apa artinya?
      </button>
    </div>

    <!-- ===== TREND CHART ===== -->
    <div class="chart-controls">
      <button class="reset-btn" id="resetZoomBtn">Reset Zoom</button>
      <button class="reset-btn" onclick="selectMetric('all')">Show All</button>
    </div>
    <canvas id="trendChart"></canvas>

  </div>

  <!-- ================= HISTORY ================= -->
  <div id="page-history" class="page">

    <h2>History Data Sensor</h2>

    <!-- Sensor Selector -->
    <div class="cards">
      <div class="card active-card" id="hist-temp" onclick="selectSensor('temperature')">
        <h4>Temperature</h4>
      </div>
      <div class="card" id="hist-humidity" onclick="selectSensor('humidity')">
        <h4>Humidity</h4>
      </div>
      <div class="card" id="hist-gas" onclick="selectSensor('gas')">
        <h4>Gas</h4>
      </div>
      <div class="card" id="hist-dust" onclick="selectSensor('dust')">
        <h4>Dust</h4>
      </div>
    </div>

    <!-- Filter -->
    <div class="history-filter">
      <div>
        <label>Start:</label>
        <input type="date" id="historyStartDate">
      </div>
      <div>
        <label>End:</label>
        <input type="date" id="historyEndDate">
      </div>
      <button id="historyFilterBtn" class="primary-btn">Filter</button>

      <div class="export-group">
        <button id="exportCsvBtn" class="secondary-btn">
          <i class="fa-solid fa-file-csv"></i> CSV
        </button>
        <button id="exportExcelBtn" class="secondary-btn">
          <i class="fa-solid fa-file-excel"></i> Excel
        </button>
      </div>
    </div>

    <!-- History Chart -->
    <div class="chart-container">
      <canvas id="historyChart"></canvas>
    </div>

  </div>

  <!-- ===== MODULE SCRIPTS ===== -->
  <script src="theme.js"></script>
  <script type="module" src="dashboard.js?v=4"></script>
  <script type="module" src="history.js?v=4"></script>

  <!-- ===== PAGE SWITCH LOGIC ===== -->
  <script>
    document.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const target = link.dataset.target;

        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        document.getElementById(target).classList.add("active");

        document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      });
    });
  </script>

  <!-- ===== AQI MODAL ===== -->
  <div id="aqiModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modalTitle">AQI</h2>
        <span class="close-btn">&times;</span>
      </div>
      <div class="modal-body">
        <p id="modalHealth">Informasi kualitas udara.</p>
      </div>
    </div>
  </div>
/* =============================
   TREND CHART (DASHBOARD)
============================= */
const ctx = document.getElementById("trendChart");
let trendChart = null;

if (ctx) {
  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Gas (PPM)",
          data: [],
          borderColor: "#22c55e",
          tension: 0.4
        },
        {
          label: "Temperature (°C)",
          data: [],
          borderColor: "#ef4444",
          tension: 0.4
        },
        {
          label: "Humidity (%)",
          data: [],
          borderColor: "#38bdf8",
          tension: 0.4
        },
        {
          label: "Dust (µg/m³)",
          data: [],
          borderColor: "#a78bfa",
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: {
          type: "time",
          time: { unit: "second" },
          ticks: { maxTicksLimit: 10 }
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

/* =============================
   UPDATE CHART REALTIME
============================= */
setInterval(() => {
  if (!trendChart) return;

  const now = new Date();

  trendChart.data.labels.push(now);
  trendChart.data.datasets[0].data.push(latestData.gas);
  trendChart.data.datasets[1].data.push(latestData.temp);
  trendChart.data.datasets[2].data.push(latestData.hum);
  trendChart.data.datasets[3].data.push(latestData.dust);

  if (trendChart.data.labels.length > 60) {
    trendChart.data.labels.shift();
    trendChart.data.datasets.forEach(ds => ds.data.shift());
  }

  trendChart.update("none");
}, 1000);

</body>

</html>
