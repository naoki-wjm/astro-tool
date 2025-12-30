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
const ORB = 6;
const TRANSIT_ORB = 2;

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

  const year = parseInt(document.getElementById('year').value);
  const month = parseInt(document.getElementById('month').value);
  const day = parseInt(document.getElementById('day').value);
  const hour = parseInt(document.getElementById('hour').value);
  const minute = parseInt(document.getElementById('minute').value);
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
  
  // 各機能のボタンを有効化
  document.getElementById('calcYearly').disabled = false;
  document.getElementById('copyYearly').disabled = false;
  document.getElementById('calcTransit').disabled = false;
  document.getElementById('copyTransit').disabled = false;
  document.getElementById('calcLunar').disabled = false;
  document.getElementById('copyLunar').disabled = false;
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

  document.getElementById('yearlyResult').value = output;
}

function calculateTransit() {
  if (!swe || !natalPositions || !natalAngles) return;

  const year = parseInt(document.getElementById('trYear').value);
  const month = parseInt(document.getElementById('trMonth').value);
  const day = parseInt(document.getElementById('trDay').value);

  const jd = swe.swe_julday(year, month, day, 12 - 9, 1); // 正午JST

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
    // ASC/MCへのアスペクト
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
  if (!swe || !natalPositions || !natalCity) return;

  const year = parseInt(document.getElementById('lrYear').value);
  const month = parseInt(document.getElementById('lrMonth').value);

  const natalMoon = natalPositions.find(p => p.name === '月').lon;

  // 月初から探索開始
  let jd = swe.swe_julday(year, month, 1, 0, 1);
  const endJd = swe.swe_julday(year, month + 1, 1, 0, 1);

  let returnJd = null;

  // 月は約27.3日で一周するので、1ヶ月に1回はある
  // 6時間刻みで粗く探索してから絞り込む
  let prevDiff = null;
  for (; jd < endJd; jd += 0.25) {
    const r = swe.swe_calc_ut(jd, 1, 256);
    let diff = r[0] - natalMoon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (prevDiff !== null && prevDiff < 0 && diff >= 0) {
      // この間にリターンがある、二分探索で絞り込む
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
      returnJd = (lo + hi) / 2;
      break;
    }
    prevDiff = diff;
  }

  if (!returnJd) {
    document.getElementById('lunarResult').value = `${year}年${month}月のルナリターンが見つかりませんでした`;
    return;
  }

  // UTC→JST変換して表示
  const jstJd = returnJd + 9 / 24;
  const dt = swe.swe_revjul(jstJd, 1);
  const h = Math.floor(dt.hour);
  const m = Math.floor((dt.hour - h) * 60);

  let output = `【ルナリターン】${dt.year}-${String(dt.month).padStart(2,'0')}-${String(dt.day).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} JST\n`;
  output += `ネイタル月: ${fmt(natalMoon)}\n`;
  output += `ハウス: プラシーダス\n\n`;

  // ルナリターンチャート
  const houses = swe.swe_houses(returnJd, natalCity.lat, natalCity.lng, 'P');

  output += `■ 天体\n`;
  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(returnJd, id, 256);
    const lon = r[0], spd = r[3];
    const house = getHouse(lon, houses.cusps);
    output += `${name} ${fmt(lon)} (${house}H)${spd < 0 ? ' R' : ''}\n`;
  }

  output += `\nASC ${fmt(houses.ascmc[0])} / MC ${fmt(houses.ascmc[1])}\n`;

  // ネイタルへのアスペクト
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

  document.getElementById('lunarResult').value = output;
}

function copyResult() {
  document.getElementById('result').select();
  document.execCommand('copy');
}

function copyYearly() {
  document.getElementById('yearlyResult').select();
  document.execCommand('copy');
}

function copyTransit() {
  document.getElementById('transitResult').select();
  document.execCommand('copy');
}

function copyLunar() {
  document.getElementById('lunarResult').select();
  document.execCommand('copy');
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

  document.getElementById('calc').addEventListener('click', calculate);
  document.getElementById('copy').addEventListener('click', copyResult);
  document.getElementById('calcYearly').addEventListener('click', calculateYearly);
  document.getElementById('copyYearly').addEventListener('click', copyYearly);
  document.getElementById('calcTransit').addEventListener('click', calculateTransit);
  document.getElementById('copyTransit').addEventListener('click', copyTransit);
  document.getElementById('calcLunar').addEventListener('click', calculateLunarReturn);
  document.getElementById('copyLunar').addEventListener('click', copyLunar);

  document.getElementById('status').textContent = '初期化中...';
  swe = await SwissEPH.init();
  await swe.swe_set_ephe_path();
  document.getElementById('status').textContent = '準備完了';
}

init();