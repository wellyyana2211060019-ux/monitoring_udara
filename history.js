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
  currentSensor: "gas",
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
   UI
============================= */
const UI = {

  init() {
    this.setDefaultDate();
    this.load();
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
    const data = DataService.prepare(State.rawData, State.currentSensor);
    ChartService.render(data);
  }
};

/* =============================
   SENSOR SELECTOR
============================= */
window.selectSensor = sensor => {
  State.currentSensor = sensor;
  UI.render();
};

/* =============================
   INIT
============================= */
UI.init();
