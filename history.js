import {
  getDatabase,
  ref,
  onValue,
  query,
  orderByChild,
  startAt,
  endAt
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ==========================================
   HISTORY MODULE (READ ONLY)
   ========================================== */

const db = getDatabase();

/* =============================
   CONFIG
============================= */
const CONFIG = {
  chartId: "historyChart",
  chartMaxPoints: 2000,
  minYearMs: 1704067200000, // Jan 1, 2024
  minSensorValue: 0.01
};

/* =============================
   STATE
============================= */
const State = {
  currentSensor: "gas",
  rawData: [],
  chart: null,
  unsubscribe: null
};

/* =============================
   DATA SERVICE (READ ONLY)
============================= */
const DataService = {

  fetchRange(startMs, endMs, cb) {
    if (State.unsubscribe) State.unsubscribe();

    const q = query(
      ref(db, "history"),
      orderByChild("timestamp"),
      startAt(startMs),
      endAt(endMs)
    );

    State.unsubscribe = onValue(q, snap => {
      cb(this.normalizeHighlight(snap));
    }, err => {
      console.error("History query error:", err);
      alert("History load failed. Check indexOn(timestamp).");
    });
  },

  normalizeHighlight(snapshot) {
    const rows = [];

    snapshot.forEach(child => {
      const d = child.val();
      if (!d || !d.timestamp) return;

      let ts = d.timestamp;
      if (typeof ts === "number" && ts < 10000000000) ts *= 1000;

      if (isNaN(ts) || ts < CONFIG.minYearMs) return;

      rows.push({
        ts,
        dateStr: new Date(ts).toLocaleString("id-ID"),
        temperature: Number(d.temperature) || 0,
        humidity: Number(d.humidity) || 0,
        gas: Number(d.gas) || 0,
        dust: Number(d.dust) || 0,
        status: d.status || "-"
      });
    });

    return rows;
  },

  prepareChartData(list, sensor) {
    const map = new Map();

    list.forEach(r => {
      const val = r[sensor];
      if (val < CONFIG.minSensorValue) return;

      if (!map.has(r.ts)) map.set(r.ts, val);
      else map.set(r.ts, Math.max(map.get(r.ts), val));
    });

    let data = Array.from(map, ([x, y]) => ({ x, y }))
      .sort((a, b) => a.x - b.x);

    if (data.length > CONFIG.chartMaxPoints) {
      data = this.downsample(data, CONFIG.chartMaxPoints);
    }

    return data;
  },

  downsample(data, max) {
    const bucket = Math.floor(data.length / max);
    const out = [];

    for (let i = 0; i < data.length; i += bucket) {
      const slice = data.slice(i, i + bucket);
      out.push(slice.reduce((a, b) => b.y > a.y ? b : a));
    }
    return out;
  }
};

/* =============================
   CHART SERVICE
============================= */
const ChartService = {

  render(points) {
    const ctx = document.getElementById(CONFIG.chartId)?.getContext("2d");
    if (!ctx) return;

    if (State.chart) State.chart.destroy();

    const colorMap = {
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
          borderColor: colorMap[State.currentSensor],
          backgroundColor: colorMap[State.currentSensor] + "22",
          pointRadius: 0,
          tension: 0.25,
          fill: true
        }]
      },
      options: {
        responsive: true,
        animation: false,
        parsing: false,
        normalized: true,
        scales: {
          x: {
            type: "time",
            time: {
              tooltipFormat: "dd MMM yyyy HH:mm:ss",
              displayFormats: { minute: "HH:mm" }
            }
          },
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { display: true },
          zoom: {
            pan: { enabled: true, mode: "x" },
            zoom: { wheel: { enabled: true }, mode: "x" }
          }
        }
      }
    });

    window.historyChart = State.chart;
    this.applyTheme();
  },

  applyTheme() {
    const light = localStorage.getItem("theme") === "light";
    const text = light ? "#64748b" : "#94a3b8";
    const grid = light ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)";

    if (!State.chart) return;

    State.chart.options.scales.x.ticks.color = text;
    State.chart.options.scales.y.ticks.color = text;
    State.chart.options.scales.x.grid.color = grid;
    State.chart.options.scales.y.grid.color = grid;
    State.chart.update("none");
  }
};

/* =============================
   UI CONTROLLER
============================= */
const UI = {

  init() {
    this.bind();
    this.setDefaultDate();
    this.load();
  },

  bind() {
    document.getElementById("historyFilterBtn")
      ?.addEventListener("click", () => this.load());
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
    const s = new Date(document.getElementById("historyStartDate").value).setHours(0,0,0,0);
    const e = new Date(document.getElementById("historyEndDate").value).setHours(23,59,59,999);

    DataService.fetchRange(s, e, data => {
      State.rawData = data;
      this.render();
    });
  },

  render() {
    const chartData = DataService.prepareChartData(State.rawData, State.currentSensor);
    ChartService.render(chartData);
  }
};

/* =============================
   GLOBAL API
============================= */
window.selectSensor = sensor => {
  State.currentSensor = sensor;
  UI.render();
};

/* =============================
   INIT
============================= */
UI.init();
