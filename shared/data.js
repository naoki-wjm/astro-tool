/**
 * Astro Viewer - データ管理モジュール
 *
 * localStorage によるチャート/設定の永続化、都市データの管理。
 */

const STORAGE_KEY = "astro-viewer-charts";

let chartsData = null;
let citiesData = null;

function defaultData() {
  return {
    version: 1,
    settings: {
      houseSystem: "P",
      orbs: { natal: 5, transit: 1, synastry: 3 },
      theme: "dark",
      optionalBodies: {
        chiron: false, lilith: false, ceres: false,
        pallas: false, juno: false, vesta: false,
      },
      minorAspects: false,
    },
    charts: [],
  };
}

/** localStorage からチャートデータを読み込む */
export async function loadCharts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    chartsData = raw ? JSON.parse(raw) : defaultData();
  } catch {
    chartsData = defaultData();
  }
  return chartsData;
}

/** localStorage にチャートデータを保存 */
export function saveCharts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chartsData));
}

/** データをJSONファイルとしてエクスポート */
export function exportData() {
  const blob = new Blob([JSON.stringify(chartsData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "astro-viewer-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** JSONファイルからデータをインポート */
export function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.settings || !Array.isArray(data.charts)) {
        alert("無効なデータ形式です");
        return;
      }
      chartsData = data;
      saveCharts();
      location.reload();
    } catch {
      alert("ファイルの読み込みに失敗しました");
    }
  });
  input.click();
}

/** 現在のデータを返す */
export function getChartsData() {
  return chartsData;
}

/** 設定を取得 */
export function getSettings() {
  return chartsData?.settings || {};
}

/** 設定を更新して保存 */
export function updateSettings(partial) {
  Object.assign(chartsData.settings, partial);
  saveCharts();
}

/** チャートを追加して保存 */
export function addChart(chart) {
  chart.id = crypto.randomUUID();
  chart.createdAt = new Date().toISOString();
  chartsData.charts.push(chart);
  saveCharts();
}

/** チャートを削除して保存 */
export function removeChart(id) {
  chartsData.charts = chartsData.charts.filter(c => c.id !== id);
  saveCharts();
}

/** 保存済みチャート一覧 */
export function getChartList() {
  return chartsData?.charts || [];
}

/** IDでチャートを取得 */
export function getChartById(id) {
  return chartsData?.charts.find(c => c.id === id) || null;
}

// ── cities.json ──

/** 都市データを読み込む（citiesUrl を省略すると同階層の cities.json） */
export async function loadCities(citiesUrl = "./cities.json") {
  const res = await fetch(citiesUrl);
  citiesData = await res.json();
  return citiesData;
}

/** 都道府県リストを返す */
export function getPrefectures() {
  return citiesData ? Object.keys(citiesData) : [];
}

/** 指定都道府県の市区町村リストを返す */
export function getCities(prefecture) {
  return citiesData?.[prefecture] || [];
}

/** 都市を名前で検索 */
export function findCity(prefecture, cityName) {
  const cities = getCities(prefecture);
  return cities.find(c => c.name === cityName) || null;
}
