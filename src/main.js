import SwissEPH from "sweph-wasm";
import cities from "./cities.json";

let swe = null;
let natalPositions = null;
let natalAngles = null; // ASC, MC

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
  document.getElementById('calcYearly').disabled = false;
  document.getElementById('copyYearly').disabled = false;
}

function calculateYearly() {
  if (!swe || !natalPositions || !natalAngles) return;

  const year = parseInt(document.getElementById('transitYear').value);
  let output = `【${year}年 天体運行概要】\n\n`;

  // ネイタル情報を冒頭に
  output += `■ ネイタル（参照用）\n`;
  const natalSummary = natalPositions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(' / ');
  output += `${natalSummary}\n`;
  output += `ASC ${fmtShort(natalAngles.asc)} / MC ${fmtShort(natalAngles.mc)}\n\n`;

  const startJd = swe.swe_julday(year, 1, 1, 0, 1);
  const endJd = swe.swe_julday(year, 12, 31, 0, 1);

  // 逆行期間を追跡
  const retrograde = {};
  for (const [id, name] of OUTER_PLANETS) {
    retrograde[id] = { name, periods: [], inRetro: false, start: null };
  }

  // イングレスを追跡
  const ingresses = [];
  const prevSigns = {};

  // トランジット×ネイタル天体
  const transitAspects = {};
  for (const [tId, tName] of TRANSIT_PLANETS) {
    for (const n of natalPositions) {
      const key = `t.${tName}→n.${n.name}`;
      transitAspects[key] = { periods: [], inAspect: false, start: null, symbol: null, house: n.house };
    }
  }

  // トランジット×ASC/MC
  const angleTransits = {
    'ASC': { lon: natalAngles.asc, periods: [], current: {} },
    'MC': { lon: natalAngles.mc, periods: [], current: {} }
  };
  for (const [tId, tName] of TRANSIT_PLANETS) {
    angleTransits['ASC'].current[tName] = { inAspect: false, start: null, symbol: null };
    angleTransits['MC'].current[tName] = { inAspect: false, start: null, symbol: null };
  }

  // 1日ずつスキャン
  for (let jd = startJd; jd <= endJd; jd += 1) {
    for (const [id, name] of OUTER_PLANETS) {
      const r = swe.swe_calc_ut(jd, id, 256);
      const lon = r[0], spd = r[3];
      const sign = signOf(lon);

      // 逆行チェック
      const retro = retrograde[id];
      if (spd < 0 && !retro.inRetro) {
        retro.inRetro = true;
        retro.start = jd;
      } else if (spd >= 0 && retro.inRetro) {
        retro.inRetro = false;
        retro.periods.push([retro.start, jd]);
      }

      // イングレスチェック（外惑星のみ）
      if ([5,6,7,8,9].includes(id)) {
        if (prevSigns[id] !== undefined && prevSigns[id] !== sign) {
          ingresses.push({ jd, name, sign });
        }
        prevSigns[id] = sign;
      }
    }

    // トランジット×ネイタル天体
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

      // トランジット×ASC/MC
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

  // 年末処理
  for (const [id, name] of OUTER_PLANETS) {
    const retro = retrograde[id];
    if (retro.inRetro) {
      retro.periods.push([retro.start, endJd]);
    }
  }
  for (const key of Object.keys(transitAspects)) {
    const ta = transitAspects[key];
    if (ta.inAspect) {
      ta.periods.push({ start: ta.start, end: endJd, symbol: ta.symbol });
    }
  }
  for (const angleName of ['ASC', 'MC']) {
    for (const [tId, tName] of TRANSIT_PLANETS) {
      const cur = angleTransits[angleName].current[tName];
      if (cur.inAspect) {
        angleTransits[angleName].periods.push({ planet: tName, start: cur.start, end: endJd, symbol: cur.symbol });
      }
    }
  }

  // 出力: 逆行期間
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

  // 出力: イングレス
  output += `\n■ 星座イングレス\n`;
  if (ingresses.length === 0) {
    output += `なし\n`;
  } else {
    for (const ing of ingresses) {
      output += `${ing.name}: ${jdToDate(ing.jd)} ${SIGNS[ing.sign]}座入り\n`;
    }
  }

  // 出力: ASC/MCへのトランジット
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
  if (!hasAngleTransit) {
    output += `なし\n`;
  }

  // 出力: トランジット×ネイタル天体
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
  if (!hasTransit) {
    output += `なし\n`;
  }

  document.getElementById('yearlyResult').value = output;
}

function copyResult() {
  const result = document.getElementById('result');
  result.select();
  document.execCommand('copy');
}

function copyYearly() {
  const result = document.getElementById('yearlyResult');
  result.select();
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

  document.getElementById('status').textContent = '初期化中...';
  swe = await SwissEPH.init();
  await swe.swe_set_ephe_path();
  document.getElementById('status').textContent = '準備完了';
}

init();