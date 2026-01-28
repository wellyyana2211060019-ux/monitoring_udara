import {
  ref,
  onValue,
  query,
  orderByKey,
  startAt,
  endAt
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { db } from "./config.js";

/* =============================
   CONFIG
============================= */
const CONFIG = {
  chartId: "historyChart",
  chartMaxPoints: 2000,
  minYearMs: 1704067200000,
  minSensorValue: 0.01
};

/* =============================
   STATE
============================= */
const State = {
  currentSensor: "temperature",
  rawData: [],
  chart: null,
  unsubscribe: null
};

/* =============================
   DATA SERVICE
============================= */
const DataService = {

  fetchRange(startMs, endMs, cb) {
    if (State.unsubscribe) State.unsubscribe();

    const startSec = String(Math.floor(startMs / 1000));
    const endSec = String(Math.floor(endMs / 1000));

    const q = query(
      ref(db, "history"),
      orderByKey(),
      startAt(startSec),
      endAt(endSec)
    );

    State.unsubscribe = onValue(q, snap => {
      cb(this.normalize(snap));
    });
  },

  normalize(snapshot) {
    const rows = [];

    snapshot.forEach(child => {
      const d = child.val();
      if (!d) return;

      let ts = Number(child.key);
      if (ts < 10000000000) ts *= 1000;
      if (ts < CONFIG.minYearMs) return;

      const dateObj = new Date(ts);
      // Filter out January 22nd, 2026 data as requested
      if (dateObj.getDate() === 22 && dateObj.getMonth() === 0 && dateObj.getFullYear() === 2026) {
        return;
      }

      rows.push({
        ts,
        temperature: Number(d.temperature) || 0,
        humidity: Number(d.humidity) || 0,
        gas: Number(d.gas) || 0,
        dust: Number(d.dust) || 0
      });
    });

    return rows;
  },

  prepare(list, sensor) {
    const data = list
      .filter(r => r[sensor] >= CONFIG.minSensorValue)
      .map(r => ({ x: r.ts, y: r[sensor] }))
      .sort((a, b) => a.x - b.x);

    if (data.length <= CONFIG.chartMaxPoints) return data;

    const step = Math.floor(data.length / CONFIG.chartMaxPoints);
    return data.filter((_, i) => i % step === 0);
  }
};

/* =============================
   CHART SERVICE
============================= */
const ChartService = {

  render(points) {
    const ctx = document.getElementById(CONFIG.chartId);
    if (!ctx) return;

    if (State.chart) State.chart.destroy();

    const colors = {
      gas: "#22c55e",
      temperature: "#ef4444",
      humidity: "#38bdf8",
      dust: "#a78bfa"
    };

    State.chart = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [{
          label: State.currentSensor.toUpperCase(),
          data: points,
          borderColor: colors[State.currentSensor],
          backgroundColor: colors[State.currentSensor] + "33",
          pointRadius: 0,
          tension: 0.25,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: false,
        scales: {
          x: {
            type: "time",
            time: {
              tooltipFormat: "dd MMM yyyy HH:mm:ss",
              displayFormats: {
                hour: "HH:mm",
                day: "dd MMM"
              }
            }
          },
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { display: true },
          zoom: {
            pan: {
              enabled: true,
              mode: "x"
            },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: "x"
            }
          }
        }
      }
    });

    window.historyChartInstance = State.chart;
  }
};

/* =============================
   EXPORT SERVICE
============================= */
const ExportService = {

  downloadCSV(data) {
    if (!data || data.length === 0) {
      alert("No data to export!");
      return;
    }

    const headers = ["Timestamp", "Temperature (C)", "Humidity (%)", "Gas (PPM)", "Dust (ug/m3)"];
    const csvRows = [headers.join(",")];

    data.forEach(row => {
      const date = new Date(row.ts).toISOString();
      const values = [
        date,
        row.temperature,
        row.humidity,
        row.gas,
        row.dust
      ];
      csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sensor_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  downloadExcel(data) {
    if (!data || data.length === 0) {
      alert("No data to export!");
      return;
    }

    // Prepare data for SheetJS
    const wsData = data.map(row => ({
      Timestamp: new Date(row.ts).toLocaleString(),
      Temperature: row.temperature,
      Humidity: row.humidity,
      Gas: row.gas,
      Dust: row.dust
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sensor Data");

    XLSX.writeFile(wb, "sensor_data.xlsx");
  }
};

/* =============================
   UI
============================= */
const UI = {

  init() {
    this.setDefaultDate();
    this.load();
    this.initListeners();
  },

  initListeners() {
    document.getElementById("historyFilterBtn")?.addEventListener("click", () => {
      this.load();
    });

    document.getElementById("exportCsvBtn")?.addEventListener("click", () => {
      ExportService.downloadCSV(State.rawData);
    });

    document.getElementById("exportExcelBtn")?.addEventListener("click", () => {
      ExportService.downloadExcel(State.rawData);
    });

    // Listen for tab changes
    window.addEventListener("tab-change", (e) => {
      if (e.detail.target === "page-history") {
        // Use requestAnimationFrame to ensure layout is applied before rendering
        requestAnimationFrame(() => {
          this.render();
        });
      }
    });
  },

  setDefaultDate() {
    const s = document.getElementById("historyStartDate");
    const e = document.getElementById("historyEndDate");
    if (!s || !e) return;

    const d = new Date();
    e.value = d.toISOString().split("T")[0];
    d.setDate(d.getDate() - 7);
    s.value = d.toISOString().split("T")[0];
  },

  load() {
    const sVal = document.getElementById("historyStartDate").value;
    const eVal = document.getElementById("historyEndDate").value;

    if (!sVal || !eVal) {
      alert("Please select start and end dates.");
      return;
    }

    const s = new Date(sVal).setHours(0, 0, 0, 0);
    const e = new Date(eVal).setHours(23, 59, 59, 999);

    DataService.fetchRange(s, e, data => {
      State.rawData = data;
      this.render();
    });
  },

  render() {
    // CRITICAL FIX: Do not render if the history page is hidden. 
    // Chart.js breaks if rendered in a hidden container (0 height).
    const historyPage = document.getElementById("page-history");
    if (!historyPage || !historyPage.classList.contains("active")) {
      return;
    }

    const data = DataService.prepare(State.rawData, State.currentSensor);
    ChartService.render(data);
  }
};

/* =============================
   SENSOR SELECTOR
============================= */
window.selectSensor = sensor => {
  State.currentSensor = sensor;

  // Update active card style
  document.querySelectorAll("#page-history .card").forEach(c => c.classList.remove("active-card"));
  const map = {
    'temperature': 'hist-temp',
    'humidity': 'hist-humidity',
    'gas': 'hist-gas',
    'dust': 'hist-dust'
  };
  const activeId = map[sensor];
  if (activeId) document.getElementById(activeId)?.classList.add("active-card");

  UI.render();
};

/* =============================
   INIT
============================= */
UI.init();
