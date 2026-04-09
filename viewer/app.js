/**
 * Astro Viewer - アプリケーションメインロジック
 *
 * 初期化、UI イベント、テーブル描画を管理する。
 * SVGホイール描画は chart.js に分離。
 */

import { initSwe, calculateNatal, calculateAspects, calculateDistribution,
         calculateTransitPlanets, calculateCrossAspects,
         findLunarReturns, findSolarReturn, calculateChartFromJd, jdToLocalDateTime,
         calcYearlyRange, formatYearlyRangeText,
         formatNatalText, formatTransitText, formatSynastryText,
         formatLunarReturnText, formatSolarReturnText,
         fmt, fmtText, SIGNS, HOUSE_SYSTEMS, PLANETS } from "./calc.js";
import { loadCharts, loadCities, getChartsData, getSettings, addChart, removeChart,
         getChartList, getChartById, getPrefectures, getCities, findCity, updateSettings,
         exportData, importData } from "../shared/data.js";
import { drawWheel, drawDoubleWheel } from "./chart.js";

let currentChart = null;
let currentAspects = null;

// シナストリー用
let synChartA = null;
let synChartB = null;
let synParamsA = null;
let synParamsB = null;
let synCrossAspects = null;

// トランジット用
let transitNatalChart = null;
let transitNatalParams = null;
let transitPlanets = null;
let transitParams = null;
let transitCrossAspects = null;

// ルナリターン用
let lrNatalChart = null;
let lrNatalParams = null;
let lrReturnCharts = [];  // 月2回対応
let lrReturnDateTimes = [];
let lrCrossAspects = [];
let lrCurrentIndex = 0;
let lrLocationLabel = "";

// ソーラーリターン用
let srNatalChart = null;
let srNatalParams = null;
let srReturnChart = null;
let srReturnDateTime = null;
let srCrossAspects = null;
let srLocationLabel = "";
let srYearlyText = "";

// ── 初期化 ──

async function init() {
  const status = document.getElementById("status");

  // データ読み込み（並列）
  const [, citiesData] = await Promise.all([loadCharts(), loadCities("../shared/cities.json")]);

  // 都道府県プルダウン初期化
  const prefSelect = document.getElementById("natalPref");
  for (const pref of getPrefectures()) {
    const opt = document.createElement("option");
    opt.value = pref;
    opt.textContent = pref;
    prefSelect.appendChild(opt);
  }
  updateCitySelect();
  prefSelect.addEventListener("change", updateCitySelect);

  // 保存済みチャート一覧
  refreshSavedCharts();

  // テーマ初期化
  const settings = getSettings();
  applyTheme(settings.theme || "dark");

  // ハウスシステム初期値
  document.getElementById("houseSystem").value = settings.houseSystem || "P";

  // オプション天体チェックボックスの初期値
  const optBodies = settings.optionalBodies || {};
  for (const cb of document.querySelectorAll("#optionalBodies input[type=checkbox]")) {
    cb.checked = !!optBodies[cb.dataset.body];
    cb.addEventListener("change", onOptionalBodyChange);
  }

  // sweph-wasm 初期化
  status.textContent = "天文計算エンジンを初期化中...";
  try {
    await initSwe();
    status.textContent = "準備完了";
    document.getElementById("btnCalc").disabled = false;
    document.getElementById("btnTransitCalc").disabled = false;
    document.getElementById("btnSynCalc").disabled = false;
    document.getElementById("btnLrCalc").disabled = false;
    document.getElementById("btnSrCalc").disabled = false;
  } catch (e) {
    status.textContent = `初期化エラー: ${e.message}`;
    console.error(e);
    return;
  }

  // ── イベントリスナー ──

  document.getElementById("btnCalc").addEventListener("click", onCalculate);
  document.getElementById("btnSave").addEventListener("click", onSave);
  document.getElementById("btnCopy").addEventListener("click", onCopyAll);
  document.getElementById("btnDelete").addEventListener("click", onDelete);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("locToggle").addEventListener("click", toggleLocMode);
  document.getElementById("savedCharts").addEventListener("change", onSelectSaved);

  // タブ切り替え
  for (const tab of document.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => {
      if (tab.disabled) return;
      document.querySelector(".tab.active").classList.remove("active");
      tab.classList.add("active");
      document.querySelector(".tab-content.active").classList.remove("active");
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    });
  }

  // セクション別コピー
  for (const btn of document.querySelectorAll(".btn-copy-section")) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      copySectionText(btn.dataset.section);
    });
  }

  // ── 設定モーダル ──
  document.getElementById("settingsToggle").addEventListener("click", openSettings);
  document.getElementById("settingsClose").addEventListener("click", closeSettings);
  document.getElementById("settingsReset").addEventListener("click", resetSettings);
  document.getElementById("btnExport").addEventListener("click", exportData);
  document.getElementById("btnImport").addEventListener("click", importData);
  document.getElementById("settingsOverlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.getElementById("settingsOverlay").style.display !== "none") {
      closeSettings();
    }
  });

  // ── トランジットタブ初期化 ──
  initTransitTab();

  // ── シナストリータブ初期化 ──
  initSynastryTab();

  // ── リターンタブ初期化 ──
  initReturnTab();
}

// ── 都市選択 ──

function updateCitySelect() {
  const pref = document.getElementById("natalPref").value;
  const citySelect = document.getElementById("natalCity");
  citySelect.innerHTML = "";
  for (const city of getCities(pref)) {
    const opt = document.createElement("option");
    opt.value = city.name;
    opt.textContent = city.name;
    citySelect.appendChild(opt);
  }
}

// ── 場所入力モード切替 ──

let locMode = "select";

function toggleLocMode() {
  const btn = document.getElementById("locToggle");
  const selectEl = document.getElementById("natalLocSelect");
  const coordEl = document.getElementById("natalLocCoord");
  if (locMode === "select") {
    locMode = "coord";
    selectEl.style.display = "none";
    coordEl.style.display = "";
    btn.textContent = "都道府県に戻す";
  } else {
    locMode = "select";
    selectEl.style.display = "";
    coordEl.style.display = "none";
    btn.textContent = "緯度経度で入力";
  }
}

function getLocationInput() {
  if (locMode === "coord") {
    const lat = parseFloat(document.getElementById("natalLat").value);
    const lng = parseFloat(document.getElementById("natalLng").value);
    const utcOffset = parseFloat(document.getElementById("natalTz").value);
    if (isNaN(lat) || isNaN(lng)) {
      alert("緯度・経度を入力してください");
      return null;
    }
    return { lat, lng, utcOffset, label: `緯度${lat}°, 経度${lng}°` };
  } else {
    const pref = document.getElementById("natalPref").value;
    const cityName = document.getElementById("natalCity").value;
    const city = findCity(pref, cityName);
    if (!city) { alert("都市が見つかりません"); return null; }
    return { lat: city.lat, lng: city.lng, utcOffset: 9, label: `${pref}${cityName}` };
  }
}

// ── 計算 ──

function onCalculate() {
  const dateVal = document.getElementById("natalDate").value;
  const timeVal = document.getElementById("natalTime").value;
  if (!dateVal || !timeVal) { alert("日時を入力してください"); return; }

  const [year, month, day] = dateVal.split("-").map(Number);
  const [hour, minute] = timeVal.split(":").map(Number);
  const loc = getLocationInput();
  if (!loc) return;

  const houseSystem = document.getElementById("houseSystem").value;
  const settings = getSettings();

  const params = { year, month, day, hour, minute, ...loc, houseSystem, locationLabel: loc.label };
  const options = { optionalBodies: settings.optionalBodies };

  try {
    currentChart = calculateNatal(params, options);
    currentChart.params = params;

    const orb = settings.orbs?.natal || 5;
    currentAspects = calculateAspects(currentChart.planets, orb, settings.minorAspects);

    renderPlanetsTable(currentChart);
    renderAspectsTable(currentAspects);
    renderHousesTable(currentChart);
    renderDistribution(currentChart.planets);

    document.getElementById("btnSave").disabled = false;
    document.getElementById("btnCopy").disabled = false;
    document.getElementById("status").textContent = "計算完了";

    // SVGホイール描画
    const wheelSvg = document.getElementById("wheelSvg");
    drawWheel(wheelSvg, currentChart, currentAspects);
  } catch (e) {
    document.getElementById("status").textContent = `計算エラー: ${e.message}`;
    console.error(e);
  }
}

// ── テーブル描画 ──

function renderPlanetsTable(chart) {
  const tbody = document.querySelector("#tablePlanets tbody");
  tbody.innerHTML = "";
  for (const p of chart.planets) {
    const tr = document.createElement("tr");
    const retro = p.retrograde ? ' <span style="color:#e74c3c">R</span>' : "";
    tr.innerHTML = `
      <td><span class="planet-glyph" style="color:${p.color}">${p.glyph}</span> ${p.name}</td>
      <td><span style="color:${p.color}">${SIGNS[p.sign].glyph}</span> ${SIGNS[p.sign].fullName}</td>
      <td>${Math.floor(p.lon % 30)}°${String(Math.floor((p.lon % 1) * 60)).padStart(2, "0")}'${retro}</td>
      <td>${p.house}</td>
      <td>${Math.abs(p.speed).toFixed(3)}°/d</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderAspectsTable(aspects) {
  const tbody = document.querySelector("#tableAspects tbody");
  tbody.innerHTML = "";
  for (const a of aspects) {
    const tr = document.createElement("tr");
    const typeClass = a.aspect.type === "conjunction" ? "conj"
      : a.aspect.type === "soft" ? "soft"
      : a.aspect.type === "hard" ? "hard" : "minor";
    const orbSign = a.applying ? "+" : "-";
    const appClass = a.applying ? "applying" : "separating";
    const appMark = a.applying ? "▼" : "▲";
    tr.innerHTML = `
      <td><span class="planet-glyph" style="color:${a.planet1.color}">${a.planet1.glyph}</span> ${a.planet1.name}</td>
      <td><span class="asp-badge ${typeClass}">${a.aspect.symbol} ${a.aspect.angle}°</span></td>
      <td><span class="planet-glyph" style="color:${a.planet2.color}">${a.planet2.glyph}</span> ${a.planet2.name}</td>
      <td>${orbSign}${a.aspect.orb.toFixed(2)}°</td>
      <td class="${appClass}">${appMark}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderHousesTable(chart) {
  const tbody = document.querySelector("#tableHouses tbody");
  tbody.innerHTML = "";
  const labels = ["", "1H (ASC)", "2H", "3H", "4H (IC)", "5H", "6H",
                  "7H (DSC)", "8H", "9H", "10H (MC)", "11H", "12H"];
  for (let i = 1; i <= 12; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${labels[i]}</td>
      <td>${fmt(chart.cusps[i])}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderDistribution(planets) {
  const dist = calculateDistribution(planets);
  const body = document.getElementById("distributionBody");
  body.innerHTML = "";

  const maxCount = planets.filter(p => p.id !== 11 && p.id !== -1).length;

  // 四元素
  body.appendChild(createDistSection("4元素", [
    { label: "火", items: dist.elements.fire, color: "#e74c3c" },
    { label: "地", items: dist.elements.earth, color: "#f1c40f" },
    { label: "風", items: dist.elements.air, color: "#2ecc71" },
    { label: "水", items: dist.elements.water, color: "#3498db" },
  ], maxCount));

  // 三区分
  body.appendChild(createDistSection("3区分", [
    { label: "活動", items: dist.modalities.cardinal, color: "#e74c3c" },
    { label: "不動", items: dist.modalities.fixed, color: "#9b59b6" },
    { label: "柔軟", items: dist.modalities.mutable, color: "#3498db" },
  ], maxCount));

  // ハウス区分
  body.appendChild(createDistSection("ハウス区分", [
    { label: "アンギュラー", items: dist.houseTypes.angular, color: "#e67e22" },
    { label: "サクシーデント", items: dist.houseTypes.succedent, color: "#9b59b6" },
    { label: "ケーデント", items: dist.houseTypes.cadent, color: "#3498db" },
  ], maxCount));

  // 半球
  body.appendChild(createDistSection("半球", [
    { label: "上(7-12)", items: dist.hemispheres.upper, color: "#1abc9c" },
    { label: "下(1-6)", items: dist.hemispheres.lower, color: "#e74c3c" },
    { label: "東(10-3)", items: dist.hemispheres.east, color: "#2ecc71" },
    { label: "西(4-9)", items: dist.hemispheres.west, color: "#f39c12" },
  ], maxCount));
}

function createDistSection(title, rows, maxCount) {
  const section = document.createElement("div");
  section.className = "dist-section";
  section.innerHTML = `<h3>${title}</h3>`;
  for (const row of rows) {
    const div = document.createElement("div");
    div.className = "dist-row";
    const pct = maxCount > 0 ? (row.items.length / maxCount) * 100 : 0;
    div.innerHTML = `
      <span class="dist-label">${row.label}</span>
      <span class="dist-glyphs">${row.items.map(p => `<span style="color:${p.color}">${p.glyph}</span>`).join(" ")}</span>
      <span class="dist-bar"><span class="dist-bar-fill" style="width:${pct}%;background:${row.color}"></span></span>
      <span class="dist-count">${row.items.length}</span>
    `;
    section.appendChild(div);
  }
  return section;
}

// ── 保存・読み込み ──

function refreshSavedCharts() {
  const sel = document.getElementById("savedCharts");
  sel.innerHTML = '<option value="">-- 新規入力 --</option>';
  for (const c of getChartList()) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name || `${c.birthDate} ${c.birthTime}`;
    sel.appendChild(opt);
  }
  // 他タブのドロップダウンも更新
  refreshTransitNatalSelect();
  refreshSynastrySelects();
  refreshReturnNatalSelects();
}

async function onSave() {
  const name = document.getElementById("natalName").value || "";
  const dateVal = document.getElementById("natalDate").value;
  const timeVal = document.getElementById("natalTime").value;
  const loc = getLocationInput();
  if (!loc) return;

  await addChart({
    name,
    birthDate: dateVal,
    birthTime: timeVal,
    location: {
      label: loc.label,
      lat: loc.lat,
      lng: loc.lng,
      timezone: locMode === "coord" ? `UTC${loc.utcOffset >= 0 ? "+" : ""}${loc.utcOffset}` : "Asia/Tokyo",
      utcOffset: loc.utcOffset,
    },
  });

  refreshSavedCharts();
  document.getElementById("status").textContent = "保存しました";
}

function onSelectSaved() {
  const id = document.getElementById("savedCharts").value;
  const deleteBtn = document.getElementById("btnDelete");
  if (!id) {
    deleteBtn.style.display = "none";
    return;
  }
  deleteBtn.style.display = "";
  const c = getChartById(id);
  if (!c) return;

  document.getElementById("natalName").value = c.name || "";
  document.getElementById("natalDate").value = c.birthDate;
  document.getElementById("natalTime").value = c.birthTime;

  if (c.location) {
    // 座標モードに切り替え
    if (locMode === "select") toggleLocMode();
    document.getElementById("natalLat").value = c.location.lat;
    document.getElementById("natalLng").value = c.location.lng;
    document.getElementById("natalTz").value = c.location.utcOffset || 9;
  }

  // 自動計算
  onCalculate();
}

async function onDelete() {
  const id = document.getElementById("savedCharts").value;
  if (!id) return;
  if (!confirm("このチャートを削除しますか？")) return;
  await removeChart(id);
  refreshSavedCharts();
  document.getElementById("btnDelete").style.display = "none";
  document.getElementById("status").textContent = "削除しました";
}

// ── オプション天体 ──

const OPT_BODY_SELECTORS = ["#optionalBodies", "#trOptionalBodies", "#synOptionalBodies", "#lrOptionalBodies", "#srOptionalBodies"];

function onOptionalBodyChange() { syncOptionalBodies("#optionalBodies"); }
function onOptionalBodyChangeSync() { syncOptionalBodies("#trOptionalBodies"); }
function onSynOptionalBodyChange() { syncOptionalBodies("#synOptionalBodies"); }

/** sourceのチェック状態を読み取り、他タブに反映して設定を保存 */
function syncOptionalBodies(sourceSelector) {
  const bodies = {};
  for (const cb of document.querySelectorAll(`${sourceSelector} input[type=checkbox]`)) {
    bodies[cb.dataset.body] = cb.checked;
  }
  for (const sel of OPT_BODY_SELECTORS) {
    if (sel === sourceSelector) continue;
    for (const cb of document.querySelectorAll(`${sel} input[type=checkbox]`)) {
      cb.checked = !!bodies[cb.dataset.body];
    }
  }
  updateSettings({ optionalBodies: bodies });
}

// ── コピー ──

function onCopyAll() {
  if (!currentChart || !currentAspects) return;
  const hsName = HOUSE_SYSTEMS.find(h => h.code === currentChart.params.houseSystem)?.name || "プラシーダス";
  const text = formatNatalText(currentChart.params, currentChart, currentAspects, hsName);
  copyToClipboard(text);
}

function copySectionText(section) {
  if (!currentChart) return;
  let text = "";

  switch (section) {
    case "planets": {
      const lines = currentChart.planets.map(p => {
        const retro = p.retrograde ? " R" : "";
        return `${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`;
      });
      lines.push("");
      lines.push(`ASC ${fmtText(currentChart.angles.asc)} / MC ${fmtText(currentChart.angles.mc)}`);
      text = lines.join("\n");
      break;
    }
    case "distribution": {
      const dist = calculateDistribution(currentChart.planets);
      text = [
        `4元素: 火${dist.elements.fire.length} 地${dist.elements.earth.length} 風${dist.elements.air.length} 水${dist.elements.water.length}`,
        `3区分: 活動${dist.modalities.cardinal.length} 不動${dist.modalities.fixed.length} 柔軟${dist.modalities.mutable.length}`,
        `半球: 上${dist.hemispheres.upper.length} 下${dist.hemispheres.lower.length} 東${dist.hemispheres.east.length} 西${dist.hemispheres.west.length}`,
      ].join("\n");
      break;
    }
    case "aspects": {
      if (!currentAspects) return;
      const aspTexts = currentAspects.map(a => {
        const orbStr = Math.round(a.aspect.orb * 10) / 10;
        return `${a.planet1.name}${a.aspect.symbol}${a.planet2.name}(${orbStr}°)`;
      });
      text = aspTexts.join(" / ");
      break;
    }
    case "houses": {
      const labels = ["", "1H (ASC)", "2H", "3H", "4H (IC)", "5H", "6H",
                      "7H (DSC)", "8H", "9H", "10H (MC)", "11H", "12H"];
      const lines = [];
      for (let i = 1; i <= 12; i++) {
        lines.push(`${labels[i]}: ${fmtText(currentChart.cusps[i])}`);
      }
      text = lines.join("\n");
      break;
    }

    // トランジットタブのセクションコピー
    case "transit-planets": {
      if (!transitPlanets) return;
      text = transitPlanets.map(p => {
        const retro = p.retrograde ? " R" : "";
        return `${p.name} ${fmtText(p.lon)}${retro}`;
      }).join("\n");
      break;
    }
    case "cross-aspects": {
      if (!transitCrossAspects) return;
      text = transitCrossAspects.map(a => {
        const orbStr = Math.round(a.aspect.orb * 10) / 10;
        return `T.${a.planet2.name}${a.aspect.symbol}N.${a.planet1.name}(${orbStr}°)`;
      }).join(" / ");
      break;
    }
    case "transit-natal": {
      if (!transitNatalChart) return;
      const lines = transitNatalChart.planets.map(p => {
        const retro = p.retrograde ? " R" : "";
        return `${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`;
      });
      lines.push("");
      lines.push(`ASC ${fmtText(transitNatalChart.angles.asc)} / MC ${fmtText(transitNatalChart.angles.mc)}`);
      text = lines.join("\n");
      break;
    }
    case "transit-houses": {
      if (!transitNatalChart) return;
      const hlabels = ["", "1H (ASC)", "2H", "3H", "4H (IC)", "5H", "6H",
                       "7H (DSC)", "8H", "9H", "10H (MC)", "11H", "12H"];
      const hlines = [];
      for (let i = 1; i <= 12; i++) {
        hlines.push(`${hlabels[i]}: ${fmtText(transitNatalChart.cusps[i])}`);
      }
      text = hlines.join("\n");
      break;
    }

    // シナストリータブのセクションコピー
    case "syn-cross": {
      if (!synCrossAspects) return;
      text = synCrossAspects.map(a => {
        const orbStr = Math.round(a.aspect.orb * 10) / 10;
        return `A.${a.planet1.name}${a.aspect.symbol}B.${a.planet2.name}(${orbStr}°)`;
      }).join(" / ");
      break;
    }
    case "syn-a-planets": {
      if (!synChartA) return;
      const la = synChartA.planets.map(p => {
        const retro = p.retrograde ? " R" : "";
        return `${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`;
      });
      la.push("");
      la.push(`ASC ${fmtText(synChartA.angles.asc)} / MC ${fmtText(synChartA.angles.mc)}`);
      text = la.join("\n");
      break;
    }
    case "syn-b-planets": {
      if (!synChartB) return;
      const lb = synChartB.planets.map(p => {
        const retro = p.retrograde ? " R" : "";
        return `${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`;
      });
      lb.push("");
      lb.push(`ASC ${fmtText(synChartB.angles.asc)} / MC ${fmtText(synChartB.angles.mc)}`);
      text = lb.join("\n");
      break;
    }
    case "syn-houses": {
      if (!synChartA) return;
      const sl = ["", "1H (ASC)", "2H", "3H", "4H (IC)", "5H", "6H",
                  "7H (DSC)", "8H", "9H", "10H (MC)", "11H", "12H"];
      const slines = [];
      for (let i = 1; i <= 12; i++) {
        slines.push(`${sl[i]}: ${fmtText(synChartA.cusps[i])}`);
      }
      text = slines.join("\n");
      break;
    }

    // ルナリターンタブ
    case "lr-planets": {
      const chart = lrReturnCharts[lrCurrentIndex];
      if (!chart) return;
      text = chart.planets.map(p => {
        const retro = p.retrograde ? " R" : "";
        return `${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`;
      }).join("\n") + `\n\nASC ${fmtText(chart.angles.asc)} / MC ${fmtText(chart.angles.mc)}`;
      break;
    }
    case "lr-cross": {
      const ca = lrCrossAspects[lrCurrentIndex];
      if (!ca) return;
      text = ca.map(a => {
        const orbStr = Math.round(a.aspect.orb * 10) / 10;
        return `LR.${a.planet2.name}${a.aspect.symbol}N.${a.planet1.name}(${orbStr}°)`;
      }).join(" / ");
      break;
    }
    case "lr-natal": {
      if (!lrNatalChart) return;
      const lnl = lrNatalChart.planets.map(p => {
        const retro = p.retrograde ? " R" : "";
        return `${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`;
      });
      lnl.push("");
      lnl.push(`ASC ${fmtText(lrNatalChart.angles.asc)} / MC ${fmtText(lrNatalChart.angles.mc)}`);
      text = lnl.join("\n");
      break;
    }
    case "lr-houses": {
      const chart = lrReturnCharts[lrCurrentIndex];
      if (!chart) return;
      const lhl = ["", "1H (ASC)", "2H", "3H", "4H (IC)", "5H", "6H",
                   "7H (DSC)", "8H", "9H", "10H (MC)", "11H", "12H"];
      text = Array.from({length: 12}, (_, i) => `${lhl[i+1]}: ${fmtText(chart.cusps[i+1])}`).join("\n");
      break;
    }

    // ソーラーリターンタブ
    case "sr-planets": {
      if (!srReturnChart) return;
      text = srReturnChart.planets.map(p => {
        const retro = p.retrograde ? " R" : "";
        return `${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`;
      }).join("\n") + `\n\nASC ${fmtText(srReturnChart.angles.asc)} / MC ${fmtText(srReturnChart.angles.mc)}`;
      break;
    }
    case "sr-cross": {
      if (!srCrossAspects) return;
      text = srCrossAspects.map(a => {
        const orbStr = Math.round(a.aspect.orb * 10) / 10;
        return `SR.${a.planet2.name}${a.aspect.symbol}N.${a.planet1.name}(${orbStr}°)`;
      }).join(" / ");
      break;
    }
    case "sr-natal": {
      if (!srNatalChart) return;
      const snl = srNatalChart.planets.map(p => {
        const retro = p.retrograde ? " R" : "";
        return `${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`;
      });
      snl.push("");
      snl.push(`ASC ${fmtText(srNatalChart.angles.asc)} / MC ${fmtText(srNatalChart.angles.mc)}`);
      text = snl.join("\n");
      break;
    }
    case "sr-houses": {
      if (!srReturnChart) return;
      const shl = ["", "1H (ASC)", "2H", "3H", "4H (IC)", "5H", "6H",
                   "7H (DSC)", "8H", "9H", "10H (MC)", "11H", "12H"];
      text = Array.from({length: 12}, (_, i) => `${shl[i+1]}: ${fmtText(srReturnChart.cusps[i+1])}`).join("\n");
      break;
    }
    case "sr-yearly": {
      text = srYearlyText;
      break;
    }
  }

  if (text) copyToClipboard(text);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showCopyFeedback("コピーしました");
  }).catch(() => {
    showCopyFeedback("コピーに失敗しました");
  });
}

function showCopyFeedback(msg) {
  let el = document.querySelector(".copy-feedback");
  if (!el) {
    el = document.createElement("div");
    el.className = "copy-feedback";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1500);
}

// ── トランジットタブ ──

function initTransitTab() {
  // トランジット日時のデフォルト = 現在
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  document.getElementById("trTransitDate").value =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  document.getElementById("trTransitTime").value =
    `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // 保存済みチャート一覧（トランジット用）
  refreshTransitNatalSelect();

  // ネイタル場所入力（都道府県/緯度経度）
  initLocInput("trNatal");

  // オプション天体チェックボックスの初期値（設定を共有）
  const settings = getSettings();
  const trOptBodies = settings.optionalBodies || {};
  for (const cb of document.querySelectorAll("#trOptionalBodies input[type=checkbox]")) {
    cb.checked = !!trOptBodies[cb.dataset.body];
    cb.addEventListener("change", onOptionalBodyChangeSync);
  }

  // イベント
  document.getElementById("trNatalSelect").addEventListener("change", onTransitNatalSelect);
  document.getElementById("btnTransitCalc").addEventListener("click", onTransitCalculate);
  document.getElementById("btnTransitCopy").addEventListener("click", onTransitCopyAll);
}

function refreshTransitNatalSelect() {
  const sel = document.getElementById("trNatalSelect");
  sel.innerHTML = '<option value="">-- 手動入力 --</option>';
  for (const c of getChartList()) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name || `${c.birthDate} ${c.birthTime}`;
    sel.appendChild(opt);
  }
}

function onTransitNatalSelect() {
  const id = document.getElementById("trNatalSelect").value;
  if (!id) return;
  const c = getChartById(id);
  if (!c) return;

  document.getElementById("trNatalName").value = c.name || "";
  document.getElementById("trNatalDate").value = c.birthDate;
  document.getElementById("trNatalTime").value = c.birthTime;
  if (c.location) {
    setLocFromChart("trNatal", c.location);
  }
}

function onTransitCalculate() {
  const status = document.getElementById("transitStatus");

  // ネイタルデータ取得
  const nDate = document.getElementById("trNatalDate").value;
  const nTime = document.getElementById("trNatalTime").value;
  const houseSystem = document.getElementById("trHouseSystem").value;
  const nLoc = getLocInput("trNatal");

  if (!nDate || !nTime || !nLoc) {
    status.textContent = "ネイタルデータを入力してください";
    return;
  }

  const [nY, nM, nD] = nDate.split("-").map(Number);
  const [nH, nMin] = nTime.split(":").map(Number);

  // トランジット日時取得
  const tDate = document.getElementById("trTransitDate").value;
  const tTime = document.getElementById("trTransitTime").value;
  const tTz = parseFloat(document.getElementById("trTransitTz").value);

  if (!tDate || !tTime) {
    status.textContent = "トランジット日時を入力してください";
    return;
  }

  const [tY, tM, tD] = tDate.split("-").map(Number);
  const [tH, tMin] = tTime.split(":").map(Number);

  const settings = getSettings();

  try {
    // ネイタル計算
    transitNatalParams = {
      year: nY, month: nM, day: nD, hour: nH, minute: nMin,
      lat: nLoc.lat, lng: nLoc.lng, utcOffset: nLoc.utcOffset, houseSystem,
      locationLabel: nLoc.label,
    };
    const nName = document.getElementById("trNatalName").value;
    if (nName) transitNatalParams.locationLabel = nName;

    transitNatalChart = calculateNatal(transitNatalParams, { optionalBodies: settings.optionalBodies });
    transitNatalChart.params = transitNatalParams;

    // トランジット計算
    transitParams = {
      year: tY, month: tM, day: tD, hour: tH, minute: tMin,
      utcOffset: tTz,
    };
    const transitResult = calculateTransitPlanets(transitParams, { optionalBodies: settings.optionalBodies });
    transitPlanets = transitResult.planets;

    // クロスアスペクト
    const transitOrb = settings.orbs?.transit || 1;
    transitCrossAspects = calculateCrossAspects(
      transitNatalChart.planets, transitPlanets, transitOrb, settings.minorAspects, transitNatalChart.angles
    );

    // テーブル描画
    renderTransitPlanetsTable(transitPlanets);
    renderTransitCrossAspectsTable(transitCrossAspects);
    renderTransitNatalTable(transitNatalChart);
    renderTransitHousesTable(transitNatalChart);

    // 二重円描画
    const svg = document.getElementById("transitWheelSvg");
    drawDoubleWheel(svg, transitNatalChart, transitPlanets, transitCrossAspects);

    // 凡例表示
    document.getElementById("transitLegend").style.display = "";
    const tDateStr = `${tY}-${String(tM).padStart(2, "0")}-${String(tD).padStart(2, "0")}`;
    document.getElementById("transitLegendLabel").textContent = `トランジット (${tDateStr})`;

    document.getElementById("btnTransitCopy").disabled = false;
    status.textContent = "計算完了";
  } catch (e) {
    status.textContent = `計算エラー: ${e.message}`;
    console.error(e);
  }
}

function renderTransitPlanetsTable(planets) {
  const tbody = document.querySelector("#tableTransitPlanets tbody");
  tbody.innerHTML = "";
  for (const p of planets) {
    const tr = document.createElement("tr");
    const retro = p.retrograde ? ' <span style="color:#e74c3c">R</span>' : "";
    tr.innerHTML = `
      <td><span class="planet-glyph" style="color:${p.color}">${p.glyph}</span> ${p.name}</td>
      <td><span style="color:${p.color}">${SIGNS[p.sign].glyph}</span> ${SIGNS[p.sign].fullName}</td>
      <td>${Math.floor(p.lon % 30)}°${String(Math.floor((p.lon % 1) * 60)).padStart(2, "0")}'${retro}</td>
      <td>${Math.abs(p.speed).toFixed(3)}°/d</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderTransitCrossAspectsTable(aspects) {
  const tbody = document.querySelector("#tableCrossAspects tbody");
  tbody.innerHTML = "";
  for (const a of aspects) {
    const tr = document.createElement("tr");
    const typeClass = a.aspect.type === "conjunction" ? "conj"
      : a.aspect.type === "soft" ? "soft"
      : a.aspect.type === "hard" ? "hard" : "minor";
    const orbSign = a.applying ? "+" : "-";
    const appClass = a.applying ? "applying" : "separating";
    const appMark = a.applying ? "▼" : "▲";
    tr.innerHTML = `
      <td><span class="planet-glyph" style="color:${a.planet2.color}">${a.planet2.glyph}</span> ${a.planet2.name}</td>
      <td><span class="asp-badge ${typeClass}">${a.aspect.symbol} ${a.aspect.angle}°</span></td>
      <td><span class="planet-glyph" style="color:${a.planet1.color}">${a.planet1.glyph}</span> ${a.planet1.name}</td>
      <td>${orbSign}${a.aspect.orb.toFixed(2)}°</td>
      <td class="${appClass}">${appMark}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderTransitNatalTable(chart) {
  const tbody = document.querySelector("#tableTransitNatal tbody");
  tbody.innerHTML = "";
  for (const p of chart.planets) {
    const tr = document.createElement("tr");
    const retro = p.retrograde ? ' <span style="color:#e74c3c">R</span>' : "";
    tr.innerHTML = `
      <td><span class="planet-glyph" style="color:${p.color}">${p.glyph}</span> ${p.name}</td>
      <td><span style="color:${p.color}">${SIGNS[p.sign].glyph}</span> ${SIGNS[p.sign].fullName}</td>
      <td>${Math.floor(p.lon % 30)}°${String(Math.floor((p.lon % 1) * 60)).padStart(2, "0")}'${retro}</td>
      <td>${p.house}</td>
      <td>${Math.abs(p.speed).toFixed(3)}°/d</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderTransitHousesTable(chart) {
  const tbody = document.querySelector("#tableTransitHouses tbody");
  tbody.innerHTML = "";
  const labels = ["", "1H (ASC)", "2H", "3H", "4H (IC)", "5H", "6H",
                  "7H (DSC)", "8H", "9H", "10H (MC)", "11H", "12H"];
  for (let i = 1; i <= 12; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${labels[i]}</td>
      <td>${fmt(chart.cusps[i])}</td>
    `;
    tbody.appendChild(tr);
  }
}

function onTransitCopyAll() {
  if (!transitNatalChart || !transitPlanets || !transitCrossAspects) return;
  const hsName = HOUSE_SYSTEMS.find(h => h.code === transitNatalParams.houseSystem)?.name || "プラシーダス";
  const text = formatTransitText(transitNatalParams, transitNatalChart, transitParams, transitPlanets, transitCrossAspects, hsName);
  copyToClipboard(text);
}

// ── シナストリータブ ──

function initSynastryTab() {
  refreshSynastrySelects();

  // 場所入力（都道府県/緯度経度）
  initLocInput("synA");
  initLocInput("synB");

  // オプション天体チェックボックスの初期値
  const settings = getSettings();
  const synOptBodies = settings.optionalBodies || {};
  for (const cb of document.querySelectorAll("#synOptionalBodies input[type=checkbox]")) {
    cb.checked = !!synOptBodies[cb.dataset.body];
    cb.addEventListener("change", onSynOptionalBodyChange);
  }

  document.getElementById("synASelect").addEventListener("change", () => onSynSelect("A"));
  document.getElementById("synBSelect").addEventListener("change", () => onSynSelect("B"));
  document.getElementById("btnSynCalc").addEventListener("click", onSynCalculate);
  document.getElementById("btnSynCopy").addEventListener("click", onSynCopyAll);
}

function refreshSynastrySelects() {
  for (const suffix of ["A", "B"]) {
    const sel = document.getElementById(`syn${suffix}Select`);
    sel.innerHTML = '<option value="">-- 手動入力 --</option>';
    for (const c of getChartList()) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name || `${c.birthDate} ${c.birthTime}`;
      sel.appendChild(opt);
    }
  }
}

function onSynSelect(side) {
  const id = document.getElementById(`syn${side}Select`).value;
  if (!id) return;
  const c = getChartById(id);
  if (!c) return;

  document.getElementById(`syn${side}Name`).value = c.name || "";
  document.getElementById(`syn${side}Date`).value = c.birthDate;
  document.getElementById(`syn${side}Time`).value = c.birthTime;
  if (c.location) {
    setLocFromChart(`syn${side}`, c.location);
  }
}

function getSynParams(side) {
  const date = document.getElementById(`syn${side}Date`).value;
  const time = document.getElementById(`syn${side}Time`).value;
  const name = document.getElementById(`syn${side}Name`).value;
  const loc = getLocInput(`syn${side}`);

  if (!date || !time || !loc) return null;

  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);

  return {
    year: y, month: m, day: d, hour: h, minute: min,
    lat: loc.lat, lng: loc.lng, utcOffset: loc.utcOffset,
    name: name || `Person ${side}`,
    locationLabel: name || loc.label,
  };
}

function onSynCalculate() {
  const status = document.getElementById("synStatus");

  const pA = getSynParams("A");
  if (!pA) { status.textContent = "Person A のデータを入力してください"; return; }
  const pB = getSynParams("B");
  if (!pB) { status.textContent = "Person B のデータを入力してください"; return; }

  const houseSystem = document.getElementById("synAHouse").value;
  pA.houseSystem = houseSystem;
  pB.houseSystem = houseSystem;

  const settings = getSettings();
  const opts = { optionalBodies: settings.optionalBodies };

  try {
    synParamsA = pA;
    synParamsB = pB;
    synChartA = calculateNatal(pA, opts);
    synChartA.params = pA;
    synChartB = calculateNatal(pB, opts);
    synChartB.params = pB;

    const synOrb = settings.orbs?.synastry || 3;
    synCrossAspects = calculateCrossAspects(synChartA.planets, synChartB.planets, synOrb, settings.minorAspects, synChartA.angles);

    // テーブル描画
    renderSynPlanetsTable("#tableSynAPlanets", synChartA);
    renderSynPlanetsTable("#tableSynBPlanets", synChartB);
    renderSynCrossAspectsTable(synCrossAspects);
    renderSynHousesTable(synChartA);

    // 二重円描画（内輪=A、外輪=B）
    const svg = document.getElementById("synWheelSvg");
    drawDoubleWheel(svg, synChartA, synChartB.planets, synCrossAspects, { outerColor: "#E67E22" });

    // 凡例
    document.getElementById("synLegend").style.display = "";
    document.getElementById("synLegendA").textContent = pA.name;
    document.getElementById("synLegendB").textContent = pB.name;

    document.getElementById("btnSynCopy").disabled = false;
    status.textContent = "計算完了";
  } catch (e) {
    status.textContent = `計算エラー: ${e.message}`;
    console.error(e);
  }
}

function renderSynPlanetsTable(selector, chart) {
  const tbody = document.querySelector(`${selector} tbody`);
  tbody.innerHTML = "";
  for (const p of chart.planets) {
    const tr = document.createElement("tr");
    const retro = p.retrograde ? ' <span style="color:#e74c3c">R</span>' : "";
    tr.innerHTML = `
      <td><span class="planet-glyph" style="color:${p.color}">${p.glyph}</span> ${p.name}</td>
      <td><span style="color:${p.color}">${SIGNS[p.sign].glyph}</span> ${SIGNS[p.sign].fullName}</td>
      <td>${Math.floor(p.lon % 30)}°${String(Math.floor((p.lon % 1) * 60)).padStart(2, "0")}'${retro}</td>
      <td>${p.house}</td>
      <td>${Math.abs(p.speed).toFixed(3)}°/d</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderSynCrossAspectsTable(aspects) {
  const tbody = document.querySelector("#tableSynCrossAspects tbody");
  tbody.innerHTML = "";
  for (const a of aspects) {
    const tr = document.createElement("tr");
    const typeClass = a.aspect.type === "conjunction" ? "conj"
      : a.aspect.type === "soft" ? "soft"
      : a.aspect.type === "hard" ? "hard" : "minor";
    const orbSign = a.applying ? "+" : "-";
    const appClass = a.applying ? "applying" : "separating";
    const appMark = a.applying ? "▼" : "▲";
    tr.innerHTML = `
      <td><span class="planet-glyph" style="color:${a.planet1.color}">${a.planet1.glyph}</span> ${a.planet1.name}</td>
      <td><span class="asp-badge ${typeClass}">${a.aspect.symbol} ${a.aspect.angle}°</span></td>
      <td><span class="planet-glyph" style="color:${a.planet2.color}">${a.planet2.glyph}</span> ${a.planet2.name}</td>
      <td>${orbSign}${a.aspect.orb.toFixed(2)}°</td>
      <td class="${appClass}">${appMark}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderSynHousesTable(chart) {
  const tbody = document.querySelector("#tableSynHouses tbody");
  tbody.innerHTML = "";
  const labels = ["", "1H (ASC)", "2H", "3H", "4H (IC)", "5H", "6H",
                  "7H (DSC)", "8H", "9H", "10H (MC)", "11H", "12H"];
  for (let i = 1; i <= 12; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${labels[i]}</td>
      <td>${fmt(chart.cusps[i])}</td>
    `;
    tbody.appendChild(tr);
  }
}

function onSynCopyAll() {
  if (!synChartA || !synChartB || !synCrossAspects) return;
  const hsName = HOUSE_SYSTEMS.find(h => h.code === synParamsA.houseSystem)?.name || "プラシーダス";
  const text = formatSynastryText(synParamsA, synChartA, synParamsB, synChartB, synCrossAspects, hsName);
  copyToClipboard(text);
}

// ── 設定モーダル ──

const DEFAULT_ORBS = { natal: 5, transit: 1, synastry: 3 };

function openSettings() {
  const s = getSettings();
  document.getElementById("orbNatal").value = s.orbs?.natal ?? 5;
  document.getElementById("orbTransit").value = s.orbs?.transit ?? 1;
  document.getElementById("orbSynastry").value = s.orbs?.synastry ?? 3;
  document.getElementById("minorAspects").checked = !!s.minorAspects;
  document.getElementById("settingsOverlay").style.display = "flex";
}

function closeSettings() {
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const orbs = {
    natal:    clamp(parseFloat(document.getElementById("orbNatal").value) || 5, 0.5, 15),
    transit:  clamp(parseFloat(document.getElementById("orbTransit").value) || 1, 0.5, 15),
    synastry: clamp(parseFloat(document.getElementById("orbSynastry").value) || 3, 0.5, 15),
  };
  const minorAspects = document.getElementById("minorAspects").checked;
  updateSettings({ orbs, minorAspects });

  document.getElementById("settingsOverlay").style.display = "none";

  recalculateAspects(orbs, minorAspects);
}

function resetSettings() {
  document.getElementById("orbNatal").value = DEFAULT_ORBS.natal;
  document.getElementById("orbTransit").value = DEFAULT_ORBS.transit;
  document.getElementById("orbSynastry").value = DEFAULT_ORBS.synastry;
  document.getElementById("minorAspects").checked = false;
}

/** 設定変更後にアスペクトだけ再計算してテーブル+ホイールを更新 */
function recalculateAspects(orbs, minorAspects) {
  // ネイタル
  if (currentChart) {
    currentAspects = calculateAspects(currentChart.planets, orbs.natal, minorAspects);
    renderAspectsTable(currentAspects);
    drawWheel(document.getElementById("wheelSvg"), currentChart, currentAspects);
  }
  // トランジット
  if (transitNatalChart && transitPlanets) {
    transitCrossAspects = calculateCrossAspects(
      transitNatalChart.planets, transitPlanets, orbs.transit, minorAspects, transitNatalChart.angles
    );
    renderTransitCrossAspectsTable(transitCrossAspects);
    drawDoubleWheel(document.getElementById("transitWheelSvg"), transitNatalChart, transitPlanets, transitCrossAspects);
  }
  // シナストリー
  if (synChartA && synChartB) {
    synCrossAspects = calculateCrossAspects(
      synChartA.planets, synChartB.planets, orbs.synastry, minorAspects, synChartA.angles
    );
    renderSynCrossAspectsTable(synCrossAspects);
    drawDoubleWheel(document.getElementById("synWheelSvg"), synChartA, synChartB.planets, synCrossAspects, { outerColor: "#E67E22" });
  }
  // ルナリターン
  if (lrNatalChart && lrReturnCharts.length > 0) {
    for (let i = 0; i < lrReturnCharts.length; i++) {
      lrCrossAspects[i] = calculateCrossAspects(
        lrNatalChart.planets, lrReturnCharts[i].planets, orbs.transit, minorAspects, lrNatalChart.angles
      );
    }
    renderReturnDisplay("lr");
  }
  // ソーラーリターン
  if (srNatalChart && srReturnChart) {
    srCrossAspects = calculateCrossAspects(
      srNatalChart.planets, srReturnChart.planets, orbs.transit, minorAspects, srNatalChart.angles
    );
    renderReturnDisplay("sr");
  }
}

// ── テーマ ──

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("themeToggle").textContent = theme === "dark" ? "🌙" : "☀️";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  updateSettings({ theme: next });
  // ホイールを再描画（SVG内の色はCSS変数ではなく直接指定のため）
  if (currentChart && currentAspects) {
    drawWheel(document.getElementById("wheelSvg"), currentChart, currentAspects);
  }
  if (transitNatalChart && transitPlanets && transitCrossAspects) {
    drawDoubleWheel(document.getElementById("transitWheelSvg"), transitNatalChart, transitPlanets, transitCrossAspects);
  }
  if (synChartA && synChartB && synCrossAspects) {
    drawDoubleWheel(document.getElementById("synWheelSvg"), synChartA, synChartB.planets, synCrossAspects, { outerColor: "#E67E22" });
  }
  if (lrNatalChart && lrReturnCharts[lrCurrentIndex]) {
    drawDoubleWheel(document.getElementById("lrWheelSvg"), lrNatalChart, lrReturnCharts[lrCurrentIndex].planets, lrCrossAspects[lrCurrentIndex], { outerColor: "#E67E22" });
  }
  if (srNatalChart && srReturnChart && srCrossAspects) {
    drawDoubleWheel(document.getElementById("srWheelSvg"), srNatalChart, srReturnChart.planets, srCrossAspects, { outerColor: "#E67E22" });
  }
}

// ── リターンタブ ──

function initReturnTab() {
  // デフォルト年月
  const now = new Date();
  document.getElementById("lrYear").value = now.getFullYear();
  document.getElementById("lrMonth").value = now.getMonth() + 1;
  document.getElementById("srYear").value = now.getFullYear();

  // 保存済みチャート
  refreshReturnNatalSelects();

  // 場所入力（都道府県/緯度経度）- ネイタル + リターン場所
  initLocInput("lrNatal");
  initLocInput("srNatal");
  initLocInput("lrRet");
  initLocInput("srRet");

  // オプション天体チェックボックス
  const settings = getSettings();
  const optBodies = settings.optionalBodies || {};
  for (const sel of ["#lrOptionalBodies", "#srOptionalBodies"]) {
    for (const cb of document.querySelectorAll(`${sel} input[type=checkbox]`)) {
      cb.checked = !!optBodies[cb.dataset.body];
      cb.addEventListener("change", () => syncOptionalBodies(sel));
    }
  }

  // サブナビ切替
  for (const btn of document.querySelectorAll(".return-sub")) {
    btn.addEventListener("click", () => {
      document.querySelector(".return-sub.active").classList.remove("active");
      btn.classList.add("active");
      document.querySelector(".return-panel.active").classList.remove("active");
      document.getElementById(`return-${btn.dataset.return}`).classList.add("active");
    });
  }

  // ネイタルチャート選択
  document.getElementById("lrNatalSelect").addEventListener("change", () => onReturnNatalSelect("lr"));
  document.getElementById("srNatalSelect").addEventListener("change", () => onReturnNatalSelect("sr"));

  // 計算ボタン
  document.getElementById("btnLrCalc").addEventListener("click", onLunarReturnCalc);
  document.getElementById("btnSrCalc").addEventListener("click", onSolarReturnCalc);

  // コピーボタン
  document.getElementById("btnLrCopy").addEventListener("click", onLrCopyAll);
  document.getElementById("btnSrCopy").addEventListener("click", onSrCopyAll);

  // LR切替ボタン
  for (const btn of document.querySelectorAll("#lrSwitcher .btn-sm")) {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.lr);
      if (idx >= lrReturnCharts.length) return;
      lrCurrentIndex = idx;
      document.querySelector("#lrSwitcher .btn-sm.active").classList.remove("active");
      btn.classList.add("active");
      renderReturnDisplay("lr");
    });
  }
}

// ── 汎用場所入力（都道府県/緯度経度切替） ──

/** 場所入力モード管理（ID接頭辞 → "select" | "coord"） */
const locModes = {};

/**
 * 場所入力UIを初期化する
 * @param {string} prefix - DOM要素のID接頭辞（例: "trNatal", "synA", "lrRet"）
 *   要素命名規則: {prefix}Pref, {prefix}City, {prefix}Lat, {prefix}Lng, {prefix}Tz,
 *                  {prefix}LocSelect, {prefix}LocCoord, {prefix}LocToggle
 */
function initLocInput(prefix) {
  locModes[prefix] = "select";

  const prefSelect = document.getElementById(`${prefix}Pref`);
  if (!prefSelect) return;
  for (const pref of getPrefectures()) {
    const opt = document.createElement("option");
    opt.value = pref;
    opt.textContent = pref;
    prefSelect.appendChild(opt);
  }
  updateLocCitySelect(prefix);
  prefSelect.addEventListener("change", () => updateLocCitySelect(prefix));

  const toggleBtn = document.getElementById(`${prefix}LocToggle`);
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => toggleLocInputMode(prefix));
  }
}

function updateLocCitySelect(prefix) {
  const pref = document.getElementById(`${prefix}Pref`).value;
  const citySelect = document.getElementById(`${prefix}City`);
  citySelect.innerHTML = "";
  for (const city of getCities(pref)) {
    const opt = document.createElement("option");
    opt.value = city.name;
    opt.textContent = city.name;
    citySelect.appendChild(opt);
  }
}

function toggleLocInputMode(prefix) {
  const btn = document.getElementById(`${prefix}LocToggle`);
  const selectEl = document.getElementById(`${prefix}LocSelect`);
  const coordEl = document.getElementById(`${prefix}LocCoord`);
  if (locModes[prefix] === "select") {
    locModes[prefix] = "coord";
    selectEl.style.display = "none";
    coordEl.style.display = "";
    btn.textContent = "都道府県に戻す";
  } else {
    locModes[prefix] = "select";
    selectEl.style.display = "";
    coordEl.style.display = "none";
    btn.textContent = "緯度経度で入力";
  }
}

function getLocInput(prefix) {
  if (locModes[prefix] === "coord") {
    const lat = parseFloat(document.getElementById(`${prefix}Lat`).value);
    const lng = parseFloat(document.getElementById(`${prefix}Lng`).value);
    const utcOffset = parseFloat(document.getElementById(`${prefix}Tz`).value);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng, utcOffset, label: `緯度${lat}°, 経度${lng}°` };
  } else {
    const pref = document.getElementById(`${prefix}Pref`).value;
    const cityName = document.getElementById(`${prefix}City`).value;
    const city = findCity(pref, cityName);
    if (!city) return null;
    return { lat: city.lat, lng: city.lng, utcOffset: 9, label: `${pref}${cityName}` };
  }
}

/**
 * 保存済みチャートの読み込み時に場所を設定する
 * 座標モードに切り替え、緯度経度を入力欄にセットする
 */
function setLocFromChart(prefix, location) {
  if (!location) return;
  // 座標モードに切り替え
  if (locModes[prefix] === "select") {
    toggleLocInputMode(prefix);
  }
  document.getElementById(`${prefix}Lat`).value = location.lat;
  document.getElementById(`${prefix}Lng`).value = location.lng;
  const tzEl = document.getElementById(`${prefix}Tz`);
  if (tzEl) tzEl.value = location.utcOffset || 9;
}

function refreshReturnNatalSelects() {
  for (const prefix of ["lr", "sr"]) {
    const sel = document.getElementById(`${prefix}NatalSelect`);
    sel.innerHTML = '<option value="">-- 手動入力 --</option>';
    for (const c of getChartList()) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name || `${c.birthDate} ${c.birthTime}`;
      sel.appendChild(opt);
    }
  }
}

function onReturnNatalSelect(prefix) {
  const id = document.getElementById(`${prefix}NatalSelect`).value;
  if (!id) return;
  const c = getChartById(id);
  if (!c) return;

  document.getElementById(`${prefix}NatalName`).value = c.name || "";
  document.getElementById(`${prefix}NatalDate`).value = c.birthDate;
  document.getElementById(`${prefix}NatalTime`).value = c.birthTime;
  if (c.location) {
    setLocFromChart(`${prefix}Natal`, c.location);
  }
}

function getReturnNatalParams(prefix) {
  const date = document.getElementById(`${prefix}NatalDate`).value;
  const time = document.getElementById(`${prefix}NatalTime`).value;
  const name = document.getElementById(`${prefix}NatalName`).value;
  const houseSystem = document.getElementById(`${prefix}HouseSystem`).value;
  const loc = getLocInput(`${prefix}Natal`);

  if (!date || !time || !loc) return null;

  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);

  return {
    year: y, month: m, day: d, hour: h, minute: min,
    lat: loc.lat, lng: loc.lng, utcOffset: loc.utcOffset, houseSystem,
    name: name || "",
    locationLabel: name || loc.label,
  };
}

// ── ルナリターン計算 ──

function onLunarReturnCalc() {
  const status = document.getElementById("lrStatus");

  const nParams = getReturnNatalParams("lr");
  if (!nParams) { status.textContent = "ネイタルデータを入力してください"; return; }

  const year = parseInt(document.getElementById("lrYear").value);
  const month = parseInt(document.getElementById("lrMonth").value);
  const loc = getLocInput("lrRet");
  if (!loc) {
    status.textContent = "リターン時の場所を入力してください";
    return;
  }

  const settings = getSettings();
  const opts = { optionalBodies: settings.optionalBodies };

  try {
    status.textContent = "計算中...";

    // ネイタル計算
    lrNatalParams = nParams;
    lrNatalChart = calculateNatal(nParams, opts);
    lrNatalChart.params = nParams;

    // ネイタル月の黄経
    const natalMoon = lrNatalChart.planets.find(p => p.id === 1);
    if (!natalMoon) { status.textContent = "ネイタル月の計算に失敗しました"; return; }

    // LR探索
    const returnJds = findLunarReturns(natalMoon.lon, year, month);
    if (returnJds.length === 0) {
      status.textContent = `${year}年${month}月のルナリターンが見つかりませんでした`;
      return;
    }

    lrLocationLabel = loc.label;

    // 各リターンのチャートを計算
    lrReturnCharts = [];
    lrReturnDateTimes = [];
    lrCrossAspects = [];

    const transitOrb = settings.orbs?.transit || 1;

    for (const jd of returnJds) {
      const chart = calculateChartFromJd(jd, { lat: loc.lat, lng: loc.lng, houseSystem: nParams.houseSystem }, opts);
      const dt = jdToLocalDateTime(jd, loc.utcOffset);
      const cross = calculateCrossAspects(lrNatalChart.planets, chart.planets, transitOrb, settings.minorAspects, lrNatalChart.angles);

      lrReturnCharts.push(chart);
      lrReturnDateTimes.push(dt);
      lrCrossAspects.push(cross);
    }

    // LR切替ボタン表示
    const switcher = document.getElementById("lrSwitcher");
    if (returnJds.length > 1) {
      switcher.style.display = "";
      const btns = switcher.querySelectorAll(".btn-sm");
      btns.forEach((btn, i) => {
        btn.style.display = i < returnJds.length ? "" : "none";
        btn.classList.toggle("active", i === 0);
      });
    } else {
      switcher.style.display = "none";
    }

    lrCurrentIndex = 0;
    renderReturnDisplay("lr");

    document.getElementById("btnLrCopy").disabled = false;
    status.textContent = `計算完了（${returnJds.length}回のルナリターン）`;
  } catch (e) {
    status.textContent = `計算エラー: ${e.message}`;
    console.error(e);
  }
}

// ── ソーラーリターン計算 ──

function onSolarReturnCalc() {
  const status = document.getElementById("srStatus");

  const nParams = getReturnNatalParams("sr");
  if (!nParams) { status.textContent = "ネイタルデータを入力してください"; return; }

  const year = parseInt(document.getElementById("srYear").value);
  const loc = getLocInput("srRet");
  if (!loc) {
    status.textContent = "リターン時の場所を入力してください";
    return;
  }

  const settings = getSettings();
  const opts = { optionalBodies: settings.optionalBodies };

  try {
    status.textContent = "計算中...";

    // ネイタル計算
    srNatalParams = nParams;
    srNatalChart = calculateNatal(nParams, opts);
    srNatalChart.params = nParams;

    // ネイタル太陽の黄経
    const natalSun = srNatalChart.planets.find(p => p.id === 0);
    if (!natalSun) { status.textContent = "ネイタル太陽の計算に失敗しました"; return; }

    // SR探索
    const returnJd = findSolarReturn(natalSun.lon, year, nParams.month, nParams.day);
    if (!returnJd) {
      status.textContent = `${year}年のソーラーリターンが見つかりませんでした`;
      return;
    }

    srLocationLabel = loc.label;

    srReturnChart = calculateChartFromJd(returnJd, { lat: loc.lat, lng: loc.lng, houseSystem: nParams.houseSystem }, opts);
    srReturnDateTime = jdToLocalDateTime(returnJd, loc.utcOffset);

    const transitOrb = settings.orbs?.transit || 1;
    srCrossAspects = calculateCrossAspects(srNatalChart.planets, srReturnChart.planets, transitOrb, settings.minorAspects, srNatalChart.angles);

    renderReturnDisplay("sr");

    // 年間概要（非同期的に計算 — 重い処理）
    const yearlyStatus = document.getElementById("srYearlyStatus");
    yearlyStatus.textContent = "年間概要を計算中...";
    document.getElementById("srYearlyText").textContent = "";

    setTimeout(() => {
      try {
        const nextYearJd = findSolarReturn(natalSun.lon, year + 1, nParams.month, nParams.day);
        if (returnJd && nextYearJd) {
          const yearlyData = calcYearlyRange(returnJd, nextYearJd, srNatalChart.planets, srNatalChart.angles, transitOrb);
          srYearlyText = formatYearlyRangeText(yearlyData);
          document.getElementById("srYearlyText").textContent = srYearlyText;
          yearlyStatus.textContent = "";
        } else {
          yearlyStatus.textContent = "年間概要の計算に失敗しました";
        }
      } catch (e) {
        yearlyStatus.textContent = `年間概要エラー: ${e.message}`;
        console.error(e);
      }
    }, 50);

    document.getElementById("btnSrCopy").disabled = false;
    status.textContent = "計算完了";
  } catch (e) {
    status.textContent = `計算エラー: ${e.message}`;
    console.error(e);
  }
}

// ── リターン表示更新 ──

function renderReturnDisplay(type) {
  if (type === "lr") {
    const chart = lrReturnCharts[lrCurrentIndex];
    const cross = lrCrossAspects[lrCurrentIndex];
    const dt = lrReturnDateTimes[lrCurrentIndex];
    if (!chart) return;

    renderReturnPlanetsTable("#tableLrPlanets", chart);
    renderReturnCrossAspectsTable("#tableLrCrossAspects", cross, "LR");
    renderReturnNatalTable("#tableLrNatal", lrNatalChart);
    renderReturnHousesTable("#tableLrHouses", chart);

    drawDoubleWheel(document.getElementById("lrWheelSvg"), lrNatalChart, chart.planets, cross, { outerColor: "#E67E22" });

    document.getElementById("lrLegend").style.display = "";
    document.getElementById("lrLegendLabel").textContent = `ルナリターン (${dt.dateStr})`;
  } else if (type === "sr") {
    if (!srReturnChart) return;

    renderReturnPlanetsTable("#tableSrPlanets", srReturnChart);
    renderReturnCrossAspectsTable("#tableSrCrossAspects", srCrossAspects, "SR");
    renderReturnNatalTable("#tableSrNatal", srNatalChart);
    renderReturnHousesTable("#tableSrHouses", srReturnChart);

    drawDoubleWheel(document.getElementById("srWheelSvg"), srNatalChart, srReturnChart.planets, srCrossAspects, { outerColor: "#E67E22" });

    document.getElementById("srLegend").style.display = "";
    document.getElementById("srLegendLabel").textContent = `ソーラーリターン (${srReturnDateTime.dateStr})`;
  }
}

function renderReturnPlanetsTable(selector, chart) {
  const tbody = document.querySelector(`${selector} tbody`);
  tbody.innerHTML = "";
  for (const p of chart.planets) {
    const tr = document.createElement("tr");
    const retro = p.retrograde ? ' <span style="color:#e74c3c">R</span>' : "";
    tr.innerHTML = `
      <td><span class="planet-glyph" style="color:${p.color}">${p.glyph}</span> ${p.name}</td>
      <td><span style="color:${p.color}">${SIGNS[p.sign].glyph}</span> ${SIGNS[p.sign].fullName}</td>
      <td>${Math.floor(p.lon % 30)}°${String(Math.floor((p.lon % 1) * 60)).padStart(2, "0")}'${retro}</td>
      <td>${p.house}</td>
      <td>${Math.abs(p.speed).toFixed(3)}°/d</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderReturnCrossAspectsTable(selector, aspects, prefix) {
  const tbody = document.querySelector(`${selector} tbody`);
  tbody.innerHTML = "";
  for (const a of aspects) {
    const tr = document.createElement("tr");
    const typeClass = a.aspect.type === "conjunction" ? "conj"
      : a.aspect.type === "soft" ? "soft"
      : a.aspect.type === "hard" ? "hard" : "minor";
    const orbSign = a.applying ? "+" : "-";
    const appClass = a.applying ? "applying" : "separating";
    const appMark = a.applying ? "▼" : "▲";
    tr.innerHTML = `
      <td><span class="planet-glyph" style="color:${a.planet2.color}">${a.planet2.glyph}</span> ${a.planet2.name}</td>
      <td><span class="asp-badge ${typeClass}">${a.aspect.symbol} ${a.aspect.angle}°</span></td>
      <td><span class="planet-glyph" style="color:${a.planet1.color}">${a.planet1.glyph}</span> ${a.planet1.name}</td>
      <td>${orbSign}${a.aspect.orb.toFixed(2)}°</td>
      <td class="${appClass}">${appMark}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderReturnNatalTable(selector, chart) {
  const tbody = document.querySelector(`${selector} tbody`);
  tbody.innerHTML = "";
  for (const p of chart.planets) {
    const tr = document.createElement("tr");
    const retro = p.retrograde ? ' <span style="color:#e74c3c">R</span>' : "";
    tr.innerHTML = `
      <td><span class="planet-glyph" style="color:${p.color}">${p.glyph}</span> ${p.name}</td>
      <td><span style="color:${p.color}">${SIGNS[p.sign].glyph}</span> ${SIGNS[p.sign].fullName}</td>
      <td>${Math.floor(p.lon % 30)}°${String(Math.floor((p.lon % 1) * 60)).padStart(2, "0")}'${retro}</td>
      <td>${p.house}</td>
      <td>${Math.abs(p.speed).toFixed(3)}°/d</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderReturnHousesTable(selector, chart) {
  const tbody = document.querySelector(`${selector} tbody`);
  tbody.innerHTML = "";
  const labels = ["", "1H (ASC)", "2H", "3H", "4H (IC)", "5H", "6H",
                  "7H (DSC)", "8H", "9H", "10H (MC)", "11H", "12H"];
  for (let i = 1; i <= 12; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${labels[i]}</td>
      <td>${fmt(chart.cusps[i])}</td>
    `;
    tbody.appendChild(tr);
  }
}

// ── リターンコピー ──

function onLrCopyAll() {
  const chart = lrReturnCharts[lrCurrentIndex];
  const cross = lrCrossAspects[lrCurrentIndex];
  const dt = lrReturnDateTimes[lrCurrentIndex];
  if (!chart || !lrNatalChart) return;

  const hsName = HOUSE_SYSTEMS.find(h => h.code === lrNatalParams.houseSystem)?.name || "プラシーダス";
  const text = formatLunarReturnText(lrNatalChart, chart, dt, lrLocationLabel, cross, hsName);
  copyToClipboard(text);
}

function onSrCopyAll() {
  if (!srReturnChart || !srNatalChart) return;

  const hsName = HOUSE_SYSTEMS.find(h => h.code === srNatalParams.houseSystem)?.name || "プラシーダス";
  let text = formatSolarReturnText(srNatalChart, srReturnChart, srReturnDateTime, srLocationLabel, srCrossAspects, hsName);

  // 年間概要があれば付加
  if (srYearlyText) {
    text += "\n\n" + srYearlyText;
  }

  copyToClipboard(text);
}

// ── 起動 ──
init();
