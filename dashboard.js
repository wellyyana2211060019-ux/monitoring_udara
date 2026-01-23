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
   AQI CALC (INFO ONLY)
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

}

const AQI_LABEL = {
  good: "Baik",
  moderate: "Sedang",
  sensitive: "Tidak Sehat (Sensitif)",
  unhealthy: "Tidak Sehat",
  very: "Sangat Tidak Sehat",
  hazardous: "Berbahaya"
};

/* =============================
   REALTIME SENSOR LISTENER
============================= */
let latestData = { gas: 0, temp: 0, hum: 0, dust: 0 };

onValue(ref(db, "sensor"), snap => {
  const d = snap.val();
  if (!d) return;
// Hitung AQI angka saja
const aqiNumber = calculateAQI(dust);
aqiValue.textContent = aqiNumber;

// AQI ikut status Arduino
aqiStatus.textContent = status;

const AQI_CLASS = {
  BAIK: "aqi-good",
  SEDANG: "aqi-moderate",
  BURUK: "aqi-unhealthy"
};

aqiCard.className = "aqi-card";
aqiCard.classList.add(AQI_CLASS[status] || "aqi-good");

  // ===== RAW DATA FROM ARDUINO =====
  const temp = d.temperature;
  const hum = d.humidity;
  const gas = d.gas;
  const dust = d.dust;
  const status = d.status; // 🔥 SOURCE OF TRUTH

  // ===== UI UPDATE =====
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

  // ===== AQI (SYNC WITH ARDUINO STATUS) =====
const aqi = calculateAQI(dust);
aqiValue.textContent = aqi.val;

// Sinkronkan AQI dengan Status Udara (Arduino = Source of Truth)
const STATUS_TO_AQI = {
  BAIK: {
    label: "Baik",
    class: "aqi-good"
  },
  SEDANG: {
    label: "Sedang",
    class: "aqi-moderate"
  },
  BURUK: {
    label: "Buruk",
    class: "aqi-unhealthy"
  }
};

const aqiSync = STATUS_TO_AQI[status] || STATUS_TO_AQI["BAIK"];

aqiStatus.textContent = aqiSync.label;
aqiCard.className = "aqi-card " + aqiSync.class;


  // ===== SAVE FOR TREND =====
  latestData = { gas, temp, hum, dust, status };
});

/* =============================
   TREND CHART (REALTIME ONLY)
============================= */
const MAX_POINTS = 3600; // Keep 1 hour of data in memory
const ctx = document.getElementById("trendChart").getContext("2d");

const trendChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Gas (PPM)", data: [], borderColor: "#22c55e", tension: 0.4 },
      { label: "Temp (°C)", data: [], borderColor: "#ef4444", tension: 0.4 },
      { label: "Hum (%)", data: [], borderColor: "#38bdf8", tension: 0.4 },
      { label: "Dust (µg/m³)", data: [], borderColor: "#a78bfa", tension: 0.4 }
    ]
  },
  options: {
    responsive: true,
    animation: false,
    scales: {
      y: { beginAtZero: true },
      x: {
        type: 'time',
        time: { unit: 'second' },
        display: true,
        ticks: {
          maxTicksLimit: 10
        }
      }
    },
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: 'x', // Enable panning on X-axis (Time)
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x', // Enable zooming on X-axis
        }
      }
    }
  }
});

// PUSH DATA EVERY 1 SECOND (DISPLAY ONLY)
setInterval(() => {
  const t = new Date(); // Push Date object for Time Axis
  const now = t.getTime();

  trendChart.data.labels.push(t);
  trendChart.data.datasets[0].data.push(latestData.gas);
  trendChart.data.datasets[1].data.push(latestData.temp);
  trendChart.data.datasets[2].data.push(latestData.hum);
  trendChart.data.datasets[3].data.push(latestData.dust);

  // Remove old data only if buffer (1 hour) is full
  if (trendChart.data.labels.length > MAX_POINTS) {
    trendChart.data.labels.shift();
    trendChart.data.datasets.forEach(ds => ds.data.shift());
  }

  // AUTO-SCROLL LOGIC:
  // Move the window ONLY if the user is looking at the latest data.
  // We define "looking at latest" if the chart's current Max is within 2 seconds of 'now'.
  const currentMax = trendChart.scales.x.max;
  const isAtEdge = !currentMax || (now - currentMax) < 2000;

  if (isAtEdge) {
    // Show last 10 seconds (10 points) as requested
    trendChart.options.scales.x.min = now - 10000;
    trendChart.options.scales.x.max = now;
  }

  trendChart.update("none");
}, 1000);

/* =============================
   MODAL LOGIC (BASED ON ARDUINO SCRIPT)
============================= */
const modal = document.getElementById("aqiModal");
const openBtn = document.getElementById("openModalBtn");
const closeBtn = document.querySelector(".close-btn");
const modalTitle = document.getElementById("modalTitle");
const modalHealth = document.getElementById("modalHealth");

// Logic from Arduino Script:
// BURUK:  Gas > 10 || Dust > 75
// SEDANG: Gas > 5  || Dust > 35 (and not Buruk)
// BAIK:   Else
const ARDUINO_STATUS_INFO = {
  BAIK: {
    criteria: "Gas ≤ 5.0 PPM <br>And Dust ≤ 35.0",
    desc: "Kualitas udara <b>BAIK</b>. Tidak ada risiko kesehatan. Aman untuk beraktivitas di luar ruanga."
  },
  SEDANG: {
    criteria: "Gas > 5.0 PPM <br>Or Dust > 35.0",
    desc: "Kualitas udara <b>SEDANG</b>. Kelompok sensitif sebaiknya mengurangi aktivitas fisik yang berat di luar ruangan."
  },
  BURUK: {
    criteria: "Gas > 10.0 PPM <br>Or Dust > 75.0",
    desc: "Kualitas udara <b>BURUK</b>. Tingkat polusi tinggi. Hindari aktivitas di luar ruangan dan gunakan masker jika perlu."
  }
};

if (openBtn) {
  openBtn.onclick = () => {
    // Uses the status directly from Arduino (Source of Truth)
    const currentStatus = latestData.status || "BAIK";
    const info = ARDUINO_STATUS_INFO[currentStatus] || ARDUINO_STATUS_INFO["BAIK"];

    // Calculate simple AQI number just for display (optional)
    // or just show the status text
    modalTitle.textContent = `Status: ${currentStatus}`;
    modalHealth.innerHTML = `
      <div class="aqi-range-display" style="text-align:center;">
        <strong>Kriteria:</strong><br>${info.criteria}
      </div>
      <div class="recommendations">
        <p>${info.desc}</p>
      </div>
    `;

    // Match modal border/color to status
    const colorMap = {
      BAIK: "var(--success-color)",
      SEDANG: "#facc15",
      BURUK: "#f87171"
    };
    document.querySelector(".modal-content").style.borderColor = colorMap[currentStatus] || "var(--card-border)";

    modal.style.display = "block";
  };
}

if (closeBtn) {
  closeBtn.onclick = () => {
    modal.style.display = "none";
  };
}

window.onclick = (event) => {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

/* =============================
   CHART FILTER LOGIC
============================= */
window.selectMetric = (metric) => {
  // Map metric names to dataset indices or labels
  // Datasets order: 0:Gas, 1:Temp, 2:Hum, 3:Dust
  const mapping = {
    gas: 0,
    temp: 1,
    hum: 2,
    dust: 3
  };

  // Highlight active card
  document.querySelectorAll(".card").forEach(c => c.classList.remove("active-card"));
  if (metric !== 'all') {
    const cardId = "card-" + metric;
    document.getElementById(cardId)?.classList.add("active-card");
  }

  // Toggle datasets
  trendChart.data.datasets.forEach((ds, i) => {
    if (metric === 'all') {
      ds.hidden = false;
    } else {
      ds.hidden = i !== mapping[metric];
    }
  });

  trendChart.update();
};

/* =============================
   RESET ZOOM LOGIC
============================= */
const resetZoomBtn = document.getElementById("resetZoomBtn");
if (resetZoomBtn) {
  resetZoomBtn.onclick = () => {
    trendChart.resetZoom();
  };
}

/* =============================
   THEME LOGIC
============================= */
const themeBtn = document.getElementById("themeToggle");
const icon = themeBtn?.querySelector("i");
const html = document.documentElement;

function applyTheme(isLight) {
  if (isLight) {
    html.setAttribute("data-theme", "light");
    icon?.classList.replace("fa-moon", "fa-sun");
    localStorage.setItem("theme", "light");
  } else {
    html.removeAttribute("data-theme");
    icon?.classList.replace("fa-sun", "fa-moon");
    localStorage.removeItem("theme");
  }

  updateCharts(isLight);
}

function updateCharts(isLight) {
  const textColor = isLight ? "#64748b" : "#94a3b8";
  const gridColor = isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)";

  // Update Trend Chart (Dashboard)
  if (typeof trendChart !== "undefined" && trendChart) {
    trendChart.options.scales.x.ticks.color = textColor;
    trendChart.options.scales.y.ticks.color = textColor;
    trendChart.options.scales.y.grid.color = gridColor;
    trendChart.update("none");
  }

  // Update History Chart (via exposed window property)
  if (window.historyChartInstance) {
    window.historyChartInstance.options.scales.x.ticks.color = textColor;
    window.historyChartInstance.options.scales.y.ticks.color = textColor;
    window.historyChartInstance.options.scales.x.grid.color = gridColor;
    window.historyChartInstance.options.scales.y.grid.color = gridColor;
    window.historyChartInstance.update("none");
  }
}

// Init Theme
const savedTheme = localStorage.getItem("theme");
applyTheme(savedTheme === "light");

if (themeBtn) {
  themeBtn.onclick = () => {
    const isLight = !html.hasAttribute("data-theme"); // Current is dark (no attribute), so switch to light
    applyTheme(isLight);
  };
}
