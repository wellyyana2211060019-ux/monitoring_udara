import { getDatabase, ref, onValue, query, orderByChild, startAt, endAt }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/**
 * ==========================================
 * HISTORY MODULE REFACTOR
 * ==========================================
 * Features:
 * - Strict Data Validation
 * - Duplicate Timestamp Aggregation (Max)
 * - Large Dataset Downsampling (LTTB-lite)
 * - High-Res Export
 */

const db = getDatabase();

// --- CONFIGURATION ---
const CONFIG = {
  chartId: "historyChart",
  chartMaxPoints: 2000, // Downsample target
  minYear: 1704067200000, // Jan 1, 2024
  minSensorValue: 0.1,    // Filter out 0/noise
  sensorMap: {
    temperature: "temperature",
    humidity: "humidity",
    gas: "gas",
    dust: "dust"
  }
};

// --- STATE MANAGEMENT ---
const State = {
  currentSensor: "gas",
  rawData: [],         // Full resolution data for export
  chart: null,
  unsubscribe: null,
  isExporting: false
};

// --- DATA SERVICE ---
const DataService = {
  /**
   * Fetch data from Firebase for a date range
   */
  fetchRange(startMs, endMs, callback) {
    if (State.unsubscribe) State.unsubscribe();

    const q = query(
      ref(db, "history"),
      orderByChild("timestamp"),
      startAt(startMs),
      endAt(endMs)
    );

    State.unsubscribe = onValue(q, (snapshot) => {
      const processed = this.processSnapshot(snapshot);
      callback(processed);
    });
  },

  /**
   * Process and validate snapshot into useable array
   */
  processSnapshot(snapshot) {
    const rawList = [];

    snapshot.forEach((child) => {
      const d = child.val();
      if (!d || !d.timestamp) return;

      // Handle both numeric milliseconds and ISO date strings
      const ts = new Date(d.timestamp).getTime();

      // Basic check
      if (isNaN(ts) || ts < CONFIG.minYear) {
        // console.warn("Invalid TS:", d.timestamp); // Optional debug
        return;
      }

      // Create standard object for Export usage
      rawList.push({
        ts: ts,
        dateStr: new Date(ts).toLocaleString("id-ID"),
        temp: Number(d.temperature) || 0,
        hum: Number(d.humidity) || 0,
        gas: Number(d.gas) || 0,
        dust: Number(d.dust) || 0
      });
    });

    return rawList;
  },

  /**
   * Prepare data specifically for the Chart (filter & aggregate selected sensor)
   */
  prepareChartData(rawList, sensorKey) {
    const key = CONFIG.sensorMap[sensorKey];
    const dataMap = new Map();

    rawList.forEach(item => {
      // Select sensor value
      let val;
      if (sensorKey === 'temperature') val = item.temp;
      else if (sensorKey === 'humidity') val = item.hum;
      else if (sensorKey === 'gas') val = item.gas;
      else if (sensorKey === 'dust') val = item.dust;

      if (val < CONFIG.minSensorValue) return;

      // Aggregate: Keep MAX value for same timestamp
      if (dataMap.has(item.ts)) {
        dataMap.set(item.ts, Math.max(dataMap.get(item.ts), val));
      } else {
        dataMap.set(item.ts, val);
      }
    });

    let sorted = Array.from(dataMap, ([x, y]) => ({ x, y }))
      .sort((a, b) => a.x - b.x);

    // Downsample if too large
    if (sorted.length > CONFIG.chartMaxPoints) {
      console.log(`Downsampling ${sorted.length} points to ${CONFIG.chartMaxPoints}`);
      sorted = this.downsample(sorted, CONFIG.chartMaxPoints);
    }

    return sorted;
  },

  /**
   * Simple Largest-Triangle-Three-Buckets (LTTB) or Max-Bucket downsampler
   * Here we use a MAX-Bucket approach to preserve peaks (critical for pollution monitoring)
   */
  downsample(data, targetCount) {
    const bucketSize = Math.floor(data.length / targetCount);
    const sampled = [];

    for (let i = 0; i < data.length; i += bucketSize) {
      // Get slice for this bucket
      const bucket = data.slice(i, i + bucketSize);

      // Find point with MAX Y value in this bucket to preserve peaks
      const maxPoint = bucket.reduce((prev, curr) => curr.y > prev.y ? curr : prev, bucket[0]);

      sampled.push(maxPoint);
    }
    return sampled;
  }
};

// --- CHART SERVICE ---
const ChartService = {
  initOrUpdate(dataPoints) {
    const ctx = document.getElementById(CONFIG.chartId)?.getContext("2d");
    if (!ctx) return;

    if (State.chart) {
      State.chart.destroy();
    }

    const colorMap = {
      gas: "#4ade80",
      temperature: "#f87171",
      humidity: "#38bdf8",
      dust: "#a78bfa"
    };

    const color = colorMap[State.currentSensor] || "#3b82f6";

    // Global expose for theme logic access
    window.historyChart = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [{
          label: State.currentSensor.toUpperCase(),
          data: dataPoints,
          tension: 0.2, // Slightly less curve for performance
          borderWidth: 2,
          borderColor: color,
          backgroundColor: color + "1a", // 10% opacity hex
          pointRadius: 0,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: false, // Performance boost for {x,y} data
        normalized: true, // Performance boost for sorted data
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              title: (items) => {
                if (!items.length) return "";
                return new Date(items[0].parsed.x).toLocaleString("id-ID");
              }
            }
          },
          zoom: {
            pan: { enabled: true, mode: "x" },
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'minute',
              displayFormats: {
                minute: 'HH:mm',
                hour: 'dd/MM HH'
              },
              tooltipFormat: 'dd MMM yyyy HH:mm:ss'
            },
            ticks: {
              autoSkip: true,
              maxRotation: 0
            }
          },
          y: {
            beginAtZero: true
          }
        }
      }
    });

    // Update internal state
    State.chart = window.historyChart;

    // Initial theme check
    const isLight = localStorage.getItem("theme") === "light";
    this.updateTheme(isLight);
  },

  updateTheme(isLight) {
    if (!window.historyChart) return;
    const textColor = isLight ? "#64748b" : "#94a3b8";
    const gridColor = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";

    window.historyChart.options.scales.x.ticks.color = textColor;
    window.historyChart.options.scales.y.ticks.color = textColor;
    window.historyChart.options.scales.y.grid.color = gridColor;
    window.historyChart.options.scales.x.grid.color = gridColor;
    window.historyChart.update('none');
  }
};

// --- EXPORT SERVICE ---
const ExportService = {
  toCSV() {
    if (!State.rawData.length) return alert("No data to export.");

    const headers = ["Timestamp", "Temperature", "Humidity", "Gas", "Dust"];
    const rows = State.rawData.map(d =>
      [`"${d.dateStr}"`, d.temp, d.hum, d.gas, d.dust].join(",")
    );

    const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    this.downloadFile(blob, `export_${State.currentSensor}.csv`);
  },

  toExcel() {
    console.log("Attempting Excel export...");
    if (!State.rawData.length) {
      console.warn("No data to export.");
      return alert("No data to export.");
    }

    if (typeof XLSX === 'undefined') {
      console.error("XLSX library not found!");
      return alert("Excel library not loaded. Please wait or refresh.");
    }

    try {
      const cleanData = State.rawData.map(d => ({
        Timestamp: d.dateStr,
        Temperature: d.temp,
        Humidity: d.hum,
        Gas: d.gas,
        Dust: d.dust
      }));

      const ws = XLSX.utils.json_to_sheet(cleanData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "History");
      XLSX.writeFile(wb, `export_${State.currentSensor}.xlsx`);
      console.log("Excel export success.");
    } catch (err) {
      console.error("Excel Export Error:", err);
      alert("Failed to create Excel file. Check console.");
    }
  },

  downloadFile(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

// --- UI CONTROLLER ---
const UI = {
  init() {
    this.bindEvents();
    this.setDefaultDates();
    this.triggerLoad(); // Initial Load
  },

  bindEvents() {
    document.getElementById("historyFilterBtn")?.addEventListener("click", () => this.triggerLoad());
    document.getElementById("exportCsvBtn")?.addEventListener("click", () => ExportService.toCSV());
    document.getElementById("exportExcelBtn")?.addEventListener("click", () => ExportService.toExcel());

    // Theme listener via MutationObserver or Event (Dashboard triggers this usually)
    // For now we hook into global scope if needed, or rely on chart update called externally
  },

  setDefaultDates() {
    const start = document.getElementById("historyStartDate");
    const end = document.getElementById("historyEndDate");
    if (start && end) {
      const d = new Date();
      end.value = d.toISOString().split("T")[0];
      d.setDate(d.getDate() - 7);
      start.value = d.toISOString().split("T")[0];
    }
  },

  triggerLoad() {
    const startInput = document.getElementById("historyStartDate");
    const endInput = document.getElementById("historyEndDate");

    if (!startInput || !endInput) return;

    const startMs = new Date(startInput.value).setHours(0, 0, 0, 0);
    const endMs = new Date(endInput.value).setHours(23, 59, 59, 999);

    if (startMs > endMs) return alert("Invalid Date Range");

    DataService.fetchRange(startMs, endMs, (rawData) => {
      State.rawData = rawData; // Store full data
      this.render();
    });
  },

  render() {
    const chartData = DataService.prepareChartData(State.rawData, State.currentSensor);
    ChartService.initOrUpdate(chartData);
  }
};

// --- GLOBAL INTERFACE (For index.html onclicks) ---
window.selectSensor = (sensor) => {
  State.currentSensor = sensor;

  // UI Update
  const map = {
    temperature: "hist-temp",
    humidity: "hist-humidity",
    gas: "hist-gas",
    dust: "hist-dust"
  };
  Object.values(map).forEach(id => document.getElementById(id)?.classList.remove("active-card"));
  if (map[sensor]) document.getElementById(map[sensor])?.classList.add("active-card");

  // Re-render chart without re-fetching if data exists
  if (State.rawData.length > 0) {
    UI.render();
  } else {
    UI.triggerLoad();
  }
};

// Initialize
UI.init();

// Safety Fallback (Force reload if network hangs)
setTimeout(() => {
  if (State.rawData.length === 0) {
    console.log("Fallback reload...");
    UI.triggerLoad();
  }
}, 3000);

