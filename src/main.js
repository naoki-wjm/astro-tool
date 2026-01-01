import SwissEPH from "sweph-wasm";
import cities from "./cities.json";

let swe = null;
let natalPositions = null;
let natalAngles = null;
let natalHouses = null;
let natalCity = null;

const PLANETS = [
  [0,'太陽'], [1,'月'], [2,'水星'], [3,'金星'], [4,'火星'],
  [5,'木星'], [6,'土星'], [7,'天王星'], [8,'海王星'], [9,'冥王星'],
  [11,'Nノード']
];
const OUTER_PLANETS = [
  [2,'水星'], [3,'金星'], [4,'火星'],
  [5,'木星'], [6,'土星'], [7,'天王星'], [8,'海王星'], [9,'冥王星']
];
const TRANSIT_PLANETS = [[5,'木星'], [6,'土星'], [7,'天王星'], [8,'海王星'], [9,'冥王星']];
const SIGNS = ['牡羊','牡牛','双子','蟹','獅子','乙女','天秤','蠍','射手','山羊','水瓶','魚'];
const ASPECT_SYMBOLS = { 0:'☌', 60:'⚹', 90:'□', 120:'△', 180:'☍' };
const ORB = 5;
const TRANSIT_ORB = 1;
const SYNASTRY_ORB = 3;

function fmt(deg) {
  const s = Math.floor(deg / 30);
  const d = Math.floor(deg % 30);
  const m = Math.floor((deg % 1) * 60);
  return `${SIGNS[s]}座 ${d}°${String(m).padStart(2,'0')}`;
}

function fmtShort(deg) {
  const s = Math.floor(deg / 30);
  const d = Math.floor(deg % 30);
  return `${SIGNS[s]}${d}°`;
}

function signOf(deg) {
  return Math.floor(deg / 30);
}

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
    const end = i === 12 ? cusps[1] + 360 : cusps[i + 1];
    let l = lon;
    if (i === 12 && lon < cusps[1]) l += 360;
    if (l >= start && l < end) return i;
  }
  return 1;
}

function jdToDate(jd) {
  const r = swe.swe_revjul(jd, 1);
  return `${r.month}/${r.day}`;
}

function jdToDateTime(jd) {
  const r = swe.swe_revjul(jd, 1);
  const h = Math.floor(r.hour);
  const m = Math.floor((r.hour - h) * 60);
  return `${r.month}/${r.day} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function calculate() {
  if (!swe) return;

  // 入力チェック
  const yearVal = document.getElementById('year').value;
  const monthVal = document.getElementById('month').value;
  const dayVal = document.getElementById('day').value;
  const hourVal = document.getElementById('hour').value;
  const minuteVal = document.getElementById('minute').value;

  if (!yearVal || !monthVal || !dayVal) {
    alert('生年月日を入力してください');
    return;
  }
  if (hourVal === '' || minuteVal === '') {
    alert('出生時刻を入力してください');
    return;
  }

  // 数値変換
  const year = parseInt(yearVal);
  const month = parseInt(monthVal);
  const day = parseInt(dayVal);
  const hour = parseInt(hourVal);
  const minute = parseInt(minuteVal);

  const pref = document.getElementById('pref').value;
  const cityName = document.getElementById('city').value;

  const city = cities[pref].find(c => c.name === cityName);
  if (!city) return;

  const utcHour = hour - 9 + minute / 60;
  const jd = swe.swe_julday(year, month, day, utcHour, 1);

  const positions = [];
  let output = `【ネイタル】${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} ${pref}${cityName}\nハウス: プラシーダス\n\n`;

  const houses = swe.swe_houses(jd, city.lat, city.lng, 'P');

  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(jd, id, 256);
    const lon = r[0], spd = r[3];
    const house = getHouse(lon, houses.cusps);
    positions.push({ id, name, lon, spd, house });
    output += `${name} ${fmt(lon)} (${house}H)${spd < 0 ? ' R' : ''}\n`;
  }

  const asc = houses.ascmc[0];
  const mc = houses.ascmc[1];
  output += `\nASC ${fmt(asc)} / MC ${fmt(mc)}\n\n`;

  const aspects = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const asp = getAspect(positions[i].lon, positions[j].lon);
      if (asp) {
        aspects.push(`${positions[i].name}${asp.symbol}${positions[j].name}(${asp.orb.toFixed(0)}°)`);
      }
    }
  }
  output += aspects.join(' / ');

  document.getElementById('result').value = output;

  natalPositions = positions;
  natalAngles = { asc, mc };
  natalHouses = houses;
  natalCity = city;
  
  document.getElementById('calcYearly').disabled = false;
  document.getElementById('copyYearly').disabled = false;
  document.getElementById('calcTransit').disabled = false;
  document.getElementById('copyTransit').disabled = false;
  document.getElementById('calcLunar').disabled = false;
  document.getElementById('copyLunar').disabled = false;
  document.getElementById('calcSolarChart').disabled = false;
  document.getElementById('calcSolarYear').disabled = false;
  document.getElementById('copySolar').disabled = false;
}

function calculateYearly() {
  if (!swe || !natalPositions || !natalAngles) return;

  const year = parseInt(document.getElementById('transitYear').value);
  let output = `【${year}年 天体運行概要】\n\n`;

  output += `■ ネイタル（参照用）\n`;
  const natalSummary = natalPositions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(' / ');
  output += `${natalSummary}\n`;
  output += `ASC ${fmtShort(natalAngles.asc)} / MC ${fmtShort(natalAngles.mc)}\n\n`;

  const startJd = swe.swe_julday(year, 1, 1, 0, 1);
  const endJd = swe.swe_julday(year, 12, 31, 0, 1);

  const result = calcYearlyRange(startJd, endJd);
  output += result;

  document.getElementById('yearlyResult').value = output;
}

function calcYearlyRange(startJd, endJd) {
  let output = '';

  const retrograde = {};
  for (const [id, name] of OUTER_PLANETS) {
    retrograde[id] = { name, periods: [], inRetro: false, start: null };
  }

  const ingresses = [];
  const prevSigns = {};

  const transitAspects = {};
  for (const [tId, tName] of TRANSIT_PLANETS) {
    for (const n of natalPositions) {
      const key = `t.${tName}→n.${n.name}`;
      transitAspects[key] = { periods: [], inAspect: false, start: null, symbol: null, house: n.house };
    }
  }

  const angleTransits = {
    'ASC': { lon: natalAngles.asc, periods: [], current: {} },
    'MC': { lon: natalAngles.mc, periods: [], current: {} }
  };
  for (const [tId, tName] of TRANSIT_PLANETS) {
    angleTransits['ASC'].current[tName] = { inAspect: false, start: null, symbol: null };
    angleTransits['MC'].current[tName] = { inAspect: false, start: null, symbol: null };
  }

  for (let jd = startJd; jd <= endJd; jd += 1) {
    for (const [id, name] of OUTER_PLANETS) {
      const r = swe.swe_calc_ut(jd, id, 256);
      const lon = r[0], spd = r[3];
      const sign = signOf(lon);

      const retro = retrograde[id];
      if (spd < 0 && !retro.inRetro) {
        retro.inRetro = true;
        retro.start = jd;
      } else if (spd >= 0 && retro.inRetro) {
        retro.inRetro = false;
        retro.periods.push([retro.start, jd]);
      }

      if ([5,6,7,8,9].includes(id)) {
        if (prevSigns[id] !== undefined && prevSigns[id] !== sign) {
          ingresses.push({ jd, name, sign });
        }
        prevSigns[id] = sign;
      }
    }

    for (const [tId, tName] of TRANSIT_PLANETS) {
      const tr = swe.swe_calc_ut(jd, tId, 256);
      const tLon = tr[0];

      for (const n of natalPositions) {
        const key = `t.${tName}→n.${n.name}`;
        const asp = getAspect(tLon, n.lon, TRANSIT_ORB);
        const ta = transitAspects[key];

        if (asp && !ta.inAspect) {
          ta.inAspect = true;
          ta.start = jd;
          ta.symbol = asp.symbol;
        } else if (!asp && ta.inAspect) {
          ta.inAspect = false;
          ta.periods.push({ start: ta.start, end: jd, symbol: ta.symbol });
        }
      }

      for (const angleName of ['ASC', 'MC']) {
        const angle = angleTransits[angleName];
        const asp = getAspect(tLon, angle.lon, TRANSIT_ORB);
        const cur = angle.current[tName];

        if (asp && !cur.inAspect) {
          cur.inAspect = true;
          cur.start = jd;
          cur.symbol = asp.symbol;
        } else if (!asp && cur.inAspect) {
          cur.inAspect = false;
          angle.periods.push({ planet: tName, start: cur.start, end: jd, symbol: cur.symbol });
        }
      }
    }
  }

  for (const [id, name] of OUTER_PLANETS) {
    const retro = retrograde[id];
    if (retro.inRetro) retro.periods.push([retro.start, endJd]);
  }
  for (const key of Object.keys(transitAspects)) {
    const ta = transitAspects[key];
    if (ta.inAspect) ta.periods.push({ start: ta.start, end: endJd, symbol: ta.symbol });
  }
  for (const angleName of ['ASC', 'MC']) {
    for (const [tId, tName] of TRANSIT_PLANETS) {
      const cur = angleTransits[angleName].current[tName];
      if (cur.inAspect) {
        angleTransits[angleName].periods.push({ planet: tName, start: cur.start, end: endJd, symbol: cur.symbol });
      }
    }
  }

  output += `■ 逆行期間\n`;
  for (const [id, name] of OUTER_PLANETS) {
    const retro = retrograde[id];
    if (retro.periods.length === 0) {
      output += `${name}: なし\n`;
    } else {
      const ps = retro.periods.map(([s, e]) => `${jdToDate(s)}-${jdToDate(e)}`).join(', ');
      output += `${name}: ${ps}\n`;
    }
  }

  output += `\n■ 星座イングレス\n`;
  if (ingresses.length === 0) {
    output += `なし\n`;
  } else {
    for (const ing of ingresses) {
      output += `${ing.name}: ${jdToDate(ing.jd)} ${SIGNS[ing.sign]}座入り\n`;
    }
  }

  output += `\n■ ASC/MCへのトランジット\n`;
  let hasAngleTransit = false;
  for (const angleName of ['ASC', 'MC']) {
    const angle = angleTransits[angleName];
    if (angle.periods.length > 0) {
      hasAngleTransit = true;
      for (const p of angle.periods) {
        output += `t.${p.planet}${p.symbol}n.${angleName}: ${jdToDate(p.start)}-${jdToDate(p.end)}\n`;
      }
    }
  }
  if (!hasAngleTransit) output += `なし\n`;

  output += `\n■ ネイタル天体へのトランジット\n`;
  let hasTransit = false;
  for (const [tId, tName] of TRANSIT_PLANETS) {
    for (const n of natalPositions) {
      const key = `t.${tName}→n.${n.name}`;
      const ta = transitAspects[key];
      if (ta.periods.length > 0) {
        hasTransit = true;
        const ps = ta.periods.map(p => `${p.symbol}${jdToDate(p.start)}-${jdToDate(p.end)}`).join(', ');
        output += `t.${tName}→n.${n.name}(${ta.house}H): ${ps}\n`;
      }
    }
  }
  if (!hasTransit) output += `なし\n`;

  return output;
}

function calculateTransit() {
  if (!swe || !natalPositions || !natalAngles) return;

  const year = parseInt(document.getElementById('trYear').value);
  const month = parseInt(document.getElementById('trMonth').value);
  const day = parseInt(document.getElementById('trDay').value);

  const jd = swe.swe_julday(year, month, day, 12 - 9, 1);

  let output = `【トランジット】${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}\n\n`;

  output += `■ ネイタル（参照用）\n`;
  const natalSummary = natalPositions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(' / ');
  output += `${natalSummary}\n`;
  output += `ASC ${fmtShort(natalAngles.asc)} / MC ${fmtShort(natalAngles.mc)}\n\n`;

  output += `■ トランジット天体\n`;
  const transitPos = [];
  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(jd, id, 256);
    const lon = r[0], spd = r[3];
    transitPos.push({ id, name, lon, spd });
    output += `${name} ${fmt(lon)}${spd < 0 ? ' R' : ''}\n`;
  }

  output += `\n■ ネイタルへのアスペクト\n`;
  const aspects = [];
  for (const t of transitPos) {
    for (const n of natalPositions) {
      const asp = getAspect(t.lon, n.lon, TRANSIT_ORB);
      if (asp) {
        aspects.push(`t.${t.name}${asp.symbol}n.${n.name}(${n.house}H)`);
      }
    }
    const aspAsc = getAspect(t.lon, natalAngles.asc, TRANSIT_ORB);
    if (aspAsc) aspects.push(`t.${t.name}${aspAsc.symbol}n.ASC`);
    const aspMc = getAspect(t.lon, natalAngles.mc, TRANSIT_ORB);
    if (aspMc) aspects.push(`t.${t.name}${aspMc.symbol}n.MC`);
  }

  if (aspects.length === 0) {
    output += `なし\n`;
  } else {
    output += aspects.join(' / ');
  }

  document.getElementById('transitResult').value = output;
}

function calculateLunarReturn() {
  if (!swe || !natalPositions) return;

  const year = parseInt(document.getElementById('lrYear').value);
  const month = parseInt(document.getElementById('lrMonth').value);
  const pref = document.getElementById('lrPref').value;
  const cityName = document.getElementById('lrCity').value;

  const city = cities[pref].find(c => c.name === cityName);
  if (!city) return;

  const natalMoon = natalPositions.find(p => p.name === '月').lon;

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
        if (d < 0) lo = mid;
        else hi = mid;
      }
      returns.push((lo + hi) / 2);
    }
    prevDiff = diff;
  }

  if (returns.length === 0) {
    document.getElementById('lunarResult').value = `${year}年${month}月のルナリターンが見つかりませんでした`;
    return;
  }

  let output = '';

  for (let i = 0; i < returns.length; i++) {
    const returnJd = returns[i];
    const jstJd = returnJd + 9 / 24;
    const dt = swe.swe_revjul(jstJd, 1);
    const h = Math.floor(dt.hour);
    const m = Math.floor((dt.hour - h) * 60);

    if (returns.length > 1) {
      output += `【ルナリターン ${i + 1}】`;
    } else {
      output += `【ルナリターン】`;
    }
    output += `${dt.year}-${String(dt.month).padStart(2,'0')}-${String(dt.day).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} JST\n`;
    output += `場所: ${pref}${cityName}\n`;
    output += `ネイタル月: ${fmt(natalMoon)}\n`;
    output += `ハウス: プラシーダス\n\n`;

    const houses = swe.swe_houses(returnJd, city.lat, city.lng, 'P');

    output += `■ 天体\n`;
    for (const [id, name] of PLANETS) {
      const r = swe.swe_calc_ut(returnJd, id, 256);
      const lon = r[0], spd = r[3];
      const house = getHouse(lon, houses.cusps);
      output += `${name} ${fmt(lon)} (${house}H)${spd < 0 ? ' R' : ''}\n`;
    }

    output += `\nASC ${fmt(houses.ascmc[0])} / MC ${fmt(houses.ascmc[1])}\n`;

    output += `\n■ ネイタルへのアスペクト\n`;
    const aspects = [];
    for (const [id, name] of PLANETS) {
      const r = swe.swe_calc_ut(returnJd, id, 256);
      const lon = r[0];
      
      for (const n of natalPositions) {
        const asp = getAspect(lon, n.lon, TRANSIT_ORB);
        if (asp) {
          aspects.push(`LR.${name}${asp.symbol}n.${n.name}(${n.house}H)`);
        }
      }
      const aspAsc = getAspect(lon, natalAngles.asc, TRANSIT_ORB);
      if (aspAsc) aspects.push(`LR.${name}${aspAsc.symbol}n.ASC`);
      const aspMc = getAspect(lon, natalAngles.mc, TRANSIT_ORB);
      if (aspMc) aspects.push(`LR.${name}${aspMc.symbol}n.MC`);
    }

    if (aspects.length === 0) {
      output += `なし\n`;
    } else {
      output += aspects.join(' / ');
    }

    if (i < returns.length - 1) {
      output += `\n\n${'─'.repeat(30)}\n\n`;
    }
  }

  document.getElementById('lunarResult').value = output;
}

function findSolarReturn(year) {
  const natalSun = natalPositions.find(p => p.name === '太陽').lon;
  
  // 誕生日付近から探索開始
  const natalMonth = parseInt(document.getElementById('month').value);
  const natalDay = parseInt(document.getElementById('day').value);
  
  let jd = swe.swe_julday(year, natalMonth, natalDay - 2, 0, 1);
  const endJd = jd + 5; // 5日間の範囲で探索

  let prevDiff = null;
  for (; jd < endJd; jd += 0.25) {
    const r = swe.swe_calc_ut(jd, 0, 256); // 太陽
    let diff = r[0] - natalSun;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (prevDiff !== null && prevDiff < 0 && diff >= 0) {
      let lo = jd - 0.25, hi = jd;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        const rm = swe.swe_calc_ut(mid, 0, 256);
        let d = rm[0] - natalSun;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        if (d < 0) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }
    prevDiff = diff;
  }
  return null;
}

function calculateSolarChart() {
  if (!swe || !natalPositions) return;

  const year = parseInt(document.getElementById('srYear').value);
  const pref = document.getElementById('srPref').value;
  const cityName = document.getElementById('srCity').value;

  const city = cities[pref].find(c => c.name === cityName);
  if (!city) return;

  const returnJd = findSolarReturn(year);
  if (!returnJd) {
    document.getElementById('solarResult').value = `${year}年のソーラーリターンが見つかりませんでした`;
    return;
  }

  const natalSun = natalPositions.find(p => p.name === '太陽').lon;
  const jstJd = returnJd + 9 / 24;
  const dt = swe.swe_revjul(jstJd, 1);
  const h = Math.floor(dt.hour);
  const m = Math.floor((dt.hour - h) * 60);

  let output = `【ソーラーリターン】${dt.year}-${String(dt.month).padStart(2,'0')}-${String(dt.day).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} JST\n`;
  output += `場所: ${pref}${cityName}\n`;
  output += `ネイタル太陽: ${fmt(natalSun)}\n`;
  output += `ハウス: プラシーダス\n\n`;

  const houses = swe.swe_houses(returnJd, city.lat, city.lng, 'P');

  output += `■ 天体\n`;
  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(returnJd, id, 256);
    const lon = r[0], spd = r[3];
    const house = getHouse(lon, houses.cusps);
    output += `${name} ${fmt(lon)} (${house}H)${spd < 0 ? ' R' : ''}\n`;
  }

  output += `\nASC ${fmt(houses.ascmc[0])} / MC ${fmt(houses.ascmc[1])}\n`;

  output += `\n■ ネイタルへのアスペクト\n`;
  const aspects = [];
  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(returnJd, id, 256);
    const lon = r[0];
    
    for (const n of natalPositions) {
      const asp = getAspect(lon, n.lon, TRANSIT_ORB);
      if (asp) {
        aspects.push(`SR.${name}${asp.symbol}n.${n.name}(${n.house}H)`);
      }
    }
    const aspAsc = getAspect(lon, natalAngles.asc, TRANSIT_ORB);
    if (aspAsc) aspects.push(`SR.${name}${aspAsc.symbol}n.ASC`);
    const aspMc = getAspect(lon, natalAngles.mc, TRANSIT_ORB);
    if (aspMc) aspects.push(`SR.${name}${aspMc.symbol}n.MC`);
  }

  if (aspects.length === 0) {
    output += `なし\n`;
  } else {
    output += aspects.join(' / ');
  }

  document.getElementById('solarResult').value = output;
}

function calculateSolarYear() {
  if (!swe || !natalPositions || !natalAngles) return;

  const year = parseInt(document.getElementById('srYear').value);

  const startJd = findSolarReturn(year);
  const endJd = findSolarReturn(year + 1);

  if (!startJd || !endJd) {
    document.getElementById('solarResult').value = `ソーラーリターンの計算に失敗しました`;
    return;
  }

  const startDt = swe.swe_revjul(startJd + 9/24, 1);
  const endDt = swe.swe_revjul(endJd + 9/24, 1);

  let output = `【ソーラーリターン年 天体運行概要】\n`;
  output += `${startDt.year}/${startDt.month}/${startDt.day} 〜 ${endDt.year}/${endDt.month}/${endDt.day}\n\n`;

  output += `■ ネイタル（参照用）\n`;
  const natalSummary = natalPositions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(' / ');
  output += `${natalSummary}\n`;
  output += `ASC ${fmtShort(natalAngles.asc)} / MC ${fmtShort(natalAngles.mc)}\n\n`;

  output += calcYearlyRange(startJd, endJd);

  document.getElementById('solarResult').value = output;
}

function copyWithFeedback(textareaId, buttonId) {
  const textarea = document.getElementById(textareaId);
  const button = document.getElementById(buttonId);
  textarea.select();
  document.execCommand('copy');
  
  const originalText = button.textContent;
  button.textContent = 'コピーしました';
  button.disabled = true;
  setTimeout(() => {
    button.textContent = originalText;
    button.disabled = false;
  }, 1500);
}

function copyResult() {
  copyWithFeedback('result', 'copy');
}

function copyYearly() {
  copyWithFeedback('yearlyResult', 'copyYearly');
}

function copyTransit() {
  copyWithFeedback('transitResult', 'copyTransit');
}

function copyLunar() {
  copyWithFeedback('lunarResult', 'copyLunar');
}

function copySolar() {
  copyWithFeedback('solarResult', 'copySolar');
}

function calculateSynastry() {
  if (!swe) return;
  
  // A
  const aYearVal = document.getElementById('synAYear').value;
  const aMonthVal = document.getElementById('synAMonth').value;
  const aDayVal = document.getElementById('synADay').value;
  const aHourVal = document.getElementById('synAHour').value;
  const aMinuteVal = document.getElementById('synAMinute').value;

  // 入力チェック
  if (!aYearVal || !aMonthVal || !aDayVal) {
    alert('1人目の生年月日を入力してください');
    return;
  }
  if (aHourVal === '' || aMinuteVal === '') {
    alert('1人目の出生時刻を入力してください');
    return;
  }

  // 数値変換
  const aYear = parseInt(aYearVal);
  const aMonth = parseInt(aMonthVal);
  const aDay = parseInt(aDayVal);
  const aHour = parseInt(aHourVal);
  const aMinute = parseInt(aMinuteVal);

  const aPref = document.getElementById('synAPref').value;
  const aCityName = document.getElementById('synACity').value;
  const aCity = cities[aPref].find(c => c.name === aCityName);
  
  // B
  const bYearVal = document.getElementById('synBYear').value;
  const bMonthVal = document.getElementById('synBMonth').value;
  const bDayVal = document.getElementById('synBDay').value;
  const bHourVal = document.getElementById('synBHour').value;
  const bMinuteVal = document.getElementById('synBMinute').value;

  // 入力チェック
  if (!bYearVal || !bMonthVal || !bDayVal) {
    alert('2人目の生年月日を入力してください');
    return;
  }
  if (bHourVal === '' || bMinuteVal === '') {
    alert('2人目の出生時刻を入力してください');
    return;
  }

  // 数値変換
  const bYear = parseInt(bYearVal);
  const bMonth = parseInt(bMonthVal);
  const bDay = parseInt(bDayVal);
  const bHour = parseInt(bHourVal);
  const bMinute = parseInt(bMinuteVal);
  
  const bPref = document.getElementById('synBPref').value;
  const bCityName = document.getElementById('synBCity').value;
  const bCity = cities[bPref].find(c => c.name === bCityName);

  // A計算
  const aUtcHour = aHour - 9 + aMinute / 60;
  const aJd = swe.swe_julday(aYear, aMonth, aDay, aUtcHour, 1);
  const aHouses = swe.swe_houses(aJd, aCity.lat, aCity.lng, 'P');
  const aPositions = [];
  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(aJd, id, 256);
    const lon = r[0], spd = r[3];
    const house = getHouse(lon, aHouses.cusps);
    aPositions.push({ id, name, lon, spd, house });
  }
  const aAngles = { asc: aHouses.ascmc[0], mc: aHouses.ascmc[1] };

  // B計算
  const bUtcHour = bHour - 9 + bMinute / 60;
  const bJd = swe.swe_julday(bYear, bMonth, bDay, bUtcHour, 1);
  const bHouses = swe.swe_houses(bJd, bCity.lat, bCity.lng, 'P');
  const bPositions = [];
  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(bJd, id, 256);
    const lon = r[0], spd = r[3];
    const house = getHouse(lon, bHouses.cusps);
    bPositions.push({ id, name, lon, spd, house });
  }
  const bAngles = { asc: bHouses.ascmc[0], mc: bHouses.ascmc[1] };

  // 出力
  let output = `【シナストリー】\n\n`;

  output += `■ Aのネイタル（${aYear}-${String(aMonth).padStart(2,'0')}-${String(aDay).padStart(2,'0')}）\n`;
  output += aPositions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(' / ') + '\n';
  output += `ASC ${fmtShort(aAngles.asc)} / MC ${fmtShort(aAngles.mc)}\n\n`;

  output += `■ Bのネイタル（${bYear}-${String(bMonth).padStart(2,'0')}-${String(bDay).padStart(2,'0')}）\n`;
  output += bPositions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(' / ') + '\n';
  output += `ASC ${fmtShort(bAngles.asc)} / MC ${fmtShort(bAngles.mc)}\n\n`;

  // 相互アスペクト
  output += `■ 相互アスペクト\n`;
  const aspects = [];

  // A天体 × B天体
  for (const a of aPositions) {
    for (const b of bPositions) {
      const asp = getAspect(a.lon, b.lon, SYNASTRY_ORB);
      if (asp) {
        aspects.push(`A.${a.name}${asp.symbol}B.${b.name}(${asp.orb.toFixed(1)}°)`);
      }
    }
  }

  // A天体 × B ASC/MC
  for (const a of aPositions) {
    const aspAsc = getAspect(a.lon, bAngles.asc, SYNASTRY_ORB);
    if (aspAsc) aspects.push(`A.${a.name}${aspAsc.symbol}B.ASC(${aspAsc.orb.toFixed(1)}°)`);
    const aspMc = getAspect(a.lon, bAngles.mc, SYNASTRY_ORB);
    if (aspMc) aspects.push(`A.${a.name}${aspMc.symbol}B.MC(${aspMc.orb.toFixed(1)}°)`);
  }

  // B天体 × A ASC/MC
  for (const b of bPositions) {
    const aspAsc = getAspect(b.lon, aAngles.asc, SYNASTRY_ORB);
    if (aspAsc) aspects.push(`B.${b.name}${aspAsc.symbol}A.ASC(${aspAsc.orb.toFixed(1)}°)`);
    const aspMc = getAspect(b.lon, aAngles.mc, SYNASTRY_ORB);
    if (aspMc) aspects.push(`B.${b.name}${aspMc.symbol}A.MC(${aspMc.orb.toFixed(1)}°)`);
  }

  if (aspects.length === 0) {
    output += 'なし\n';
  } else {
    output += aspects.join('\n');
  }

  document.getElementById('synastryResult').value = output;
}

function copySynastry() {
  copyWithFeedback('synastryResult', 'copySynastry');
}

async function init() {
  const prefSelect = document.getElementById('pref');
  const citySelect = document.getElementById('city');

  for (const pref of Object.keys(cities)) {
    const opt = document.createElement('option');
    opt.value = pref;
    opt.textContent = pref;
    prefSelect.appendChild(opt);
  }

  prefSelect.addEventListener('change', () => {
    citySelect.innerHTML = '';
    for (const city of cities[prefSelect.value]) {
      const opt = document.createElement('option');
      opt.value = city.name;
      opt.textContent = city.name;
      citySelect.appendChild(opt);
    }
  });
  prefSelect.dispatchEvent(new Event('change'));

  // ルナリターン用
  const lrPrefSelect = document.getElementById('lrPref');
  const lrCitySelect = document.getElementById('lrCity');

  for (const pref of Object.keys(cities)) {
    const opt = document.createElement('option');
    opt.value = pref;
    opt.textContent = pref;
    lrPrefSelect.appendChild(opt);
  }

  lrPrefSelect.addEventListener('change', () => {
    lrCitySelect.innerHTML = '';
    for (const city of cities[lrPrefSelect.value]) {
      const opt = document.createElement('option');
      opt.value = city.name;
      opt.textContent = city.name;
      lrCitySelect.appendChild(opt);
    }
  });
  lrPrefSelect.dispatchEvent(new Event('change'));

  // ソーラーリターン用
  const srPrefSelect = document.getElementById('srPref');
  const srCitySelect = document.getElementById('srCity');

  for (const pref of Object.keys(cities)) {
    const opt = document.createElement('option');
    opt.value = pref;
    opt.textContent = pref;
    srPrefSelect.appendChild(opt);
  }

  srPrefSelect.addEventListener('change', () => {
    srCitySelect.innerHTML = '';
    for (const city of cities[srPrefSelect.value]) {
      const opt = document.createElement('option');
      opt.value = city.name;
      opt.textContent = city.name;
      srCitySelect.appendChild(opt);
    }
  });
  srPrefSelect.dispatchEvent(new Event('change'));

  // シナストリーA用
  const synAPrefSelect = document.getElementById('synAPref');
  const synACitySelect = document.getElementById('synACity');

  for (const pref of Object.keys(cities)) {
    const opt = document.createElement('option');
    opt.value = pref;
    opt.textContent = pref;
    synAPrefSelect.appendChild(opt);
  }

  synAPrefSelect.addEventListener('change', () => {
    synACitySelect.innerHTML = '';
    for (const city of cities[synAPrefSelect.value]) {
      const opt = document.createElement('option');
      opt.value = city.name;
      opt.textContent = city.name;
      synACitySelect.appendChild(opt);
    }
  });
  synAPrefSelect.dispatchEvent(new Event('change'));

  // シナストリーB用
  const synBPrefSelect = document.getElementById('synBPref');
  const synBCitySelect = document.getElementById('synBCity');

  for (const pref of Object.keys(cities)) {
    const opt = document.createElement('option');
    opt.value = pref;
    opt.textContent = pref;
    synBPrefSelect.appendChild(opt);
  }

  synBPrefSelect.addEventListener('change', () => {
    synBCitySelect.innerHTML = '';
    for (const city of cities[synBPrefSelect.value]) {
      const opt = document.createElement('option');
      opt.value = city.name;
      opt.textContent = city.name;
      synBCitySelect.appendChild(opt);
    }
  });
  synBPrefSelect.dispatchEvent(new Event('change'));

  document.getElementById('calc').addEventListener('click', calculate);
  document.getElementById('copy').addEventListener('click', copyResult);
  document.getElementById('calcYearly').addEventListener('click', calculateYearly);
  document.getElementById('copyYearly').addEventListener('click', copyYearly);
  document.getElementById('calcTransit').addEventListener('click', calculateTransit);
  document.getElementById('copyTransit').addEventListener('click', copyTransit);
  document.getElementById('calcLunar').addEventListener('click', calculateLunarReturn);
  document.getElementById('copyLunar').addEventListener('click', copyLunar);
  document.getElementById('calcSolarChart').addEventListener('click', calculateSolarChart);
  document.getElementById('calcSolarYear').addEventListener('click', calculateSolarYear);
  document.getElementById('copySolar').addEventListener('click', copySolar);
  document.getElementById('calcSynastry').addEventListener('click', calculateSynastry);
  document.getElementById('copySynastry').addEventListener('click', copySynastry);

  // 今日の日付をデフォルト値に設定
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const today = now.getDate();

  // 年間概要
  document.getElementById('transitYear').value = thisYear;
  
  // トランジット
  document.getElementById('trYear').value = thisYear;
  document.getElementById('trMonth').value = thisMonth;
  document.getElementById('trDay').value = today;
  
  // ルナリターン
  document.getElementById('lrYear').value = thisYear;
  document.getElementById('lrMonth').value = thisMonth;
  
  // ソーラーリターン
  document.getElementById('srYear').value = thisYear;

  document.getElementById('status').textContent = '初期化中...';
  swe = await SwissEPH.init();
  await swe.swe_set_ephe_path();
  document.getElementById('status').textContent = '準備完了';
}

init();