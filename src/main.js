import SwissEPH from "sweph-wasm";
import cities from "./cities.json";

let swe = null;

const PLANETS = [
  [0,'太陽'], [1,'月'], [2,'水星'], [3,'金星'], [4,'火星'],
  [5,'木星'], [6,'土星'], [7,'天王星'], [8,'海王星'], [9,'冥王星'],
  [11,'Nノード']
];
const SIGNS = ['牡羊','牡牛','双子','蟹','獅子','乙女','天秤','蠍','射手','山羊','水瓶','魚'];
const ASPECT_SYMBOLS = { 0:'☌', 60:'⚹', 90:'□', 120:'△', 180:'☍' };
const ORB = 6;

function fmt(deg) {
  const s = Math.floor(deg / 30);
  const d = Math.floor(deg % 30);
  const m = Math.floor((deg % 1) * 60);
  return `${SIGNS[s]}座 ${d}°${String(m).padStart(2,'0')}`;
}

function getAspect(deg1, deg2) {
  let diff = Math.abs(deg1 - deg2);
  if (diff > 180) diff = 360 - diff;
  for (const [angle, symbol] of Object.entries(ASPECT_SYMBOLS)) {
    const orb = Math.abs(diff - Number(angle));
    if (orb <= ORB) return { symbol, orb };
  }
  return null;
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

  // JST → UTC
  const utcHour = hour - 9 + minute / 60;
  const jd = swe.swe_julday(year, month, day, utcHour, 1);

  // 天体計算
  const positions = [];
  let output = `【ネイタル】${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} ${pref}${cityName}\nハウス: プラシーダス\n\n`;

  const houses = swe.swe_houses(jd, city.lat, city.lng, 'P');

  for (const [id, name] of PLANETS) {
    const r = swe.swe_calc_ut(jd, id, 0);
    const lon = r[0], spd = r[3];
    const houseNum = houses.cusps.findIndex((c, i, arr) => {
      if (i === 0) return false;
      const next = i === 12 ? arr[1] + 360 : arr[i + 1];
      const l = lon < arr[1] && i === 12 ? lon + 360 : lon;
      return l >= c && l < next;
    });
    positions.push({ id, name, lon, spd });
    output += `${name} ${fmt(lon)} (${houseNum}H)${spd < 0 ? ' R' : ''}\n`;
  }

  output += `\nASC ${fmt(houses.ascmc[0])} / MC ${fmt(houses.ascmc[1])}\n\n`;

  // アスペクト計算
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
}

function copyResult() {
  const result = document.getElementById('result');
  result.select();
  document.execCommand('copy');
}

async function init() {
  // 都道府県プルダウン
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

  // SwissEPH初期化
  document.getElementById('status').textContent = '初期化中...';
  swe = await SwissEPH.init();
  await swe.swe_set_ephe_path();
  document.getElementById('status').textContent = '準備完了';
}

init();