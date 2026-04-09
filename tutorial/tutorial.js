/**
 * はじめての占星術 — tutorial.js
 *
 * ウィザード形式で質問に答えると、ホロスコープの読み解き依頼文を生成する。
 * 保存済みチャート（astro-viewer-charts）との連携対応。
 */

import SwissEPH from "../sweph/sweph-wasm.js";
import {
  loadCharts, loadCities, getChartList, addChart,
  getPrefectures, getCities, findCity,
} from "../shared/data.js";

let swe = null;

// ── 定数 ──

const PLANETS = [
  [0,"太陽"], [1,"月"], [2,"水星"], [3,"金星"], [4,"火星"],
  [5,"木星"], [6,"土星"], [7,"天王星"], [8,"海王星"], [9,"冥王星"],
  [11,"Nノード"],
];
const OUTER_PLANETS = [
  [2,"水星"], [3,"金星"], [4,"火星"],
  [5,"木星"], [6,"土星"], [7,"天王星"], [8,"海王星"], [9,"冥王星"],
];
const TRANSIT_PLANETS = [[5,"木星"], [6,"土星"], [7,"天王星"], [8,"海王星"], [9,"冥王星"]];
const SIGNS = ["牡羊","牡牛","双子","蟹","獅子","乙女","天秤","蠍","射手","山羊","水瓶","魚"];
const ASPECT_SYMBOLS = { 0:"\u260C", 60:"\u26B9", 90:"\u25A1", 120:"\u25B3", 180:"\u260D" };
const ORB = 5;
const TRANSIT_ORB = 1;
const SYNASTRY_ORB = 3;

// ── ユーティリティ ──

function fmt(deg) {
  const s = Math.floor(deg / 30);
  const d = Math.floor(deg % 30);
  const m = Math.floor((deg % 1) * 60);
  return `${SIGNS[s]}座 ${d}\u00B0${String(m).padStart(2,"0")}`;
}

function fmtShort(deg) {
  const s = Math.floor(deg / 30);
  const d = Math.floor(deg % 30);
  return `${SIGNS[s]}${d}\u00B0`;
}

function signOf(deg) { return Math.floor(deg / 30); }

function getAspect(deg1, deg2, orb = ORB) {
  let diff = Math.abs(deg1 - deg2);
  if (diff > 180) diff = 360 - diff;
  for (const [angle, symbol] of Object.entries(ASPECT_SYMBOLS)) {
    const o = Math.abs(diff - Number(angle));
    if (o <= orb) return { symbol, orb: o, angle: Number(angle) };
  }
  return null;
}

function getHouse(lon, cusps) {
  for (let i = 1; i <= 12; i++) {
    const start = cusps[i];
    const end = i === 12 ? cusps[1] : cusps[i + 1];
    const houseSpan = ((end - start) % 360 + 360) % 360;
    const planetDist = ((lon - start) % 360 + 360) % 360;
    if (planetDist < houseSpan) return i;
  }
  return 1;
}

function jdToDate(jd) {
  const r = swe.swe_revjul(jd, 1);
  return `${r.month}/${r.day}`;
}

// ── Step 2 オプション ──

const step2Options = {
  personality: [
    { value: "general", label: "全体的に知りたい" },
    { value: "work", label: "仕事・適職について" },
    { value: "love", label: "恋愛傾向について" },
    { value: "relationship", label: "人間関係の傾向について" },
  ],
  compatibility: [
    { value: "general", label: "全体的な相性" },
    { value: "romance", label: "恋愛相手として" },
    { value: "work", label: "仕事仲間・同僚として" },
    { value: "friend", label: "友人として" },
  ],
  yearly: [
    { value: "general", label: "全体的な運勢" },
    { value: "work", label: "仕事運を中心に" },
    { value: "love", label: "恋愛運を中心に" },
    { value: "caution", label: "注意すべき時期を知りたい" },
  ],
  monthly: [
    { value: "general", label: "全体的なテーマ" },
    { value: "work", label: "仕事面のアドバイス" },
    { value: "private", label: "プライベートのアドバイス" },
  ],
  daily: [
    { value: "general", label: "全体的な運勢" },
    { value: "work", label: "仕事・面接・商談などに良い日か" },
    { value: "love", label: "デート・告白に良い日か" },
    { value: "decision", label: "大きな決断をしても良い日か" },
  ],
};

const questionTexts = {
  personality: {
    general: "私の性格や強み、向いていることを教えてください。",
    work: "私の仕事運や適職について教えてください。どんな働き方が向いていますか？",
    love: "私の恋愛傾向を教えてください。どんな人と相性が良いですか？",
    relationship: "私の人間関係の傾向を教えてください。コミュニケーションの特徴は？",
  },
  compatibility: {
    general: "この2人の相性を教えてください。お互いの長所を活かすコツも教えてください。",
    romance: "この2人の恋愛相性を教えてください。うまく付き合っていくためのアドバイスもお願いします。",
    work: "この2人の仕事上の相性を教えてください。一緒に働くときのコツを教えてください。",
    friend: "この2人の友人としての相性を教えてください。良い関係を続けるコツも教えてください。",
  },
  yearly: {
    general: "私のこの年の運勢を教えてください。全体的な流れとポイントをお願いします。",
    work: "私のこの年の仕事運を中心に教えてください。チャンスの時期や注意点も知りたいです。",
    love: "私のこの年の恋愛運を中心に教えてください。良い時期や気をつける時期を教えてください。",
    caution: "この年、特に注意すべき時期を教えてください。どう乗り越えればいいかも教えてください。",
  },
  monthly: {
    general: "この月のテーマと過ごし方のアドバイスをください。",
    work: "この月の仕事面でのアドバイスをください。",
    private: "この月のプライベートでのアドバイスをください。",
  },
  daily: {
    general: "この日の運勢を教えてください。",
    work: "この日は仕事・面接・商談などに良い日ですか？アドバイスをください。",
    love: "この日はデートや告白に良い日ですか？アドバイスをください。",
    decision: "この日は大きな決断をしても良い日ですか？アドバイスをください。",
  },
};

// ── 状態 ──

let currentCategory = null;
let currentDetail = null;
/** 最後にネイタル計算に使ったデータ（保存用） */
let lastNatalInput = null;

// ── 場所入力モード管理 ──

const locModes = {};

function initLocInput(prefix) {
  locModes[prefix] = "select";
  const toggleBtn = document.getElementById(`${prefix}LocToggle`);
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => toggleLocMode(prefix));
  }
}

function toggleLocMode(prefix) {
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

function getLocData(prefix) {
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

function setLocFromChart(prefix, location) {
  if (!location) return;
  if (locModes[prefix] === "select") toggleLocMode(prefix);
  document.getElementById(`${prefix}Lat`).value = location.lat;
  document.getElementById(`${prefix}Lng`).value = location.lng;
  const tzEl = document.getElementById(`${prefix}Tz`);
  if (tzEl) tzEl.value = location.utcOffset || 9;
}

// ── 保存済みチャートからフォームに流し込む ──

function fillFormFromChart(chart, prefix) {
  const [y, mo, d] = chart.birthDate.split("-").map(Number);
  const [h, mi] = chart.birthTime ? chart.birthTime.split(":").map(Number) : [12, 0];
  const timeUnknown = !chart.birthTime;

  if (prefix === "self") {
    document.getElementById("birthYear").value = y;
    document.getElementById("birthMonth").value = mo;
    document.getElementById("birthDay").value = d;
    document.getElementById("birthHour").value = h;
    document.getElementById("birthMinute").value = mi;
    document.getElementById("timeUnknown").checked = timeUnknown;
    document.getElementById("birthHour").disabled = timeUnknown;
    document.getElementById("birthMinute").disabled = timeUnknown;
    if (chart.location) setLocFromChart("birth", chart.location);
  } else {
    const pre = prefix === "personA" ? "personA" : "personB";
    document.getElementById(`${pre}Year`).value = y;
    document.getElementById(`${pre}Month`).value = mo;
    document.getElementById(`${pre}Day`).value = d;
    document.getElementById(`${pre}Hour`).value = h;
    document.getElementById(`${pre}Minute`).value = mi;
    document.getElementById(`${pre}TimeUnknown`).checked = timeUnknown;
    document.getElementById(`${pre}Hour`).disabled = timeUnknown;
    document.getElementById(`${pre}Minute`).disabled = timeUnknown;
    if (chart.location) setLocFromChart(pre, chart.location);
  }
}

// ── 計算関数群 ──

function parseBirthInput(prefix) {
  let yearEl, monthEl, dayEl, hourEl, minuteEl, timeUnknownEl;
  if (prefix === "self") {
    yearEl = "birthYear"; monthEl = "birthMonth"; dayEl = "birthDay";
    hourEl = "birthHour"; minuteEl = "birthMinute";
    timeUnknownEl = "timeUnknown";
  } else {
    yearEl = `${prefix}Year`; monthEl = `${prefix}Month`; dayEl = `${prefix}Day`;
    hourEl = `${prefix}Hour`; minuteEl = `${prefix}Minute`;
    timeUnknownEl = `${prefix}TimeUnknown`;
  }

  const yv = document.getElementById(yearEl).value;
  const mov = document.getElementById(monthEl).value;
  const dv = document.getElementById(dayEl).value;
  const hv = document.getElementById(hourEl).value;
  const miv = document.getElementById(minuteEl).value;
  const timeUnknown = document.getElementById(timeUnknownEl).checked;

  if (!yv || !mov || !dv) { alert("生年月日を入力してください"); return null; }
  if (!timeUnknown && (hv === "" || miv === "")) { alert("出生時刻を入力してください"); return null; }

  const year = parseInt(yv), month = parseInt(mov), day = parseInt(dv);
  const hour = timeUnknown ? 12 : parseInt(hv);
  const minute = timeUnknown ? 0 : parseInt(miv);

  const locPrefix = prefix === "self" ? "birth" : prefix;
  const loc = getLocData(locPrefix);
  if (!loc) { alert("場所を入力してください"); return null; }

  return { year, month, day, hour, minute, timeUnknown, loc };
}

function calculateNatal() {
  const p = parseBirthInput("self");
  if (!p) return null;

  lastNatalInput = p;

  const utcHour = p.hour - p.loc.utcOffset + p.minute / 60;
  const jd = swe.swe_julday(p.year, p.month, p.day, utcHour, 1);
  const houses = swe.swe_houses(jd, p.loc.lat, p.loc.lng, "P");

  let output = `【ネイタル】${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")} ${String(p.hour).padStart(2,"0")}:${String(p.minute).padStart(2,"0")} ${p.loc.label}\n`;
  output += `ハウス: プラシーダス\n\n`;

  const positions = [];
  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(jd, id, 256);
    const lon = r[0], spd = r[3];
    const house = getHouse(lon, houses.cusps);
    positions.push({ id, name, lon, spd, house });
    output += `${name} ${fmt(lon)} (${house}H)${spd < 0 ? " R" : ""}\n`;
  }

  const asc = houses.ascmc[0];
  const mc = houses.ascmc[1];
  output += `\nASC ${fmt(asc)} / MC ${fmt(mc)}\n\n`;

  const aspects = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const asp = getAspect(positions[i].lon, positions[j].lon);
      if (asp) aspects.push(`${positions[i].name}${asp.symbol}${positions[j].name}(${asp.orb.toFixed(0)}\u00B0)`);
    }
  }
  output += aspects.join(" / ");

  return { output, positions, angles: { asc, mc }, houses, birthMonth: p.month, birthDay: p.day };
}

function calculateSynastry() {
  const a = parseBirthInput("personA");
  if (!a) return null;
  const b = parseBirthInput("personB");
  if (!b) return null;

  const aUtcHour = a.hour - a.loc.utcOffset + a.minute / 60;
  const aJd = swe.swe_julday(a.year, a.month, a.day, aUtcHour, 1);
  const aHouses = swe.swe_houses(aJd, a.loc.lat, a.loc.lng, "P");
  const aPositions = [];
  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(aJd, id, 256);
    aPositions.push({ id, name, lon: r[0], spd: r[3], house: getHouse(r[0], aHouses.cusps) });
  }
  const aAngles = { asc: aHouses.ascmc[0], mc: aHouses.ascmc[1] };

  const bUtcHour = b.hour - b.loc.utcOffset + b.minute / 60;
  const bJd = swe.swe_julday(b.year, b.month, b.day, bUtcHour, 1);
  const bHouses = swe.swe_houses(bJd, b.loc.lat, b.loc.lng, "P");
  const bPositions = [];
  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(bJd, id, 256);
    bPositions.push({ id, name, lon: r[0], spd: r[3], house: getHouse(r[0], bHouses.cusps) });
  }
  const bAngles = { asc: bHouses.ascmc[0], mc: bHouses.ascmc[1] };

  let output = `【シナストリー】\n\n`;
  output += `■ 1人目（${a.year}-${String(a.month).padStart(2,"0")}-${String(a.day).padStart(2,"0")}）\n`;
  output += aPositions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(" / ") + "\n";
  output += `ASC ${fmtShort(aAngles.asc)} / MC ${fmtShort(aAngles.mc)}\n\n`;

  output += `■ 2人目（${b.year}-${String(b.month).padStart(2,"0")}-${String(b.day).padStart(2,"0")}）\n`;
  output += bPositions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(" / ") + "\n";
  output += `ASC ${fmtShort(bAngles.asc)} / MC ${fmtShort(bAngles.mc)}\n\n`;

  output += `■ 相互アスペクト\n`;
  const aspects = [];
  for (const ap of aPositions) {
    for (const bp of bPositions) {
      const asp = getAspect(ap.lon, bp.lon, SYNASTRY_ORB);
      if (asp) aspects.push(`1.${ap.name}${asp.symbol}2.${bp.name}(${asp.orb.toFixed(1)}\u00B0)`);
    }
  }
  for (const ap of aPositions) {
    const aspAsc = getAspect(ap.lon, bAngles.asc, SYNASTRY_ORB);
    if (aspAsc) aspects.push(`1.${ap.name}${aspAsc.symbol}2.ASC(${aspAsc.orb.toFixed(1)}\u00B0)`);
    const aspMc = getAspect(ap.lon, bAngles.mc, SYNASTRY_ORB);
    if (aspMc) aspects.push(`1.${ap.name}${aspMc.symbol}2.MC(${aspMc.orb.toFixed(1)}\u00B0)`);
  }
  for (const bp of bPositions) {
    const aspAsc = getAspect(bp.lon, aAngles.asc, SYNASTRY_ORB);
    if (aspAsc) aspects.push(`2.${bp.name}${aspAsc.symbol}1.ASC(${aspAsc.orb.toFixed(1)}\u00B0)`);
    const aspMc = getAspect(bp.lon, aAngles.mc, SYNASTRY_ORB);
    if (aspMc) aspects.push(`2.${bp.name}${aspMc.symbol}1.MC(${aspMc.orb.toFixed(1)}\u00B0)`);
  }
  output += aspects.length ? aspects.join("\n") : "なし\n";
  return output;
}

function calcYearlyRange(startJd, endJd, natalPositions, natalAngles) {
  let output = "";
  const retrograde = {};
  for (const [id, name] of OUTER_PLANETS) {
    retrograde[id] = { name, periods: [], inRetro: false, start: null };
  }
  const ingresses = [];
  const prevSigns = {};
  const transitAspects = {};
  for (const [tId, tName] of TRANSIT_PLANETS) {
    for (const n of natalPositions) {
      transitAspects[`t.${tName}\u2192n.${n.name}`] = { periods: [], inAspect: false, start: null, symbol: null, house: n.house };
    }
  }
  const angleTransits = {
    ASC: { lon: natalAngles.asc, periods: [], current: {} },
    MC:  { lon: natalAngles.mc,  periods: [], current: {} },
  };
  for (const [, tName] of TRANSIT_PLANETS) {
    angleTransits.ASC.current[tName] = { inAspect: false, start: null, symbol: null };
    angleTransits.MC.current[tName]  = { inAspect: false, start: null, symbol: null };
  }

  for (let jd = startJd; jd <= endJd; jd += 1) {
    for (const [id, name] of OUTER_PLANETS) {
      const r = swe.swe_calc_ut(jd, id, 256);
      const lon = r[0], spd = r[3];
      const sign = signOf(lon);
      const retro = retrograde[id];
      if (spd < 0 && !retro.inRetro) { retro.inRetro = true; retro.start = jd; }
      else if (spd >= 0 && retro.inRetro) { retro.inRetro = false; retro.periods.push([retro.start, jd]); }
      if ([5,6,7,8,9].includes(id)) {
        if (prevSigns[id] !== undefined && prevSigns[id] !== sign) ingresses.push({ jd, name, sign });
        prevSigns[id] = sign;
      }
    }
    for (const [tId, tName] of TRANSIT_PLANETS) {
      const tr = swe.swe_calc_ut(jd, tId, 256);
      const tLon = tr[0];
      for (const n of natalPositions) {
        const key = `t.${tName}\u2192n.${n.name}`;
        const asp = getAspect(tLon, n.lon, TRANSIT_ORB);
        const ta = transitAspects[key];
        if (asp && !ta.inAspect) { ta.inAspect = true; ta.start = jd; ta.symbol = asp.symbol; }
        else if (!asp && ta.inAspect) { ta.inAspect = false; ta.periods.push({ start: ta.start, end: jd, symbol: ta.symbol }); }
      }
      for (const angleName of ["ASC", "MC"]) {
        const angle = angleTransits[angleName];
        const asp = getAspect(tLon, angle.lon, TRANSIT_ORB);
        const cur = angle.current[tName];
        if (asp && !cur.inAspect) { cur.inAspect = true; cur.start = jd; cur.symbol = asp.symbol; }
        else if (!asp && cur.inAspect) { cur.inAspect = false; angle.periods.push({ planet: tName, start: cur.start, end: jd, symbol: cur.symbol }); }
      }
    }
  }
  // 継続中のものを閉じる
  for (const [id] of OUTER_PLANETS) { const r = retrograde[id]; if (r.inRetro) r.periods.push([r.start, endJd]); }
  for (const key of Object.keys(transitAspects)) { const ta = transitAspects[key]; if (ta.inAspect) ta.periods.push({ start: ta.start, end: endJd, symbol: ta.symbol }); }
  for (const angleName of ["ASC", "MC"]) {
    for (const [, tName] of TRANSIT_PLANETS) {
      const cur = angleTransits[angleName].current[tName];
      if (cur.inAspect) angleTransits[angleName].periods.push({ planet: tName, start: cur.start, end: endJd, symbol: cur.symbol });
    }
  }

  output += `■ 逆行期間\n`;
  for (const [id, name] of OUTER_PLANETS) {
    const r = retrograde[id];
    output += r.periods.length === 0
      ? `${name}: なし\n`
      : `${name}: ${r.periods.map(([s, e]) => `${jdToDate(s)}-${jdToDate(e)}`).join(", ")}\n`;
  }

  output += `\n■ 星座イングレス\n`;
  if (ingresses.length === 0) { output += `なし\n`; }
  else { for (const ing of ingresses) output += `${ing.name}: ${jdToDate(ing.jd)} ${SIGNS[ing.sign]}座入り\n`; }

  output += `\n■ ASC/MCへのトランジット\n`;
  let hasAngle = false;
  for (const angleName of ["ASC", "MC"]) {
    for (const p of angleTransits[angleName].periods) {
      hasAngle = true;
      output += `t.${p.planet}${p.symbol}n.${angleName}: ${jdToDate(p.start)}-${jdToDate(p.end)}\n`;
    }
  }
  if (!hasAngle) output += `なし\n`;

  output += `\n■ ネイタル天体へのトランジット\n`;
  let hasTransit = false;
  for (const [, tName] of TRANSIT_PLANETS) {
    for (const n of natalPositions) {
      const ta = transitAspects[`t.${tName}\u2192n.${n.name}`];
      if (ta.periods.length > 0) {
        hasTransit = true;
        output += `t.${tName}\u2192n.${n.name}(${ta.house}H): ${ta.periods.map(p => `${p.symbol}${jdToDate(p.start)}-${jdToDate(p.end)}`).join(", ")}\n`;
      }
    }
  }
  if (!hasTransit) output += `なし\n`;
  return output;
}

function calculateYearly(natalData) {
  const year = parseInt(document.getElementById("targetYear").value);
  let output = `【${year}年 天体運行概要】\n\n`;
  const startJd = swe.swe_julday(year, 1, 1, 0, 1);
  const endJd = swe.swe_julday(year, 12, 31, 0, 1);
  output += calcYearlyRange(startJd, endJd, natalData.positions, natalData.angles);
  return output;
}

function calculateTransit(natalData) {
  const year = parseInt(document.getElementById("targetDayYear").value);
  const month = parseInt(document.getElementById("targetDayMonth").value);
  const day = parseInt(document.getElementById("targetDayDay").value);
  const jd = swe.swe_julday(year, month, day, 12 - 9, 1);

  let output = `【トランジット】${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}\n\n`;
  output += `■ トランジット天体\n`;
  const transitPos = [];
  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(jd, id, 256);
    transitPos.push({ id, name, lon: r[0], spd: r[3] });
    output += `${name} ${fmt(r[0])}${r[3] < 0 ? " R" : ""}\n`;
  }

  output += `\n■ ネイタルへのアスペクト\n`;
  const aspects = [];
  for (const t of transitPos) {
    for (const n of natalData.positions) {
      const asp = getAspect(t.lon, n.lon, TRANSIT_ORB);
      if (asp) aspects.push(`t.${t.name}${asp.symbol}n.${n.name}(${n.house}H)`);
    }
    const aspAsc = getAspect(t.lon, natalData.angles.asc, TRANSIT_ORB);
    if (aspAsc) aspects.push(`t.${t.name}${aspAsc.symbol}n.ASC`);
    const aspMc = getAspect(t.lon, natalData.angles.mc, TRANSIT_ORB);
    if (aspMc) aspects.push(`t.${t.name}${aspMc.symbol}n.MC`);
  }
  output += aspects.length === 0 ? `なし\n` : aspects.join(" / ");
  return output;
}

function calculateLunarReturn(natalData) {
  const year = parseInt(document.getElementById("targetMonthYear").value);
  const month = parseInt(document.getElementById("targetMonth").value);
  const loc = getLocData("current");
  if (!loc) return "場所を入力してください";
  const natalMoon = natalData.positions.find(p => p.name === "月").lon;

  let jd = swe.swe_julday(year, month, 1, 0, 1);
  const endJd = swe.swe_julday(year, month + 1, 1, 0, 1);
  const returns = [];
  let prevDiff = null;

  for (; jd < endJd; jd += 0.25) {
    const r = swe.swe_calc_ut(jd, 1, 256);
    let diff = r[0] - natalMoon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (prevDiff !== null && prevDiff < 0 && diff >= 0) {
      let lo = jd - 0.25, hi = jd;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        const rm = swe.swe_calc_ut(mid, 1, 256);
        let d = rm[0] - natalMoon;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        if (d < 0) lo = mid; else hi = mid;
      }
      returns.push((lo + hi) / 2);
    }
    prevDiff = diff;
  }

  if (returns.length === 0) return `${year}年${month}月のルナリターンが見つかりませんでした`;

  let output = "";
  for (let i = 0; i < returns.length; i++) {
    const returnJd = returns[i];
    const jstJd = returnJd + 9 / 24;
    const dt = swe.swe_revjul(jstJd, 1);
    const h = Math.floor(dt.hour);
    const m = Math.floor((dt.hour - h) * 60);

    output += returns.length > 1 ? `【ルナリターン ${i + 1}】` : `【ルナリターン】`;
    output += `${dt.year}-${String(dt.month).padStart(2,"0")}-${String(dt.day).padStart(2,"0")} ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")} JST\n`;
    output += `場所: ${loc.label}\n`;
    output += `ネイタル月: ${fmt(natalMoon)}\n`;
    output += `ハウス: プラシーダス\n\n`;

    const houses = swe.swe_houses(returnJd, loc.lat, loc.lng, "P");
    output += `■ 天体\n`;
    for (const [id, name] of PLANETS) {
      const r = swe.swe_calc_ut(returnJd, id, 256);
      const lon = r[0], spd = r[3];
      const house = getHouse(lon, houses.cusps);
      output += `${name} ${fmt(lon)} (${house}H)${spd < 0 ? " R" : ""}\n`;
    }
    output += `\nASC ${fmt(houses.ascmc[0])} / MC ${fmt(houses.ascmc[1])}\n`;

    output += `\n■ ネイタルへのアスペクト\n`;
    const aspects = [];
    for (const [id, name] of PLANETS) {
      const r = swe.swe_calc_ut(returnJd, id, 256);
      for (const n of natalData.positions) {
        const asp = getAspect(r[0], n.lon, TRANSIT_ORB);
        if (asp) aspects.push(`LR.${name}${asp.symbol}n.${n.name}(${n.house}H)`);
      }
      const aspAsc = getAspect(r[0], natalData.angles.asc, TRANSIT_ORB);
      if (aspAsc) aspects.push(`LR.${name}${aspAsc.symbol}n.ASC`);
      const aspMc = getAspect(r[0], natalData.angles.mc, TRANSIT_ORB);
      if (aspMc) aspects.push(`LR.${name}${aspMc.symbol}n.MC`);
    }
    output += aspects.length === 0 ? `なし\n` : aspects.join(" / ");
    if (i < returns.length - 1) output += `\n\n${"─".repeat(30)}\n\n`;
  }
  return output;
}

// ── UI ──

function goToStep(n) {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  document.getElementById(`step${n}`).classList.add("active");
}

function renderStep2Options() {
  const container = document.getElementById("step2Options");
  container.innerHTML = "";
  for (const opt of step2Options[currentCategory]) {
    const label = document.createElement("label");
    label.innerHTML = `<input type="radio" name="detail" value="${opt.value}"><span>${opt.label}</span>`;
    container.appendChild(label);
  }
  container.querySelectorAll('input[name="detail"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      currentDetail = e.target.value;
      document.getElementById("toStep3").disabled = false;
    });
  });
}

function showRelevantForms() {
  document.getElementById("selfForm").style.display = "none";
  document.getElementById("compatibilityForm").style.display = "none";
  document.getElementById("yearForm").style.display = "none";
  document.getElementById("monthForm").style.display = "none";
  document.getElementById("dayForm").style.display = "none";

  if (currentCategory === "compatibility") {
    document.getElementById("compatibilityForm").style.display = "block";
  } else {
    document.getElementById("selfForm").style.display = "block";
    if (currentCategory === "yearly") document.getElementById("yearForm").style.display = "block";
    else if (currentCategory === "monthly") document.getElementById("monthForm").style.display = "block";
    else if (currentCategory === "daily") document.getElementById("dayForm").style.display = "block";
  }
}

function initPrefSelect(prefId, cityId) {
  const prefSelect = document.getElementById(prefId);
  const citySelect = document.getElementById(cityId);
  for (const pref of getPrefectures()) {
    const opt = document.createElement("option");
    opt.value = pref;
    opt.textContent = pref;
    prefSelect.appendChild(opt);
  }
  prefSelect.addEventListener("change", () => {
    citySelect.innerHTML = "";
    for (const city of getCities(prefSelect.value)) {
      const opt = document.createElement("option");
      opt.value = city.name;
      opt.textContent = city.name;
      citySelect.appendChild(opt);
    }
  });
  prefSelect.dispatchEvent(new Event("change"));
}

function refreshChartSelects() {
  const charts = getChartList();
  for (const selId of ["selfChartSelect", "personAChartSelect", "personBChartSelect"]) {
    const sel = document.getElementById(selId);
    const current = sel.value;
    sel.innerHTML = '<option value="">-- 手動で入力する --</option>';
    for (const c of charts) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name || `${c.birthDate} ${c.birthTime || ""}`;
      sel.appendChild(opt);
    }
    sel.value = current;
  }
}

// ── テーマ ──

function initTheme() {
  // viewer の設定からテーマを読む（localStorage 共有）
  try {
    const raw = localStorage.getItem("astro-viewer-charts");
    if (raw) {
      const data = JSON.parse(raw);
      if (data.settings?.theme === "light") document.documentElement.setAttribute("data-theme", "light");
    }
  } catch { /* ignore */ }
}

function toggleTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  if (isLight) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
  }
  // 設定にも反映
  try {
    const raw = localStorage.getItem("astro-viewer-charts");
    if (raw) {
      const data = JSON.parse(raw);
      data.settings.theme = isLight ? "dark" : "light";
      localStorage.setItem("astro-viewer-charts", JSON.stringify(data));
    }
  } catch { /* ignore */ }
}

// ── 初期化 ──

async function init() {
  initTheme();

  // データ読み込み
  await Promise.all([loadCharts(), loadCities("../shared/cities.json")]);

  // 場所入力初期化（都道府県セレクト + 緯度経度トグル）
  initPrefSelect("birthPref", "birthCity");
  initPrefSelect("personAPref", "personACity");
  initPrefSelect("personBPref", "personBCity");
  initPrefSelect("currentPref", "currentCity");
  initLocInput("birth");
  initLocInput("personA");
  initLocInput("personB");
  initLocInput("current");

  // 保存済みチャートセレクト
  refreshChartSelects();

  // チャート選択時のフォーム自動入力
  document.getElementById("selfChartSelect").addEventListener("change", (e) => {
    const charts = getChartList();
    const chart = charts.find(c => c.id === e.target.value);
    if (chart) fillFormFromChart(chart, "self");
  });
  document.getElementById("personAChartSelect").addEventListener("change", (e) => {
    const charts = getChartList();
    const chart = charts.find(c => c.id === e.target.value);
    if (chart) fillFormFromChart(chart, "personA");
  });
  document.getElementById("personBChartSelect").addEventListener("change", (e) => {
    const charts = getChartList();
    const chart = charts.find(c => c.id === e.target.value);
    if (chart) fillFormFromChart(chart, "personB");
  });

  // デフォルト日付
  const now = new Date();
  document.getElementById("targetYear").value = now.getFullYear();
  document.getElementById("targetMonthYear").value = now.getFullYear();
  document.getElementById("targetMonth").value = now.getMonth() + 1;
  document.getElementById("targetDayYear").value = now.getFullYear();
  document.getElementById("targetDayMonth").value = now.getMonth() + 1;
  document.getElementById("targetDayDay").value = now.getDate();

  // Step 1
  document.querySelectorAll('input[name="category"]').forEach(radio => {
    radio.addEventListener("change", (e) => {
      currentCategory = e.target.value;
      document.getElementById("toStep2").disabled = false;
    });
  });

  // ナビゲーション
  document.getElementById("toStep2").addEventListener("click", () => {
    renderStep2Options();
    currentDetail = null;
    document.getElementById("toStep3").disabled = true;
    goToStep(2);
  });
  document.getElementById("backTo1").addEventListener("click", () => goToStep(1));
  document.getElementById("toStep3").addEventListener("click", () => { showRelevantForms(); goToStep(3); });
  document.getElementById("backTo2").addEventListener("click", () => goToStep(2));
  document.getElementById("backTo3").addEventListener("click", () => goToStep(3));
  document.getElementById("restart").addEventListener("click", () => {
    currentCategory = null;
    currentDetail = null;
    lastNatalInput = null;
    document.querySelectorAll('input[name="category"]').forEach(r => r.checked = false);
    document.getElementById("toStep2").disabled = true;
    document.getElementById("saveResult").style.display = "none";
    goToStep(1);
  });

  // 時刻不明チェック
  document.getElementById("timeUnknown").addEventListener("change", (e) => {
    document.getElementById("birthHour").disabled = e.target.checked;
    document.getElementById("birthMinute").disabled = e.target.checked;
  });
  document.getElementById("personATimeUnknown").addEventListener("change", (e) => {
    document.getElementById("personAHour").disabled = e.target.checked;
    document.getElementById("personAMinute").disabled = e.target.checked;
  });
  document.getElementById("personBTimeUnknown").addEventListener("change", (e) => {
    document.getElementById("personBHour").disabled = e.target.checked;
    document.getElementById("personBMinute").disabled = e.target.checked;
  });

  // テーマ切替
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  // 計算実行
  document.getElementById("calculate").addEventListener("click", () => {
    if (!swe) return;

    let output = questionTexts[currentCategory][currentDetail] + "\n\n";

    if (currentCategory === "compatibility") {
      const result = calculateSynastry();
      if (!result) return;
      output += result;
    } else {
      const natalData = calculateNatal();
      if (!natalData) return;
      output += natalData.output;

      if (currentCategory === "yearly") output += "\n\n" + calculateYearly(natalData);
      else if (currentCategory === "monthly") output += "\n\n" + calculateLunarReturn(natalData);
      else if (currentCategory === "daily") output += "\n\n" + calculateTransit(natalData);
    }

    document.getElementById("resultText").value = output;

    // 保存ボタン表示（手動入力時のみ、相性以外）
    const saveSection = document.getElementById("saveResult");
    if (currentCategory !== "compatibility" && lastNatalInput && !document.getElementById("selfChartSelect").value) {
      saveSection.style.display = "block";
    } else {
      saveSection.style.display = "none";
    }

    goToStep(4);
  });

  // コピー
  document.getElementById("copyResult").addEventListener("click", () => {
    const textarea = document.getElementById("resultText");
    const button = document.getElementById("copyResult");
    textarea.select();
    navigator.clipboard.writeText(textarea.value).catch(() => document.execCommand("copy"));
    const orig = button.textContent;
    button.textContent = "コピーしました";
    setTimeout(() => { button.textContent = orig; }, 1500);
  });

  // チャート保存
  document.getElementById("saveChart").addEventListener("click", async () => {
    if (!lastNatalInput) return;
    const p = lastNatalInput;
    const name = document.getElementById("saveName").value || "";
    await addChart({
      name,
      birthDate: `${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}`,
      birthTime: p.timeUnknown ? "" : `${String(p.hour).padStart(2,"0")}:${String(p.minute).padStart(2,"0")}`,
      location: {
        label: p.loc.label,
        lat: p.loc.lat,
        lng: p.loc.lng,
        timezone: p.loc.utcOffset === 9 ? "Asia/Tokyo" : `UTC${p.loc.utcOffset >= 0 ? "+" : ""}${p.loc.utcOffset}`,
        utcOffset: p.loc.utcOffset,
      },
    });
    refreshChartSelects();
    document.getElementById("saveChart").textContent = "保存しました";
    setTimeout(() => { document.getElementById("saveChart").textContent = "保存"; }, 1500);
  });

  // WASM初期化
  document.getElementById("status").textContent = "初期化中...";
  swe = await SwissEPH.init();
  await swe.swe_set_ephe_path();
  document.getElementById("status").textContent = "";
}

init();
