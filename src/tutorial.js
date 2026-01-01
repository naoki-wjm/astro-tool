import SwissEPH from "sweph-wasm";
import cities from "./cities.json";

let swe = null;

// 定数
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

// ユーティリティ関数
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

// Step 2 のオプション定義
const step2Options = {
  personality: [
    { value: 'general', label: '全体的に知りたい' },
    { value: 'work', label: '仕事・適職について' },
    { value: 'love', label: '恋愛傾向について' },
    { value: 'relationship', label: '人間関係の傾向について' }
  ],
  compatibility: [
    { value: 'general', label: '全体的な相性' },
    { value: 'romance', label: '恋愛相手として' },
    { value: 'work', label: '仕事仲間・同僚として' },
    { value: 'friend', label: '友人として' }
  ],
  yearly: [
    { value: 'general', label: '全体的な運勢' },
    { value: 'work', label: '仕事運を中心に' },
    { value: 'love', label: '恋愛運を中心に' },
    { value: 'caution', label: '注意すべき時期を知りたい' }
  ],
  monthly: [
    { value: 'general', label: '全体的なテーマ' },
    { value: 'work', label: '仕事面のアドバイス' },
    { value: 'private', label: 'プライベートのアドバイス' }
  ],
  daily: [
    { value: 'general', label: '全体的な運勢' },
    { value: 'work', label: '仕事・面接・商談などに良い日か' },
    { value: 'love', label: 'デート・告白に良い日か' },
    { value: 'decision', label: '大きな決断をしても良い日か' }
  ]
};

// 質問文の生成
const questionTexts = {
  personality: {
    general: '私の性格や強み、向いていることを教えてください。',
    work: '私の仕事運や適職について教えてください。どんな働き方が向いていますか？',
    love: '私の恋愛傾向を教えてください。どんな人と相性が良いですか？',
    relationship: '私の人間関係の傾向を教えてください。コミュニケーションの特徴は？'
  },
  compatibility: {
    general: 'この2人の相性を教えてください。お互いの長所を活かすコツも教えてください。',
    romance: 'この2人の恋愛相性を教えてください。うまく付き合っていくためのアドバイスもお願いします。',
    work: 'この2人の仕事上の相性を教えてください。一緒に働くときのコツを教えてください。',
    friend: 'この2人の友人としての相性を教えてください。良い関係を続けるコツも教えてください。'
  },
  yearly: {
    general: '私の今年の運勢を教えてください。全体的な流れとポイントをお願いします。',
    work: '私の今年の仕事運を中心に教えてください。チャンスの時期や注意点も知りたいです。',
    love: '私の今年の恋愛運を中心に教えてください。良い時期や気をつける時期を教えてください。',
    caution: '今年、特に注意すべき時期を教えてください。どう乗り越えればいいかも教えてください。'
  },
  monthly: {
    general: '今月のテーマと過ごし方のアドバイスをください。',
    work: '今月の仕事面でのアドバイスをください。',
    private: '今月のプライベートでのアドバイスをください。'
  },
  daily: {
    general: 'この日の運勢を教えてください。',
    work: 'この日は仕事・面接・商談などに良い日ですか？アドバイスをください。',
    love: 'この日はデートや告白に良い日ですか？アドバイスをください。',
    decision: 'この日は大きな決断をしても良い日ですか？アドバイスをください。'
  }
};

// 状態管理
let currentCategory = null;
let currentDetail = null;

// ネイタル計算（戻り値でデータも返す）
function calculateNatal() {
  const yearVal = document.getElementById('birthYear').value;
  const monthVal = document.getElementById('birthMonth').value;
  const dayVal = document.getElementById('birthDay').value;
  const hourVal = document.getElementById('birthHour').value;
  const minuteVal = document.getElementById('birthMinute').value;
  const timeUnknown = document.getElementById('timeUnknown').checked;

  // 入力チェック（parseIntの前に）
  if (!yearVal || !monthVal || !dayVal) {
    alert('生年月日を入力してください');
    return;
  }
  if (!timeUnknown && (hourVal === '' || minuteVal === '')) {
    alert('出生時刻を入力してください');
    return;
  }

  // 数値変換
  const year = parseInt(yearVal);
  const month = parseInt(monthVal);
  const day = parseInt(dayVal);
  let hour = timeUnknown ? 12 : parseInt(hourVal);
  let minute = timeUnknown ? 0 : parseInt(minuteVal);
  
  const pref = document.getElementById('birthPref').value;
  const cityName = document.getElementById('birthCity').value;
  const city = cities[pref].find(c => c.name === cityName);
  
  const utcHour = hour - 9 + minute / 60;
  const jd = swe.swe_julday(year, month, day, utcHour, 1);
  const houses = swe.swe_houses(jd, city.lat, city.lng, 'P');
  
  let output = `【ネイタル】${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} ${pref}${cityName}\n`;
  output += `ハウス: プラシーダス\n\n`;
  
  const positions = [];
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
  
  return {
    output,
    positions,
    angles: { asc, mc },
    houses,
    birthMonth: month,
    birthDay: day
  };
}

// シナストリー計算
function calculateSynastry() {
  // A
  const aYearVal = document.getElementById('personAYear').value;
  const aMonthVal = document.getElementById('personAMonth').value;
  const aDayVal = document.getElementById('personADay').value;
  const aHourVal = document.getElementById('personAHour').value;
  const aMinuteVal = document.getElementById('personAMinute').value;
  const aTimeUnknown = document.getElementById('personATimeUnknown').checked;

  // 入力チェック（parseIntの前に）
  if (!aYearVal || !aMonthVal || !aDayVal) {
    alert('1人目の生年月日を入力してください');
    return;
  }
  if (!aTimeUnknown && (aHourVal === '' || aMinuteVal === '')) {
    alert('1人目の出生時刻を入力してください');
    return;
  }

  // 数値変換
  const aYear = parseInt(aYearVal);
  const aMonth = parseInt(aMonthVal);
  const aDay = parseInt(aDayVal);
  let aHour = aTimeUnknown ? 12 : parseInt(aHourVal);
  let aMinute = aTimeUnknown ? 0 : parseInt(aMinuteVal);

  const aPref = document.getElementById('personAPref').value;
  const aCityName = document.getElementById('personACity').value;
  const aCity = cities[aPref].find(c => c.name === aCityName);
  
  // B
  const bYearVal = document.getElementById('personBYear').value;
  const bMonthVal = document.getElementById('personBMonth').value;
  const bDayVal = document.getElementById('personBDay').value;
  const bHourVal = document.getElementById('personBHour').value;
  const bMinuteVal = document.getElementById('personBMinute').value;
  const bTimeUnknown = document.getElementById('personBTimeUnknown').checked;

  // 入力チェック（parseIntの前に）
  if (!bYearVal || !bMonthVal || !bDayVal) {
    alert('2人目の生年月日を入力してください');
    return;
  }
  if (!bTimeUnknown && (bHourVal === '' || bMinuteVal === '')) {
    alert('2人目の出生時刻を入力してください');
    return;
  }

  // 数値変換
  const bYear = parseInt(bYearVal);
  const bMonth = parseInt(bMonthVal);
  const bDay = parseInt(bDayVal);
  let bHour = bTimeUnknown ? 12 : parseInt(bHourVal);
  let bMinute = bTimeUnknown ? 0 : parseInt(bMinuteVal);
  
  const bPref = document.getElementById('personBPref').value;
  const bCityName = document.getElementById('personBCity').value;
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
  output += `■ 1人目（${aYear}-${String(aMonth).padStart(2,'0')}-${String(aDay).padStart(2,'0')}）\n`;
  output += aPositions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(' / ') + '\n';
  output += `ASC ${fmtShort(aAngles.asc)} / MC ${fmtShort(aAngles.mc)}\n\n`;
  
  output += `■ 2人目（${bYear}-${String(bMonth).padStart(2,'0')}-${String(bDay).padStart(2,'0')}）\n`;
  output += bPositions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(' / ') + '\n';
  output += `ASC ${fmtShort(bAngles.asc)} / MC ${fmtShort(bAngles.mc)}\n\n`;
  
  output += `■ 相互アスペクト\n`;
  const aspects = [];
  
  for (const a of aPositions) {
    for (const b of bPositions) {
      const asp = getAspect(a.lon, b.lon, SYNASTRY_ORB);
      if (asp) aspects.push(`1.${a.name}${asp.symbol}2.${b.name}(${asp.orb.toFixed(1)}°)`);
    }
  }
  
  for (const a of aPositions) {
    const aspAsc = getAspect(a.lon, bAngles.asc, SYNASTRY_ORB);
    if (aspAsc) aspects.push(`1.${a.name}${aspAsc.symbol}2.ASC(${aspAsc.orb.toFixed(1)}°)`);
    const aspMc = getAspect(a.lon, bAngles.mc, SYNASTRY_ORB);
    if (aspMc) aspects.push(`1.${a.name}${aspMc.symbol}2.MC(${aspMc.orb.toFixed(1)}°)`);
  }
  
  for (const b of bPositions) {
    const aspAsc = getAspect(b.lon, aAngles.asc, SYNASTRY_ORB);
    if (aspAsc) aspects.push(`2.${b.name}${aspAsc.symbol}1.ASC(${aspAsc.orb.toFixed(1)}°)`);
    const aspMc = getAspect(b.lon, aAngles.mc, SYNASTRY_ORB);
    if (aspMc) aspects.push(`2.${b.name}${aspMc.symbol}1.MC(${aspMc.orb.toFixed(1)}°)`);
  }
  
  output += aspects.length ? aspects.join('\n') : 'なし\n';
  
  return output;
}

// 年間概要計算（ネイタルデータを引数で受け取る）
function calcYearlyRange(startJd, endJd, natalPositions, natalAngles) {
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

  // 終了時に継続中のものを閉じる
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

// 年間概要
function calculateYearly(natalData) {
  const year = parseInt(document.getElementById('targetYear').value);
  
  let output = `【${year}年 天体運行概要】\n\n`;
  output += `■ ネイタル（参照用）\n`;
  const natalSummary = natalData.positions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(' / ');
  output += `${natalSummary}\n`;
  output += `ASC ${fmtShort(natalData.angles.asc)} / MC ${fmtShort(natalData.angles.mc)}\n\n`;

  const startJd = swe.swe_julday(year, 1, 1, 0, 1);
  const endJd = swe.swe_julday(year, 12, 31, 0, 1);

  output += calcYearlyRange(startJd, endJd, natalData.positions, natalData.angles);

  return output;
}

// トランジット計算
function calculateTransit(natalData) {
  const year = parseInt(document.getElementById('targetDayYear').value);
  const month = parseInt(document.getElementById('targetDayMonth').value);
  const day = parseInt(document.getElementById('targetDayDay').value);

  const jd = swe.swe_julday(year, month, day, 12 - 9, 1);

  let output = `【トランジット】${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}\n\n`;

  output += `■ ネイタル（参照用）\n`;
  const natalSummary = natalData.positions.map(p => `${p.name} ${fmtShort(p.lon)}(${p.house}H)`).join(' / ');
  output += `${natalSummary}\n`;
  output += `ASC ${fmtShort(natalData.angles.asc)} / MC ${fmtShort(natalData.angles.mc)}\n\n`;

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
    for (const n of natalData.positions) {
      const asp = getAspect(t.lon, n.lon, TRANSIT_ORB);
      if (asp) {
        aspects.push(`t.${t.name}${asp.symbol}n.${n.name}(${n.house}H)`);
      }
    }
    const aspAsc = getAspect(t.lon, natalData.angles.asc, TRANSIT_ORB);
    if (aspAsc) aspects.push(`t.${t.name}${aspAsc.symbol}n.ASC`);
    const aspMc = getAspect(t.lon, natalData.angles.mc, TRANSIT_ORB);
    if (aspMc) aspects.push(`t.${t.name}${aspMc.symbol}n.MC`);
  }

  if (aspects.length === 0) {
    output += `なし\n`;
  } else {
    output += aspects.join(' / ');
  }

  return output;
}

// ルナリターン計算
function calculateLunarReturn(natalData) {
  const year = parseInt(document.getElementById('targetMonthYear').value);
  const month = parseInt(document.getElementById('targetMonth').value);
  const pref = document.getElementById('currentPref').value;
  const cityName = document.getElementById('currentCity').value;
  const city = cities[pref].find(c => c.name === cityName);

  const natalMoon = natalData.positions.find(p => p.name === '月').lon;

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
    return `${year}年${month}月のルナリターンが見つかりませんでした`;
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
      
      for (const n of natalData.positions) {
        const asp = getAspect(lon, n.lon, TRANSIT_ORB);
        if (asp) {
          aspects.push(`LR.${name}${asp.symbol}n.${n.name}(${n.house}H)`);
        }
      }
      const aspAsc = getAspect(lon, natalData.angles.asc, TRANSIT_ORB);
      if (aspAsc) aspects.push(`LR.${name}${aspAsc.symbol}n.ASC`);
      const aspMc = getAspect(lon, natalData.angles.mc, TRANSIT_ORB);
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

  return output;
}

// Step 2 のオプション生成
function renderStep2Options() {
  const container = document.getElementById('step2Options');
  container.innerHTML = '';
  
  const options = step2Options[currentCategory];
  options.forEach(opt => {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="radio" name="detail" value="${opt.value}">
      <span>${opt.label}</span>
    `;
    container.appendChild(label);
  });
  
  container.querySelectorAll('input[name="detail"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentDetail = e.target.value;
      document.getElementById('toStep3').disabled = false;
    });
  });
}

// フォーム表示の切り替え
function showRelevantForms() {
  document.getElementById('selfForm').style.display = 'none';
  document.getElementById('compatibilityForm').style.display = 'none';
  document.getElementById('yearForm').style.display = 'none';
  document.getElementById('monthForm').style.display = 'none';
  document.getElementById('dayForm').style.display = 'none';
  
  if (currentCategory === 'compatibility') {
    document.getElementById('compatibilityForm').style.display = 'block';
  } else {
    document.getElementById('selfForm').style.display = 'block';
    
    if (currentCategory === 'yearly') {
      document.getElementById('yearForm').style.display = 'block';
    } else if (currentCategory === 'monthly') {
      document.getElementById('monthForm').style.display = 'block';
    } else if (currentCategory === 'daily') {
      document.getElementById('dayForm').style.display = 'block';
    }
  }
}

// ステップ移動
function goToStep(stepNum) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(`step${stepNum}`).classList.add('active');
}

// 都道府県セレクトの初期化
function initPrefSelect(prefId, cityId) {
  const prefSelect = document.getElementById(prefId);
  const citySelect = document.getElementById(cityId);
  
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
}

// コピー機能
function copyWithFeedback() {
  const textarea = document.getElementById('resultText');
  const button = document.getElementById('copyResult');
  textarea.select();
  document.execCommand('copy');
  
  const originalText = button.textContent;
  button.textContent = '✓ コピーしました！';
  setTimeout(() => { button.textContent = originalText; }, 1500);
}

// 初期化
async function init() {
  // 都道府県セレクト初期化
  initPrefSelect('birthPref', 'birthCity');
  initPrefSelect('personAPref', 'personACity');
  initPrefSelect('personBPref', 'personBCity');
  initPrefSelect('currentPref', 'currentCity');
  
  // 今年・今月をデフォルトに
  const now = new Date();
  document.getElementById('targetYear').value = now.getFullYear();
  document.getElementById('targetMonthYear').value = now.getFullYear();
  document.getElementById('targetMonth').value = now.getMonth() + 1;
  document.getElementById('targetDayYear').value = now.getFullYear();
  document.getElementById('targetDayMonth').value = now.getMonth() + 1;
  document.getElementById('targetDayDay').value = now.getDate();
  
  // Step 1 の選択
  document.querySelectorAll('input[name="category"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      document.getElementById('toStep2').disabled = false;
    });
  });
  
  // ナビゲーションボタン
  document.getElementById('toStep2').addEventListener('click', () => {
    renderStep2Options();
    currentDetail = null;
    document.getElementById('toStep3').disabled = true;
    goToStep(2);
  });
  
  document.getElementById('backTo1').addEventListener('click', () => goToStep(1));
  
  document.getElementById('toStep3').addEventListener('click', () => {
    showRelevantForms();
    goToStep(3);
  });
  
  document.getElementById('backTo2').addEventListener('click', () => goToStep(2));
  document.getElementById('backTo3').addEventListener('click', () => goToStep(3));
  document.getElementById('restart').addEventListener('click', () => {
    currentCategory = null;
    currentDetail = null;
    document.querySelectorAll('input[name="category"]').forEach(r => r.checked = false);
    document.getElementById('toStep2').disabled = true;
    goToStep(1);
  });
  
  // 時刻不明チェックボックス
  document.getElementById('timeUnknown').addEventListener('change', (e) => {
    document.getElementById('birthHour').disabled = e.target.checked;
    document.getElementById('birthMinute').disabled = e.target.checked;
  });
  document.getElementById('personATimeUnknown').addEventListener('change', (e) => {
    document.getElementById('personAHour').disabled = e.target.checked;
    document.getElementById('personAMinute').disabled = e.target.checked;
  });
  document.getElementById('personBTimeUnknown').addEventListener('change', (e) => {
    document.getElementById('personBHour').disabled = e.target.checked;
    document.getElementById('personBMinute').disabled = e.target.checked;
  });
  
  // 計算実行
  document.getElementById('calculate').addEventListener('click', async () => {
    if (!swe) return;
    
    let output = questionTexts[currentCategory][currentDetail] + '\n\n';
    
    if (currentCategory === 'compatibility') {
      output += calculateSynastry();
    } else {
      const natalData = calculateNatal();
      output += natalData.output;
      
      if (currentCategory === 'yearly') {
        output += '\n\n' + calculateYearly(natalData);
      } else if (currentCategory === 'monthly') {
        output += '\n\n' + calculateLunarReturn(natalData);
      } else if (currentCategory === 'daily') {
        output += '\n\n' + calculateTransit(natalData);
      }
    }
    
    document.getElementById('resultText').value = output;
    goToStep(4);
  });
  
  // コピーボタン
  document.getElementById('copyResult').addEventListener('click', copyWithFeedback);
  
  // WASM初期化
  document.getElementById('status').textContent = '初期化中...';
  swe = await SwissEPH.init();
  await swe.swe_set_ephe_path();
  document.getElementById('status').textContent = '';
}

init();