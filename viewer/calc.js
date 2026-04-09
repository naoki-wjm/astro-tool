/**
 * Astro Viewer - 天文計算モジュール
 *
 * sweph-wasm の初期化と、astro-tool から移植した計算・フォーマット関数群。
 */

import SwissEPH from "../sweph/sweph-wasm.js";

// ── sweph-wasm インスタンス ──
let swe = null;

export async function initSwe() {
  swe = await SwissEPH.init();
  await swe.swe_set_ephe_path();
  return swe;
}

export function getSwe() {
  return swe;
}

// ── 定数 ──

/** 計算フラグ: Moshier天文暦 + 速度 */
const SEFLG_MOSEPH = 4;
const SEFLG_SPEED = 256;
export const CALC_FLAGS = SEFLG_MOSEPH | SEFLG_SPEED;

/** 天体リスト（必須） */
export const PLANETS = [
  { id: 0,  name: "太陽",       glyph: "☉",  color: "#FFA500" },
  { id: 1,  name: "月",         glyph: "☽",  color: "#B0C4DE" },
  { id: 2,  name: "水星",       glyph: "☿",  color: "#90EE90" },
  { id: 3,  name: "金星",       glyph: "♀",  color: "#FF69B4" },
  { id: 4,  name: "火星",       glyph: "♂",  color: "#FF4444" },
  { id: 5,  name: "木星",       glyph: "♃",  color: "#9370DB" },
  { id: 6,  name: "土星",       glyph: "♄",  color: "#A0A0A0" },
  { id: 7,  name: "天王星",     glyph: "♅",  color: "#00CED1" },
  { id: 8,  name: "海王星",     glyph: "♆",  color: "#B39DDB" },
  { id: 9,  name: "冥王星",     glyph: "♇",  color: "#CC44CC" },
  { id: 11, name: "Nノード",    glyph: "☊",  color: "#C0C0C0" },
];

/** Sノード（ヘッド + 180° で算出） */
export const S_NODE = { id: -1, name: "Sノード", glyph: "☋", color: "#C0C0C0" };

/** オプション天体 */
export const OPTIONAL_BODIES = [
  { id: 15, key: "chiron",  name: "キロン",   glyph: "⚷",  color: "#DAA520" },
  { id: 12, key: "lilith",  name: "リリス",   glyph: "⚸",  color: "#8B008B" },
  { id: 17, key: "ceres",   name: "セレス",   glyph: "⚳",  color: "#8FBC8F" },
  { id: 18, key: "pallas",  name: "パラス",   glyph: "⚴",  color: "#6495ED" },
  { id: 19, key: "juno",    name: "ジュノー", glyph: "⚵",  color: "#DB7093" },
  { id: 20, key: "vesta",   name: "ベスタ",   glyph: "⚶",  color: "#CD853F" },
];

/** 12星座 */
export const SIGNS = [
  { name: "牡羊",  fullName: "牡羊座",  glyph: "♈", element: "fire" },
  { name: "牡牛",  fullName: "牡牛座",  glyph: "♉", element: "earth" },
  { name: "双子",  fullName: "双子座",  glyph: "♊", element: "air" },
  { name: "蟹",    fullName: "蟹座",    glyph: "♋", element: "water" },
  { name: "獅子",  fullName: "獅子座",  glyph: "♌", element: "fire" },
  { name: "乙女",  fullName: "乙女座",  glyph: "♍", element: "earth" },
  { name: "天秤",  fullName: "天秤座",  glyph: "♎", element: "air" },
  { name: "蠍",    fullName: "蠍座",    glyph: "♏", element: "water" },
  { name: "射手",  fullName: "射手座",  glyph: "♐", element: "fire" },
  { name: "山羊",  fullName: "山羊座",  glyph: "♑", element: "earth" },
  { name: "水瓶",  fullName: "水瓶座",  glyph: "♒", element: "air" },
  { name: "魚",    fullName: "魚座",    glyph: "♓", element: "water" },
];

/** メジャーアスペクト */
export const ASPECTS = [
  { angle: 0,   name: "コンジャンクション", symbol: "☌", type: "conjunction", color: "#4AD97A" },
  { angle: 60,  name: "セクスタイル",       symbol: "⚹", type: "soft",        color: "#4A90D9" },
  { angle: 90,  name: "スクエア",           symbol: "□", type: "hard",        color: "#D94A4A" },
  { angle: 120, name: "トライン",           symbol: "△", type: "soft",        color: "#4A90D9" },
  { angle: 180, name: "オポジション",       symbol: "☍", type: "hard",        color: "#D94A4A" },
];

/** マイナーアスペクト */
export const MINOR_ASPECTS = [
  { angle: 150, name: "クインカンクス",     symbol: "⚻", type: "minor", color: "#888888" },
  { angle: 45,  name: "セミスクエア",       symbol: "∠", type: "minor", color: "#888888" },
  { angle: 135, name: "セスキコードレイト", symbol: "⚼", type: "minor", color: "#888888" },
  { angle: 30,  name: "セミセクスタイル",   symbol: "⚺", type: "minor", color: "#888888" },
  { angle: 72,  name: "クインタイル",       symbol: "Q", type: "minor", color: "#888888" },
  { angle: 144, name: "バイクインタイル",   symbol: "bQ",type: "minor", color: "#888888" },
];

/** ハウスシステム */
export const HOUSE_SYSTEMS = [
  { code: "P", name: "プラシーダス" },
  { code: "K", name: "コッホ" },
  { code: "W", name: "ホールサインハウス" },
  { code: "E", name: "イコールハウス" },
];

/** 四元素マップ */
export const ELEMENTS = {
  fire:  { name: "火", signs: [0, 4, 8] },
  earth: { name: "地", signs: [1, 5, 9] },
  air:   { name: "風", signs: [2, 6, 10] },
  water: { name: "水", signs: [3, 7, 11] },
};

/** 三区分マップ */
export const MODALITIES = {
  cardinal: { name: "活動", signs: [0, 3, 6, 9] },
  fixed:    { name: "不動", signs: [1, 4, 7, 10] },
  mutable:  { name: "柔軟", signs: [2, 5, 8, 11] },
};

// ── フォーマット関数 ──

/** 度数を星座表記に変換 (例: "射手座 9°15'") */
export function fmt(deg) {
  const s = Math.floor(deg / 30);
  const d = Math.floor(deg % 30);
  const m = Math.floor((deg % 1) * 60);
  return `${SIGNS[s].fullName} ${d}°${String(m).padStart(2, "0")}'`;
}

/** 短縮表記 (例: "射手9°") */
export function fmtShort(deg) {
  const s = Math.floor(deg / 30);
  const d = Math.floor(deg % 30);
  return `${SIGNS[s].name}${d}°`;
}

/** テキスト出力用 (例: "射手座 9°15") — コピー用に'なし */
export function fmtText(deg) {
  const s = Math.floor(deg / 30);
  const d = Math.floor(deg % 30);
  const m = Math.floor((deg % 1) * 60);
  return `${SIGNS[s].fullName} ${d}°${String(m).padStart(2, "0")}`;
}

/** 星座インデックス (0-11) */
export function signOf(deg) {
  return Math.floor(deg / 30);
}

// ── アスペクト判定 ──

/**
 * 2天体間のアスペクトを判定
 * @param {number} deg1 - 天体1の黄経
 * @param {number} deg2 - 天体2の黄経
 * @param {number} orb - オーブ（度）
 * @param {boolean} includeMinor - マイナーアスペクトも含むか
 * @returns {object|null} { angle, symbol, name, type, color, orb, exact }
 */
export function getAspect(deg1, deg2, orb = 5, includeMinor = false) {
  let diff = Math.abs(deg1 - deg2);
  if (diff > 180) diff = 360 - diff;

  const aspectList = includeMinor ? [...ASPECTS, ...MINOR_ASPECTS] : ASPECTS;

  for (const asp of aspectList) {
    const o = Math.abs(diff - asp.angle);
    if (o <= orb) {
      return {
        angle: asp.angle,
        symbol: asp.symbol,
        name: asp.name,
        type: asp.type,
        color: asp.color,
        orb: o,
        exact: diff,
      };
    }
  }
  return null;
}

/**
 * 接近・離反（applying/separating）判定
 * @param {number} deg1 - 天体1の黄経
 * @param {number} deg2 - 天体2の黄経
 * @param {number} speed1 - 天体1の速度
 * @param {number} speed2 - 天体2の速度
 * @param {number} aspectAngle - アスペクトの角度
 * @returns {boolean} true = applying（接近中）
 */
export function isApplying(deg1, deg2, speed1, speed2, aspectAngle) {
  let diff = deg1 - deg2;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  const currentOrb = Math.abs(Math.abs(diff) - aspectAngle);
  const futureDiff = (deg1 + speed1) - (deg2 + speed2);
  let futureDiffNorm = futureDiff;
  if (futureDiffNorm > 180) futureDiffNorm -= 360;
  if (futureDiffNorm < -180) futureDiffNorm += 360;
  const futureOrb = Math.abs(Math.abs(futureDiffNorm) - aspectAngle);

  return futureOrb < currentOrb;
}

// ── ハウス判定 ──

/** 黄経からハウス番号 (1-12) を返す */
export function getHouse(lon, cusps) {
  for (let i = 1; i <= 12; i++) {
    const start = cusps[i];
    const end = i === 12 ? cusps[1] : cusps[i + 1];
    // 角度差で判定（0° またぎを自動的に処理）
    const houseSpan = ((end - start) % 360 + 360) % 360;
    const planetDist = ((lon - start) % 360 + 360) % 360;
    if (planetDist < houseSpan) return i;
  }
  return 1;
}

// ── 天文計算 ──

/**
 * ネイタルチャートを計算
 * @param {object} params - { year, month, day, hour, minute, lat, lng, utcOffset, houseSystem }
 * @param {object} options - { optionalBodies: { chiron: bool, ... } }
 * @returns {object} { planets, cusps, angles, houses }
 */
export function calculateNatal(params, options = {}) {
  const { year, month, day, hour, minute, lat, lng, utcOffset, houseSystem = "P" } = params;
  const utcHour = hour + minute / 60 - utcOffset;
  const jd = swe.swe_julday(year, month, day, utcHour, 1);

  // ハウスカスプ
  const houseResult = swe.swe_houses(jd, lat, lng, houseSystem);
  const cusps = houseResult.cusps;
  const angles = {
    asc: cusps[1],
    mc: houseResult.ascmc[1],
    dsc: (cusps[1] + 180) % 360,
    ic: (houseResult.ascmc[1] + 180) % 360,
  };

  // 天体位置
  const planets = [];

  // 必須天体
  for (const p of PLANETS) {
    const r = swe.swe_calc_ut(jd, p.id, CALC_FLAGS);
    const lon = r[0];
    const speed = r[3];
    planets.push({
      ...p,
      lon,
      speed,
      retrograde: speed < 0,
      sign: signOf(lon),
      house: getHouse(lon, cusps),
    });
  }

  // Sノード（Nノード + 180°）
  const nNode = planets.find(p => p.id === 11);
  if (nNode) {
    const sLon = (nNode.lon + 180) % 360;
    planets.push({
      ...S_NODE,
      lon: sLon,
      speed: nNode.speed,
      retrograde: nNode.retrograde,
      sign: signOf(sLon),
      house: getHouse(sLon, cusps),
    });
  }

  // オプション天体
  const optBodies = options.optionalBodies || {};
  for (const ob of OPTIONAL_BODIES) {
    if (optBodies[ob.key]) {
      const r = swe.swe_calc_ut(jd, ob.id, CALC_FLAGS);
      const lon = r[0];
      const speed = r[3];
      planets.push({
        ...ob,
        lon,
        speed,
        retrograde: speed < 0,
        sign: signOf(lon),
        house: getHouse(lon, cusps),
      });
    }
  }

  return { planets, cusps, angles, jd };
}

/**
 * アスペクト一覧を生成
 * @param {Array} planets - calculateNatal の戻り値の planets
 * @param {number} orb - オーブ
 * @param {boolean} includeMinor - マイナーアスペクトを含むか
 * @returns {Array} [ { planet1, planet2, aspect, applying } ]
 */
export function calculateAspects(planets, orb = 5, includeMinor = false) {
  const results = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      const asp = getAspect(p1.lon, p2.lon, orb, includeMinor);
      if (asp) {
        const applying = isApplying(p1.lon, p2.lon, p1.speed, p2.speed, asp.angle);
        results.push({
          planet1: p1,
          planet2: p2,
          aspect: asp,
          applying,
        });
      }
    }
  }
  // オーブが小さい順にソート
  results.sort((a, b) => a.aspect.orb - b.aspect.orb);
  return results;
}

/**
 * 分布を集計
 * @param {Array} planets - 天体配列
 * @returns {object} { elements, modalities, hemispheres, houseTypes }
 */
export function calculateDistribution(planets) {
  // ノードは分布集計から除外する天体
  const countable = planets.filter(p => p.id !== 11 && p.id !== -1);

  const elements = { fire: [], earth: [], air: [], water: [] };
  const modalities = { cardinal: [], fixed: [], mutable: [] };

  for (const p of countable) {
    const sign = SIGNS[p.sign];
    elements[sign.element].push(p);

    if ([0, 3, 6, 9].includes(p.sign)) modalities.cardinal.push(p);
    else if ([1, 4, 7, 10].includes(p.sign)) modalities.fixed.push(p);
    else modalities.mutable.push(p);
  }

  // ハウス区分
  const houseTypes = { angular: [], succedent: [], cadent: [] };
  for (const p of countable) {
    if ([1, 4, 7, 10].includes(p.house)) houseTypes.angular.push(p);
    else if ([2, 5, 8, 11].includes(p.house)) houseTypes.succedent.push(p);
    else houseTypes.cadent.push(p);
  }

  // 半球
  const hemispheres = {
    upper: countable.filter(p => p.house >= 7 && p.house <= 12),
    lower: countable.filter(p => p.house >= 1 && p.house <= 6),
    east:  countable.filter(p => p.house >= 10 || p.house <= 3),
    west:  countable.filter(p => p.house >= 4 && p.house <= 9),
  };

  return { elements, modalities, houseTypes, hemispheres };
}

// ── トランジット計算 ──

/**
 * トランジット天体を計算（ハウスなし・天体位置のみ）
 * @param {object} params - { year, month, day, hour, minute, utcOffset }
 * @param {object} options - { optionalBodies: { chiron: bool, ... } }
 * @returns {object} { planets, jd }
 */
export function calculateTransitPlanets(params, options = {}) {
  const { year, month, day, hour, minute, utcOffset = 9 } = params;
  const utcHour = hour + minute / 60 - utcOffset;
  const jd = swe.swe_julday(year, month, day, utcHour, 1);

  const planets = [];

  for (const p of PLANETS) {
    const r = swe.swe_calc_ut(jd, p.id, CALC_FLAGS);
    const lon = r[0];
    const speed = r[3];
    planets.push({
      ...p,
      lon,
      speed,
      retrograde: speed < 0,
      sign: signOf(lon),
      house: null,
    });
  }

  // Sノード
  const nNode = planets.find(p => p.id === 11);
  if (nNode) {
    const sLon = (nNode.lon + 180) % 360;
    planets.push({
      ...S_NODE,
      lon: sLon,
      speed: nNode.speed,
      retrograde: nNode.retrograde,
      sign: signOf(sLon),
      house: null,
    });
  }

  // オプション天体
  const optBodies = options.optionalBodies || {};
  for (const ob of OPTIONAL_BODIES) {
    if (optBodies[ob.key]) {
      const r = swe.swe_calc_ut(jd, ob.id, CALC_FLAGS);
      const lon = r[0];
      const speed = r[3];
      planets.push({
        ...ob,
        lon,
        speed,
        retrograde: speed < 0,
        sign: signOf(lon),
        house: null,
      });
    }
  }

  return { planets, jd };
}

/**
 * クロスアスペクト（2セットの天体間）を計算
 * @param {Array} planets1 - 天体セット1（例: ネイタル）
 * @param {Array} planets2 - 天体セット2（例: トランジット）
 * @param {number} orb - オーブ
 * @param {boolean} includeMinor - マイナーアスペクトを含むか
 * @returns {Array} [ { planet1, planet2, aspect, applying } ]
 */
/**
 * クロスアスペクト（2セットの天体間）を計算
 * @param {Array} planets1 - 天体セット1（例: ネイタル）
 * @param {Array} planets2 - 天体セット2（例: トランジット）
 * @param {number} orb - オーブ
 * @param {boolean} includeMinor - マイナーアスペクトを含むか
 * @param {object} [angles] - ネイタルのアングル { asc, mc }（指定するとASC/MCへのアスペクトも検出）
 * @returns {Array} [ { planet1, planet2, aspect, applying } ]
 */
export function calculateCrossAspects(planets1, planets2, orb = 1, includeMinor = false, angles = null) {
  const results = [];
  for (const p1 of planets1) {
    for (const p2 of planets2) {
      const asp = getAspect(p1.lon, p2.lon, orb, includeMinor);
      if (asp) {
        const applying = isApplying(p1.lon, p2.lon, p1.speed, p2.speed, asp.angle);
        results.push({
          planet1: p1,
          planet2: p2,
          aspect: asp,
          applying,
        });
      }
    }
  }

  // ASC/MCへのアスペクト
  if (angles) {
    const anglePseudo = [
      { name: "ASC", glyph: "ASC", color: "#A0A0A0", lon: angles.asc, speed: 0, retrograde: false, sign: signOf(angles.asc), house: null, id: -10 },
      { name: "MC",  glyph: "MC",  color: "#A0A0A0", lon: angles.mc,  speed: 0, retrograde: false, sign: signOf(angles.mc),  house: null, id: -11 },
    ];
    for (const angle of anglePseudo) {
      for (const p2 of planets2) {
        const asp = getAspect(angle.lon, p2.lon, orb, includeMinor);
        if (asp) {
          const applying = isApplying(angle.lon, p2.lon, angle.speed, p2.speed, asp.angle);
          results.push({
            planet1: angle,
            planet2: p2,
            aspect: asp,
            applying,
          });
        }
      }
    }
  }

  results.sort((a, b) => a.aspect.orb - b.aspect.orb);
  return results;
}

// ── リターン計算 ──

/** 外惑星リスト（年間概要用） */
/** 逆行追跡対象（水星〜冥王星） */
const RETRO_PLANETS = [
  { id: 2, name: "水星" },
  { id: 3, name: "金星" },
  { id: 4, name: "火星" },
  { id: 5, name: "木星" },
  { id: 6, name: "土星" },
  { id: 7, name: "天王星" },
  { id: 8, name: "海王星" },
  { id: 9, name: "冥王星" },
];

/** トランジット天体リスト（年間概要用） */
const TRANSIT_PLANET_IDS = [
  { id: 5, name: "木星" },
  { id: 6, name: "土星" },
  { id: 7, name: "天王星" },
  { id: 8, name: "海王星" },
  { id: 9, name: "冥王星" },
];

/**
 * ルナリターンのJDを探索
 * @param {number} natalMoonLon - ネイタル月の黄経
 * @param {number} year - 年
 * @param {number} month - 月
 * @returns {number[]} リターンのJD配列（月に1-2回）
 */
export function findLunarReturns(natalMoonLon, year, month) {
  let jd = swe.swe_julday(year, month, 1, 0, 1);
  const endJd = swe.swe_julday(year, month + 1, 1, 0, 1);
  const returns = [];

  let prevDiff = null;
  for (; jd < endJd; jd += 0.25) {
    const r = swe.swe_calc_ut(jd, 1, CALC_FLAGS);
    let diff = r[0] - natalMoonLon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (prevDiff !== null && prevDiff < 0 && diff >= 0) {
      let lo = jd - 0.25, hi = jd;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        const rm = swe.swe_calc_ut(mid, 1, CALC_FLAGS);
        let d = rm[0] - natalMoonLon;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        if (d < 0) lo = mid;
        else hi = mid;
      }
      returns.push((lo + hi) / 2);
    }
    prevDiff = diff;
  }
  return returns;
}

/**
 * ソーラーリターンのJDを探索
 * @param {number} natalSunLon - ネイタル太陽の黄経
 * @param {number} year - 年
 * @param {number} natalMonth - 出生月
 * @param {number} natalDay - 出生日
 * @returns {number|null} リターンのJD
 */
export function findSolarReturn(natalSunLon, year, natalMonth, natalDay) {
  let jd = swe.swe_julday(year, natalMonth, natalDay - 2, 0, 1);
  const endJd = jd + 5;

  let prevDiff = null;
  for (; jd < endJd; jd += 0.25) {
    const r = swe.swe_calc_ut(jd, 0, CALC_FLAGS);
    let diff = r[0] - natalSunLon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (prevDiff !== null && prevDiff < 0 && diff >= 0) {
      let lo = jd - 0.25, hi = jd;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        const rm = swe.swe_calc_ut(mid, 0, CALC_FLAGS);
        let d = rm[0] - natalSunLon;
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

/**
 * JDからチャートを計算（リターン用）
 * @param {number} jd - ユリウス日
 * @param {object} params - { lat, lng, houseSystem }
 * @param {object} options - { optionalBodies }
 * @returns {object} { planets, cusps, angles, jd }
 */
export function calculateChartFromJd(jd, params, options = {}) {
  const { lat, lng, houseSystem = "P" } = params;

  const houseResult = swe.swe_houses(jd, lat, lng, houseSystem);
  const cusps = houseResult.cusps;
  const angles = {
    asc: cusps[1],
    mc: houseResult.ascmc[1],
    dsc: (cusps[1] + 180) % 360,
    ic: (houseResult.ascmc[1] + 180) % 360,
  };

  const planets = [];

  for (const p of PLANETS) {
    const r = swe.swe_calc_ut(jd, p.id, CALC_FLAGS);
    const lon = r[0];
    const speed = r[3];
    planets.push({
      ...p,
      lon,
      speed,
      retrograde: speed < 0,
      sign: signOf(lon),
      house: getHouse(lon, cusps),
    });
  }

  const nNode = planets.find(p => p.id === 11);
  if (nNode) {
    const sLon = (nNode.lon + 180) % 360;
    planets.push({
      ...S_NODE,
      lon: sLon,
      speed: nNode.speed,
      retrograde: nNode.retrograde,
      sign: signOf(sLon),
      house: getHouse(sLon, cusps),
    });
  }

  const optBodies = options.optionalBodies || {};
  for (const ob of OPTIONAL_BODIES) {
    if (optBodies[ob.key]) {
      const r = swe.swe_calc_ut(jd, ob.id, CALC_FLAGS);
      const lon = r[0];
      const speed = r[3];
      planets.push({
        ...ob,
        lon,
        speed,
        retrograde: speed < 0,
        sign: signOf(lon),
        house: getHouse(lon, cusps),
      });
    }
  }

  return { planets, cusps, angles, jd };
}

/**
 * JDをローカル日時文字列に変換
 * @param {number} jd - ユリウス日（UTC）
 * @param {number} utcOffset - UTCオフセット（時間）
 * @returns {object} { year, month, day, hour, minute, dateStr, timeStr, tzLabel }
 */
export function jdToLocalDateTime(jd, utcOffset) {
  const localJd = jd + utcOffset / 24;
  const dt = swe.swe_revjul(localJd, 1);
  const h = Math.floor(dt.hour);
  const m = Math.floor((dt.hour - h) * 60);
  const tzLabel = utcOffset === 9 ? "JST" : `UTC${utcOffset >= 0 ? "+" : ""}${utcOffset}`;
  return {
    year: dt.year,
    month: dt.month,
    day: dt.day,
    hour: h,
    minute: m,
    dateStr: `${dt.year}-${String(dt.month).padStart(2, "0")}-${String(dt.day).padStart(2, "0")}`,
    timeStr: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    tzLabel,
  };
}

/** JDを日付文字列に変換（年間概要用） */
function jdToDate(jd) {
  const dt = swe.swe_revjul(jd, 1);
  return `${dt.month}/${dt.day}`;
}

/**
 * 年間概要を計算（SR期間内の逆行・イングレス・トランジット）
 * @param {number} startJd - SR開始JD
 * @param {number} endJd - 次のSR開始JD
 * @param {Array} natalPlanets - ネイタル天体配列
 * @param {object} natalAngles - { asc, mc }
 * @param {number} transitOrb - トランジットオーブ
 * @returns {object} { retrograde, ingresses, angleTransits, planetTransits }
 */
export function calcYearlyRange(startJd, endJd, natalPlanets, natalAngles, transitOrb = 1) {
  const retrograde = {};
  for (const p of RETRO_PLANETS) {
    retrograde[p.id] = { name: p.name, periods: [], inRetro: false, start: null };
  }

  const ingresses = [];
  const prevSigns = {};

  const transitAspects = {};
  for (const tp of TRANSIT_PLANET_IDS) {
    for (const n of natalPlanets) {
      if (n.id === 11 || n.id === -1) continue; // ノード除外
      const key = `t.${tp.name}→n.${n.name}`;
      transitAspects[key] = { periods: [], inAspect: false, start: null, symbol: null, house: n.house };
    }
  }

  const angleTransits = {
    ASC: { lon: natalAngles.asc, periods: [], current: {} },
    MC:  { lon: natalAngles.mc,  periods: [], current: {} },
  };
  for (const tp of TRANSIT_PLANET_IDS) {
    angleTransits.ASC.current[tp.name] = { inAspect: false, start: null, symbol: null };
    angleTransits.MC.current[tp.name]  = { inAspect: false, start: null, symbol: null };
  }

  for (let jd = startJd; jd <= endJd; jd += 1) {
    // 逆行チェック（水星〜冥王星）
    for (const p of RETRO_PLANETS) {
      const r = swe.swe_calc_ut(jd, p.id, CALC_FLAGS);
      const lon = r[0], spd = r[3];

      const retro = retrograde[p.id];
      if (spd < 0 && !retro.inRetro) {
        retro.inRetro = true;
        retro.start = jd;
      } else if (spd >= 0 && retro.inRetro) {
        retro.inRetro = false;
        retro.periods.push([retro.start, jd]);
      }

      // イングレスは外惑星（木星〜冥王星）のみ
      if (p.id >= 5) {
        const sign = signOf(lon);
        if (prevSigns[p.id] !== undefined && prevSigns[p.id] !== sign) {
          ingresses.push({ jd, name: p.name, sign });
        }
        prevSigns[p.id] = sign;
      }
    }

    for (const tp of TRANSIT_PLANET_IDS) {
      const tr = swe.swe_calc_ut(jd, tp.id, CALC_FLAGS);
      const tLon = tr[0];

      for (const n of natalPlanets) {
        if (n.id === 11 || n.id === -1) continue;
        const key = `t.${tp.name}→n.${n.name}`;
        const asp = getAspect(tLon, n.lon, transitOrb);
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

      for (const angleName of ["ASC", "MC"]) {
        const angle = angleTransits[angleName];
        const asp = getAspect(tLon, angle.lon, transitOrb);
        const cur = angle.current[tp.name];

        if (asp && !cur.inAspect) {
          cur.inAspect = true;
          cur.start = jd;
          cur.symbol = asp.symbol;
        } else if (!asp && cur.inAspect) {
          cur.inAspect = false;
          angle.periods.push({ planet: tp.name, start: cur.start, end: jd, symbol: cur.symbol });
        }
      }
    }
  }

  // 期間末に未閉じのものを閉じる
  for (const p of RETRO_PLANETS) {
    const retro = retrograde[p.id];
    if (retro.inRetro) retro.periods.push([retro.start, endJd]);
  }
  for (const key of Object.keys(transitAspects)) {
    const ta = transitAspects[key];
    if (ta.inAspect) ta.periods.push({ start: ta.start, end: endJd, symbol: ta.symbol });
  }
  for (const angleName of ["ASC", "MC"]) {
    for (const tp of TRANSIT_PLANET_IDS) {
      const cur = angleTransits[angleName].current[tp.name];
      if (cur.inAspect) {
        angleTransits[angleName].periods.push({ planet: tp.name, start: cur.start, end: endJd, symbol: cur.symbol });
      }
    }
  }

  return { retrograde, ingresses, angleTransits, transitAspects, jdToDate };
}

/**
 * 年間概要をテキスト化
 */
export function formatYearlyRangeText(yearlyData) {
  const { retrograde, ingresses, angleTransits, transitAspects, jdToDate: toDate } = yearlyData;
  const lines = [];

  lines.push("■ 逆行期間");
  for (const p of RETRO_PLANETS) {
    const retro = retrograde[p.id];
    if (retro.periods.length === 0) {
      lines.push(`${retro.name}: なし`);
    } else {
      const ps = retro.periods.map(([s, e]) => `${toDate(s)}-${toDate(e)}`).join(", ");
      lines.push(`${retro.name}: ${ps}`);
    }
  }

  lines.push("");
  lines.push("■ 星座イングレス");
  if (ingresses.length === 0) {
    lines.push("なし");
  } else {
    for (const ing of ingresses) {
      lines.push(`${ing.name}: ${toDate(ing.jd)} ${SIGNS[ing.sign].fullName}入り`);
    }
  }

  lines.push("");
  lines.push("■ ASC/MCへのトランジット");
  let hasAngleTransit = false;
  for (const angleName of ["ASC", "MC"]) {
    const angle = angleTransits[angleName];
    if (angle.periods.length > 0) {
      hasAngleTransit = true;
      for (const p of angle.periods) {
        lines.push(`t.${p.planet}${p.symbol}n.${angleName}: ${toDate(p.start)}-${toDate(p.end)}`);
      }
    }
  }
  if (!hasAngleTransit) lines.push("なし");

  lines.push("");
  lines.push("■ ネイタル天体へのトランジット");
  let hasTransit = false;
  for (const tp of TRANSIT_PLANET_IDS) {
    const keys = Object.keys(transitAspects).filter(k => k.startsWith(`t.${tp.name}→`));
    for (const key of keys) {
      const ta = transitAspects[key];
      if (ta.periods.length > 0) {
        hasTransit = true;
        const ps = ta.periods.map(p => `${p.symbol}${toDate(p.start)}-${toDate(p.end)}`).join(", ");
        lines.push(`${key}(${ta.house}H): ${ps}`);
      }
    }
  }
  if (!hasTransit) lines.push("なし");

  return lines.join("\n");
}

// ── テキスト出力 ──

/**
 * ネイタルチャートのテキストコピー用文字列を生成
 */
export function formatNatalText(params, chartData, aspects, houseSystemName = "プラシーダス") {
  const { year, month, day, hour, minute } = params;
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const locLabel = params.locationLabel || "";

  const lines = [];
  lines.push(`【ネイタル】${dateStr} ${timeStr} ${locLabel}`);
  lines.push(`ハウス: ${houseSystemName}`);
  lines.push("");

  // 天体位置
  for (const p of chartData.planets) {
    const retro = p.retrograde ? " R" : "";
    lines.push(`${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`);
  }
  lines.push("");

  // アングル
  lines.push(`ASC ${fmtText(chartData.angles.asc)} / MC ${fmtText(chartData.angles.mc)}`);
  lines.push("");

  // アスペクト
  lines.push("■ アスペクト");
  const aspTexts = aspects.map(a => {
    const orbStr = Math.round(a.aspect.orb * 10) / 10;
    return `${a.planet1.name}${a.aspect.symbol}${a.planet2.name}(${orbStr}°)`;
  });
  lines.push(aspTexts.join(" / "));
  lines.push("");

  // 分布
  const dist = calculateDistribution(chartData.planets);
  lines.push("■ 分布");
  lines.push(`4元素: 火${dist.elements.fire.length} 地${dist.elements.earth.length} 風${dist.elements.air.length} 水${dist.elements.water.length}`);
  lines.push(`3区分: 活動${dist.modalities.cardinal.length} 不動${dist.modalities.fixed.length} 柔軟${dist.modalities.mutable.length}`);
  lines.push(`半球: 上${dist.hemispheres.upper.length} 下${dist.hemispheres.lower.length} 東${dist.hemispheres.east.length} 西${dist.hemispheres.west.length}`);

  return lines.join("\n");
}

/**
 * トランジットチャートのテキストコピー用文字列を生成
 */
export function formatTransitText(natalParams, natalChart, transitParams, transitPlanets, crossAspects, houseSystemName = "プラシーダス") {
  const lines = [];

  // ネイタル情報
  const nd = natalParams;
  const nDateStr = `${nd.year}-${String(nd.month).padStart(2, "0")}-${String(nd.day).padStart(2, "0")}`;
  const nTimeStr = `${String(nd.hour).padStart(2, "0")}:${String(nd.minute).padStart(2, "0")}`;
  lines.push(`【トランジット】`);
  lines.push(`ネイタル: ${nDateStr} ${nTimeStr} ${nd.locationLabel || ""}`);

  // トランジット日時
  const td = transitParams;
  const tDateStr = `${td.year}-${String(td.month).padStart(2, "0")}-${String(td.day).padStart(2, "0")}`;
  const tTimeStr = `${String(td.hour).padStart(2, "0")}:${String(td.minute).padStart(2, "0")}`;
  lines.push(`トランジット: ${tDateStr} ${tTimeStr}`);
  lines.push(`ハウス: ${houseSystemName}`);
  lines.push("");

  // ネイタル天体
  lines.push("■ ネイタル天体");
  for (const p of natalChart.planets) {
    const retro = p.retrograde ? " R" : "";
    lines.push(`${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`);
  }
  lines.push("");
  lines.push(`ASC ${fmtText(natalChart.angles.asc)} / MC ${fmtText(natalChart.angles.mc)}`);
  lines.push("");

  // トランジット天体
  lines.push("■ トランジット天体");
  for (const p of transitPlanets) {
    const retro = p.retrograde ? " R" : "";
    lines.push(`${p.name} ${fmtText(p.lon)}${retro}`);
  }
  lines.push("");

  // クロスアスペクト
  lines.push("■ トランジットアスペクト（T→N）");
  const aspTexts = crossAspects.map(a => {
    const orbStr = Math.round(a.aspect.orb * 10) / 10;
    return `T.${a.planet2.name}${a.aspect.symbol}N.${a.planet1.name}(${orbStr}°)`;
  });
  lines.push(aspTexts.join(" / "));

  return lines.join("\n");
}

/**
 * シナストリーのテキストコピー用文字列を生成
 */
export function formatSynastryText(paramsA, chartA, paramsB, chartB, crossAspects, houseSystemName = "プラシーダス") {
  const lines = [];

  const fmtDate = (p) => {
    return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")} ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  };

  const nameA = paramsA.name || "Person A";
  const nameB = paramsB.name || "Person B";

  lines.push(`【シナストリー】`);
  lines.push(`A: ${nameA} — ${fmtDate(paramsA)} ${paramsA.locationLabel || ""}`);
  lines.push(`B: ${nameB} — ${fmtDate(paramsB)} ${paramsB.locationLabel || ""}`);
  lines.push(`ハウス: ${houseSystemName}`);
  lines.push("");

  // Person A 天体
  lines.push(`■ ${nameA} 天体`);
  for (const p of chartA.planets) {
    const retro = p.retrograde ? " R" : "";
    lines.push(`${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`);
  }
  lines.push("");
  lines.push(`ASC ${fmtText(chartA.angles.asc)} / MC ${fmtText(chartA.angles.mc)}`);
  lines.push("");

  // Person B 天体
  lines.push(`■ ${nameB} 天体`);
  for (const p of chartB.planets) {
    const retro = p.retrograde ? " R" : "";
    lines.push(`${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`);
  }
  lines.push("");
  lines.push(`ASC ${fmtText(chartB.angles.asc)} / MC ${fmtText(chartB.angles.mc)}`);
  lines.push("");

  // クロスアスペクト
  lines.push("■ クロスアスペクト（A↔B）");
  const aspTexts = crossAspects.map(a => {
    const orbStr = Math.round(a.aspect.orb * 10) / 10;
    return `A.${a.planet1.name}${a.aspect.symbol}B.${a.planet2.name}(${orbStr}°)`;
  });
  lines.push(aspTexts.join(" / "));

  return lines.join("\n");
}

/**
 * ルナリターンのテキストコピー用文字列を生成
 */
export function formatLunarReturnText(natalChart, returnChart, returnDateTime, locationLabel, crossAspects, houseSystemName = "プラシーダス") {
  const lines = [];

  lines.push(`【ルナリターン】${returnDateTime.dateStr} ${returnDateTime.timeStr} ${returnDateTime.tzLabel}`);
  lines.push(`場所: ${locationLabel}`);

  const natalMoon = natalChart.planets.find(p => p.id === 1);
  if (natalMoon) lines.push(`ネイタル月: ${fmtText(natalMoon.lon)}`);
  lines.push(`ハウス: ${houseSystemName}`);
  lines.push("");

  lines.push("■ 天体");
  for (const p of returnChart.planets) {
    const retro = p.retrograde ? " R" : "";
    lines.push(`${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`);
  }
  lines.push("");
  lines.push(`ASC ${fmtText(returnChart.angles.asc)} / MC ${fmtText(returnChart.angles.mc)}`);
  lines.push("");

  lines.push("■ ネイタルへのアスペクト");
  if (crossAspects.length === 0) {
    lines.push("なし");
  } else {
    const aspTexts2 = crossAspects.map(a => {
      const orbStr = Math.round(a.aspect.orb * 10) / 10;
      return `LR.${a.planet2.name}${a.aspect.symbol}N.${a.planet1.name}(${orbStr}°)`;
    });
    lines.push(aspTexts2.join(" / "));
  }

  return lines.join("\n");
}

/**
 * ソーラーリターンのテキストコピー用文字列を生成
 */
export function formatSolarReturnText(natalChart, returnChart, returnDateTime, locationLabel, crossAspects, houseSystemName = "プラシーダス") {
  const lines = [];

  lines.push(`【ソーラーリターン】${returnDateTime.dateStr} ${returnDateTime.timeStr} ${returnDateTime.tzLabel}`);
  lines.push(`場所: ${locationLabel}`);

  const natalSun = natalChart.planets.find(p => p.id === 0);
  if (natalSun) lines.push(`ネイタル太陽: ${fmtText(natalSun.lon)}`);
  lines.push(`ハウス: ${houseSystemName}`);
  lines.push("");

  lines.push("■ 天体");
  for (const p of returnChart.planets) {
    const retro = p.retrograde ? " R" : "";
    lines.push(`${p.name} ${fmtText(p.lon)} (${p.house}H)${retro}`);
  }
  lines.push("");
  lines.push(`ASC ${fmtText(returnChart.angles.asc)} / MC ${fmtText(returnChart.angles.mc)}`);
  lines.push("");

  lines.push("■ ネイタルへのアスペクト");
  if (crossAspects.length === 0) {
    lines.push("なし");
  } else {
    const aspTexts2 = crossAspects.map(a => {
      const orbStr = Math.round(a.aspect.orb * 10) / 10;
      return `SR.${a.planet2.name}${a.aspect.symbol}N.${a.planet1.name}(${orbStr}°)`;
    });
    lines.push(aspTexts2.join(" / "));
  }

  return lines.join("\n");
}
