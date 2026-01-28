import {
  ref,
  onValue,
  query,
  orderByKey
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { db } from "./config.js";

/* =============================
   CONFIG
============================= */
const CONFIG = {
  chartId: "historyChart",
  chartMaxPoints: 2000,
  minYearMs: 1704067200000,
  minSensorValue: 0
};

/* =============================
   STATE
============================= */
const State = {
  currentSensor: "gas",
  rawData: [],
  chart: null,
  unsubscribe: null,
  startRange: 0,
  endRange: 0
};

/* =============================
   DATA SERVICE
============================= */
const DataService = {

  fetchAll(cb) {
    if (State.unsubscribe) State.unsubscribe();

    // ✅ KEMBALIKAN KE QUERY AMAN (SEPERTI DULU)
    const q = query(
      ref(db, "history"),
      orderByKey()
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

      // ✅ AMAN UNTUK DETIK / MILIDETIK
      if (ts < 10000000000) ts *= 1000;
      if (ts < CONFIG.minYearMs) return;

      // ✅ FILTER RANGE TANGGAL DI SINI
      if (ts < State.startRange || ts > State.endRange) return;

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
        parsing: false,
        animation: false,
        scales: {
          x: {
            type: "linear",
            ticks: {
              callback: v => {
                const d = new Date(v);
                return d.toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short"
                });
              }
            }
          },
          y: {
            beginAtZero: true
          }
        }
      }
    });
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
    const sVal = document.getElementById("historyStartDate").value;
    const eVal = document.getElementById("historyEndDate").value;

    if (!sVal || !eVal) return;

    // ✅ SIMPAN RANGE UNTUK FILTER
    State.startRange = new Date(sVal).setHours(0, 0, 0, 0);
    State.endRange   = new Date(eVal).setHours(23, 59, 59, 999);

    DataService.fetchAll(data => {
      State.rawData = data;
      this.render();
    });
  },

  render() {
    const data = DataService.prepare(State.rawData, State.currentSensor);

    if (!data.length) {
      if (State.chart) State.chart.destroy();
      return;
    }

    ChartService.render(data);
  }
};

/* =============================
   SENSOR SELECTOR
============================= */
window.selectSensor = sensor => {
  State.currentSensor = sensor;

  document.querySelectorAll("#page-history .card")
    .forEach(c => c.classList.remove("active-card"));

  const map = {
    temperature: "hist-temp",
    humidity: "hist-humidity",
    gas: "hist-gas",
    dust: "hist-dust"
  };

  if (map[sensor]) {
    document.getElementById(map[sensor])
      ?.classList.add("active-card");
  }

  UI.render();
};

/* =============================
   INIT
============================= */
UI.init();
