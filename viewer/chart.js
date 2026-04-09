/**
 * Astro Viewer - SVGホイール描画モジュール
 *
 * viewBox: 0 0 600 600 / 中心 (300, 300)
 * ASC を左端（9時方向）に固定し、反時計回りに黄経を配置。
 */

import { SIGNS, ASPECTS, MINOR_ASPECTS } from "./calc.js";

// ── 定数 ──

const CX = 300, CY = 300;

// 半径
const R_OUTER      = 270;  // 外周の外側（ラベル用に余白確保）
const R_SIGN_INNER = 240;  // サイン帯の内側 = ハウス帯の外側
const R_HOUSE_NUM  = 205;  // ハウス番号の配置
const R_PLANET     = 185;  // 天体グリフの基準
const R_DEGREE     = 165;  // 度数テキストの基準
const R_INNER      = 130;  // ハウス線の内側端
const R_ASPECT     = 125;  // アスペクト線の半径

// 四元素色（ダーク/ライトは CSS 変数で制御するが、SVG 内は直接指定）
const ELEMENT_COLORS_DARK = {
  fire:  "#8B2500",
  earth: "#8B7500",
  air:   "#2E5B2E",
  water: "#1A3A5C",
};
const ELEMENT_COLORS_LIGHT = {
  fire:  "#FFE4E1",
  earth: "#FFF9E6",
  air:   "#E8F5E9",
  water: "#E3F2FD",
};

// ── ヘルパー ──

const SVG_NS = "http://www.w3.org/2000/svg";

function degToRad(deg) { return deg * Math.PI / 180; }

/**
 * 黄経 → ホイール上の角度（度）
 * ASC を左端（180°）に固定。黄経が増えると反時計回り。
 * SVG座標系（y下向き）で反時計回り = 角度が減少する方向。
 */
function toWheelAngle(lon, ascLon) {
  return 180 - (lon - ascLon);
}

/** ホイール角度（度）→ SVG座標。角度0°=右、時計回り。 */
function polarToXY(angleDeg, radius) {
  const rad = degToRad(angleDeg);
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

/** 円弧パスの d 属性を生成（大きい弧は largeArc=1） */
function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToXY(startAngle, r);
  const end = polarToXY(endAngle, r);
  // 弧の方向: 反時計回り（sweep=0）
  let sweep = 0;
  let largeArc = 0;
  let diff = startAngle - endAngle;
  if (diff < 0) diff += 360;
  if (diff > 180) largeArc = 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

// ── 描画関数群 ──

/** 12サインの外周帯を描画 */
function drawSignBand(group, ascLon, isDark) {
  const colors = isDark ? ELEMENT_COLORS_DARK : ELEMENT_COLORS_LIGHT;

  for (let i = 0; i < 12; i++) {
    const sign = SIGNS[i];
    const startLon = i * 30;
    const endLon = (i + 1) * 30;

    const startAngle = toWheelAngle(startLon, ascLon);
    const endAngle = toWheelAngle(endLon, ascLon);

    // 扇形パス（外周→内周の円弧）
    const outerStart = polarToXY(startAngle, R_OUTER);
    const outerEnd = polarToXY(endAngle, R_OUTER);
    const innerStart = polarToXY(startAngle, R_SIGN_INNER);
    const innerEnd = polarToXY(endAngle, R_SIGN_INNER);

    // 30°の扇形を描く。角度差が小さいので largeArc=0。
    // sweep方向: startAngle→endAngleの回転方向に合わせる。
    // SVG y下向き座標で、角度が減る方向=反時計回り=sweep 0、増える方向=時計回り=sweep 1。
    let angleDelta = endAngle - startAngle;
    if (angleDelta > 180) angleDelta -= 360;
    if (angleDelta < -180) angleDelta += 360;
    const outerSweep = angleDelta > 0 ? 1 : 0;
    const innerSweep = angleDelta > 0 ? 0 : 1;

    const d = `M ${outerStart.x} ${outerStart.y}
               A ${R_OUTER} ${R_OUTER} 0 0 ${outerSweep} ${outerEnd.x} ${outerEnd.y}
               L ${innerEnd.x} ${innerEnd.y}
               A ${R_SIGN_INNER} ${R_SIGN_INNER} 0 0 ${innerSweep} ${innerStart.x} ${innerStart.y}
               Z`;

    const path = createSvgElement("path", {
      d,
      fill: colors[sign.element],
      stroke: isDark ? "#444" : "#bbb",
      "stroke-width": "0.5",
    });
    group.appendChild(path);

    // サイングリフ
    const midAngle = toWheelAngle(startLon + 15, ascLon);
    const glyphPos = polarToXY(midAngle, (R_OUTER + R_SIGN_INNER) / 2);
    const text = createSvgElement("text", {
      x: glyphPos.x,
      y: glyphPos.y,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: isDark ? "#ddd" : "#555",
      "font-size": "18",
      "font-weight": "bold",
    });
    text.textContent = sign.glyph;
    group.appendChild(text);
  }
}

/** ハウス分割線とハウス番号を描画 */
function drawHouses(group, cusps, ascLon, isDark) {
  for (let i = 1; i <= 12; i++) {
    const cuspLon = cusps[i];
    const angle = toWheelAngle(cuspLon, ascLon);

    // ハウスカスプ線
    const outer = polarToXY(angle, R_SIGN_INNER);
    const inner = polarToXY(angle, R_INNER);

    const isAngle = (i === 1 || i === 4 || i === 7 || i === 10);
    const line = createSvgElement("line", {
      x1: outer.x, y1: outer.y,
      x2: inner.x, y2: inner.y,
      stroke: isDark ? (isAngle ? "#888" : "#444") : (isAngle ? "#888" : "#ccc"),
      "stroke-width": isAngle ? "2" : "0.8",
    });
    group.appendChild(line);

    // ハウス番号（カスプ間の中央に配置）
    const nextCusp = i === 12 ? cusps[1] : cusps[i + 1];
    let midLon = cuspLon + ((nextCusp - cuspLon + 360) % 360) / 2;
    if (midLon >= 360) midLon -= 360;
    const midAngle = toWheelAngle(midLon, ascLon);
    const numPos = polarToXY(midAngle, R_HOUSE_NUM);
    const numText = createSvgElement("text", {
      x: numPos.x,
      y: numPos.y,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: isDark ? "#666" : "#aaa",
      "font-size": "11",
    });
    numText.textContent = i;
    group.appendChild(numText);
  }
}

/** ASC/DSC/MC/IC のラベルを描画 */
function drawAngleLabels(group, angles, ascLon, isDark) {
  const labels = [
    { name: "ASC", lon: angles.asc },
    { name: "DSC", lon: angles.dsc },
    { name: "MC",  lon: angles.mc },
    { name: "IC",  lon: angles.ic },
  ];

  for (const lbl of labels) {
    const angle = toWheelAngle(lbl.lon, ascLon);
    const pos = polarToXY(angle, R_OUTER + 18);
    const text = createSvgElement("text", {
      x: pos.x,
      y: pos.y,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: isDark ? "#aaa" : "#666",
      "font-size": "11",
      "font-weight": "bold",
    });
    text.textContent = lbl.name;
    group.appendChild(text);
  }
}

/**
 * 天体の重なり回避
 * 1. 角度でソートし隣接ペアを押し合って最低間隔を確保
 * 2. それでも近い天体は内側トラック（段）に振り分ける
 */
function resolveCollisions(planets, ascLon) {
  const MIN_GAP = 8; // 最低角度間隔（度）

  const items = planets.map(p => ({
    ...p,
    wheelAngle: ((toWheelAngle(p.lon, ascLon) % 360) + 360) % 360,
    displayAngle: null,
    track: 0, // 0=外側, 1=内側
  }));
  items.sort((a, b) => a.wheelAngle - b.wheelAngle);

  for (const item of items) {
    item.displayAngle = item.wheelAngle;
  }

  // パス1: 角度の押し合い
  for (let pass = 0; pass < 15; pass++) {
    let adjusted = false;
    for (let i = 0; i < items.length; i++) {
      const j = (i + 1) % items.length;
      let diff = items[j].displayAngle - items[i].displayAngle;
      if (diff < 0) diff += 360;
      if (diff > 180) continue;
      if (diff < MIN_GAP) {
        const shift = (MIN_GAP - diff) / 2 + 0.2;
        items[i].displayAngle = ((items[i].displayAngle - shift) % 360 + 360) % 360;
        items[j].displayAngle = ((items[j].displayAngle + shift) % 360 + 360) % 360;
        adjusted = true;
      }
    }
    if (!adjusted) break;
  }

  // パス2: まだ近い隣接ペアは交互にトラックを振り分け
  for (let i = 0; i < items.length; i++) {
    const j = (i + 1) % items.length;
    let diff = items[j].displayAngle - items[i].displayAngle;
    if (diff < 0) diff += 360;
    if (diff > 180) continue;
    if (diff < MIN_GAP * 1.2) {
      // 同じトラックにいる場合、片方を内側へ
      if (items[i].track === items[j].track) {
        items[j].track = 1;
      }
    }
  }

  return items;
}

// トラックごとの半径オフセット
const TRACK_OFFSETS = [0, -25];

/** 天体グリフと度数を描画 */
function drawPlanets(group, planets, ascLon, isDark) {
  const resolved = resolveCollisions(planets, ascLon);

  for (const p of resolved) {
    const displayAngle = p.displayAngle;
    const actualAngle = p.wheelAngle;
    const trackOff = TRACK_OFFSETS[p.track] || 0;
    const glyphR = R_PLANET + trackOff;

    // 実位置のドット（小さい丸）
    const dotPos = polarToXY(actualAngle, R_SIGN_INNER - 3);
    const dot = createSvgElement("circle", {
      cx: dotPos.x, cy: dotPos.y, r: "3.5",
      fill: p.color,
    });
    group.appendChild(dot);

    // 接続線（ドットからグリフへ）
    const angleDiff = Math.abs(displayAngle - actualAngle);
    if (angleDiff > 2 && angleDiff < 358) {
      const lineStart = polarToXY(actualAngle, R_SIGN_INNER - 5);
      const lineEnd = polarToXY(displayAngle, glyphR + 8);
      const connector = createSvgElement("line", {
        x1: lineStart.x, y1: lineStart.y,
        x2: lineEnd.x, y2: lineEnd.y,
        stroke: p.color,
        "stroke-width": "0.5",
        opacity: "0.4",
      });
      group.appendChild(connector);
    }

    // グリフ
    const glyphPos = polarToXY(displayAngle, glyphR);
    const glyph = createSvgElement("text", {
      x: glyphPos.x,
      y: glyphPos.y,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: p.color,
      "font-size": "13",
      "font-weight": "bold",
    });
    glyph.textContent = p.glyph + (p.retrograde ? "" : "");
    group.appendChild(glyph);

    // 逆行マーク（グリフのすぐ横）
    if (p.retrograde) {
      const retro = createSvgElement("text", {
        x: glyphPos.x + 9,
        y: glyphPos.y - 4,
        "text-anchor": "start",
        "dominant-baseline": "central",
        fill: "#e74c3c",
        "font-size": "6",
        "font-weight": "bold",
      });
      retro.textContent = "R";
      group.appendChild(retro);
    }

    // 度数（グリフから13px内側、同じ角度の放射方向）
    const d = Math.floor(p.lon % 30);
    const m = Math.floor((p.lon % 1) * 60);
    const degPos = polarToXY(displayAngle, glyphR - 14);
    const degText = createSvgElement("text", {
      x: degPos.x,
      y: degPos.y,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: isDark ? "#999" : "#888",
      "font-size": "7",
    });
    degText.textContent = `${d}°${String(m).padStart(2, "0")}'`;
    group.appendChild(degText);
  }
}

/** アスペクト線を描画 */
function drawAspectLines(group, aspects, ascLon) {
  for (const a of aspects) {
    const angle1 = toWheelAngle(a.planet1.lon, ascLon);
    const angle2 = toWheelAngle(a.planet2.lon, ascLon);

    const p1 = polarToXY(angle1, R_ASPECT);
    const p2 = polarToXY(angle2, R_ASPECT);

    // オーブが小さいほど濃く
    const maxOrb = 5;
    const opacity = Math.max(0.2, 1 - (a.aspect.orb / maxOrb) * 0.7);

    const line = createSvgElement("line", {
      x1: p1.x, y1: p1.y,
      x2: p2.x, y2: p2.y,
      stroke: a.aspect.color,
      "stroke-width": a.aspect.orb < 1 ? "1.5" : "1",
      opacity: String(opacity),
    });
    group.appendChild(line);
  }
}

/** 内側の基準円を描画 */
function drawBaseCircles(group, isDark) {
  const circles = [R_OUTER, R_SIGN_INNER, R_INNER];
  for (const r of circles) {
    const circle = createSvgElement("circle", {
      cx: CX, cy: CY, r,
      fill: "none",
      stroke: isDark ? "#444" : "#ccc",
      "stroke-width": r === R_OUTER ? "1.5" : "1",
    });
    group.appendChild(circle);
  }
}

// ── 二重円用の定数 ──

const D_R_OUTER       = 270;
const D_R_SIGN_INNER  = 240;
const D_R_OUTER_PLANET = 218;  // 外輪天体グリフ
const D_R_OUTER_DEGREE = 204;  // 外輪度数
const D_R_DIVIDER     = 192;   // 内外の仕切り円
const D_R_INNER_PLANET = 170;  // 内輪天体グリフ
const D_R_INNER_DEGREE = 156;  // 内輪度数
const D_R_HOUSE_NUM   = 142;   // ハウス番号
const D_R_INNER       = 118;   // ハウス線内端
const D_R_ASPECT      = 113;   // アスペクト線

/** 二重円用の重なり回避 */
function resolveCollisionsDouble(planets, ascLon, planetR) {
  const MIN_GAP = 9;

  const items = planets.map(p => ({
    ...p,
    wheelAngle: ((toWheelAngle(p.lon, ascLon) % 360) + 360) % 360,
    displayAngle: null,
    track: 0,
  }));
  items.sort((a, b) => a.wheelAngle - b.wheelAngle);

  for (const item of items) {
    item.displayAngle = item.wheelAngle;
  }

  for (let pass = 0; pass < 15; pass++) {
    let adjusted = false;
    for (let i = 0; i < items.length; i++) {
      const j = (i + 1) % items.length;
      let diff = items[j].displayAngle - items[i].displayAngle;
      if (diff < 0) diff += 360;
      if (diff > 180) continue;
      if (diff < MIN_GAP) {
        const shift = (MIN_GAP - diff) / 2 + 0.2;
        items[i].displayAngle = ((items[i].displayAngle - shift) % 360 + 360) % 360;
        items[j].displayAngle = ((items[j].displayAngle + shift) % 360 + 360) % 360;
        adjusted = true;
      }
    }
    if (!adjusted) break;
  }

  return items;
}

/** 二重円の天体描画（内輪 or 外輪） */
function drawPlanetsDouble(group, planets, ascLon, isDark, planetR, degreeR, dotR, isOuter, outerColor) {
  const resolved = resolveCollisionsDouble(planets, ascLon, planetR);
  const dotColor = isOuter ? (outerColor || "#4A90D9") : (isDark ? "#ccc" : "#666");

  for (const p of resolved) {
    const displayAngle = p.displayAngle;
    const actualAngle = p.wheelAngle;

    // 実位置ドット
    const dotPos = polarToXY(actualAngle, dotR);
    const dot = createSvgElement("circle", {
      cx: dotPos.x, cy: dotPos.y, r: isOuter ? "3" : "3",
      fill: isOuter ? dotColor : p.color,
    });
    group.appendChild(dot);

    // 接続線
    const angleDiff = Math.abs(displayAngle - actualAngle);
    if (angleDiff > 2 && angleDiff < 358) {
      const lineStart = polarToXY(actualAngle, dotR + (isOuter ? -2 : 2));
      const lineEnd = polarToXY(displayAngle, planetR + 8);
      const connector = createSvgElement("line", {
        x1: lineStart.x, y1: lineStart.y,
        x2: lineEnd.x, y2: lineEnd.y,
        stroke: isOuter ? dotColor : p.color,
        "stroke-width": "0.5",
        opacity: "0.3",
      });
      group.appendChild(connector);
    }

    // グリフ
    const glyphPos = polarToXY(displayAngle, planetR);
    const glyph = createSvgElement("text", {
      x: glyphPos.x,
      y: glyphPos.y,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: isOuter ? dotColor : p.color,
      "font-size": "11",
      "font-weight": "bold",
    });
    glyph.textContent = p.glyph;
    group.appendChild(glyph);

    // 逆行マーク
    if (p.retrograde) {
      const retro = createSvgElement("text", {
        x: glyphPos.x + 8,
        y: glyphPos.y - 3,
        "text-anchor": "start",
        "dominant-baseline": "central",
        fill: "#e74c3c",
        "font-size": "5",
        "font-weight": "bold",
      });
      retro.textContent = "R";
      group.appendChild(retro);
    }

    // 度数
    const d = Math.floor(p.lon % 30);
    const m = Math.floor((p.lon % 1) * 60);
    const degPos = polarToXY(displayAngle, degreeR);
    const degText = createSvgElement("text", {
      x: degPos.x,
      y: degPos.y,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: isDark ? "#777" : "#999",
      "font-size": "6",
    });
    degText.textContent = `${d}°${String(m).padStart(2, "0")}'`;
    group.appendChild(degText);
  }
}

/** 二重円のアスペクト線（クロスアスペクト） */
function drawCrossAspectLines(group, crossAspects, ascLon) {
  for (const a of crossAspects) {
    // planet1 = ネイタル（内側）、planet2 = トランジット/相手（外側）
    const angle1 = toWheelAngle(a.planet1.lon, ascLon);
    const angle2 = toWheelAngle(a.planet2.lon, ascLon);

    const p1 = polarToXY(angle1, D_R_ASPECT);
    const p2 = polarToXY(angle2, D_R_ASPECT);

    const maxOrb = 3;
    const opacity = Math.max(0.2, 1 - (a.aspect.orb / maxOrb) * 0.7);

    const line = createSvgElement("line", {
      x1: p1.x, y1: p1.y,
      x2: p2.x, y2: p2.y,
      stroke: a.aspect.color,
      "stroke-width": a.aspect.orb < 0.5 ? "1.5" : "1",
      opacity: String(opacity),
    });
    group.appendChild(line);
  }
}

/** 二重円の基準円 */
function drawDoubleBaseCircles(group, isDark) {
  const circles = [
    { r: D_R_OUTER, w: "1.5" },
    { r: D_R_SIGN_INNER, w: "1" },
    { r: D_R_DIVIDER, w: "0.8" },
    { r: D_R_INNER, w: "1" },
  ];
  for (const c of circles) {
    const circle = createSvgElement("circle", {
      cx: CX, cy: CY, r: c.r,
      fill: "none",
      stroke: isDark ? "#444" : "#ccc",
      "stroke-width": c.w,
    });
    group.appendChild(circle);
  }
}

/** 二重円のハウス描画 */
function drawHousesDouble(group, cusps, ascLon, isDark) {
  for (let i = 1; i <= 12; i++) {
    const cuspLon = cusps[i];
    const angle = toWheelAngle(cuspLon, ascLon);

    const outer = polarToXY(angle, D_R_SIGN_INNER);
    const inner = polarToXY(angle, D_R_INNER);

    const isAngle = (i === 1 || i === 4 || i === 7 || i === 10);
    const line = createSvgElement("line", {
      x1: outer.x, y1: outer.y,
      x2: inner.x, y2: inner.y,
      stroke: isDark ? (isAngle ? "#888" : "#444") : (isAngle ? "#888" : "#ccc"),
      "stroke-width": isAngle ? "1.5" : "0.6",
    });
    group.appendChild(line);

    // ハウス番号
    const nextCusp = i === 12 ? cusps[1] : cusps[i + 1];
    let midLon = cuspLon + ((nextCusp - cuspLon + 360) % 360) / 2;
    if (midLon >= 360) midLon -= 360;
    const midAngle = toWheelAngle(midLon, ascLon);
    const numPos = polarToXY(midAngle, D_R_HOUSE_NUM);
    const numText = createSvgElement("text", {
      x: numPos.x,
      y: numPos.y,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: isDark ? "#555" : "#bbb",
      "font-size": "9",
    });
    numText.textContent = i;
    group.appendChild(numText);
  }
}

// ── メインエクスポート ──

/**
 * 単円ホイールを描画する
 * @param {SVGElement} svg - 描画先SVG要素
 * @param {object} chart - calculateNatal() の戻り値 (planets, cusps, angles)
 * @param {Array} aspects - calculateAspects() の戻り値
 */
export function drawWheel(svg, chart, aspects) {
  svg.innerHTML = "";

  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  const ascLon = chart.angles.asc;

  // 背景
  const bg = createSvgElement("rect", {
    x: 0, y: 0, width: 600, height: 600,
    fill: "transparent",
  });
  svg.appendChild(bg);

  // レイヤー順: 基準円 → サイン帯 → ハウス → アスペクト線 → 天体 → アングルラベル
  const layerBase    = createSvgElement("g", { class: "layer-base" });
  const layerSigns   = createSvgElement("g", { class: "layer-signs" });
  const layerHouses  = createSvgElement("g", { class: "layer-houses" });
  const layerAspects = createSvgElement("g", { class: "layer-aspects" });
  const layerPlanets = createSvgElement("g", { class: "layer-planets" });
  const layerLabels  = createSvgElement("g", { class: "layer-labels" });

  drawBaseCircles(layerBase, isDark);
  drawSignBand(layerSigns, ascLon, isDark);
  drawHouses(layerHouses, chart.cusps, ascLon, isDark);
  drawAspectLines(layerAspects, aspects, ascLon);
  drawPlanets(layerPlanets, chart.planets, ascLon, isDark);
  drawAngleLabels(layerLabels, chart.angles, ascLon, isDark);

  svg.appendChild(layerBase);
  svg.appendChild(layerSigns);
  svg.appendChild(layerHouses);
  svg.appendChild(layerAspects);
  svg.appendChild(layerPlanets);
  svg.appendChild(layerLabels);
}

/**
 * 二重円ホイールを描画する
 * @param {SVGElement} svg - 描画先SVG要素
 * @param {object} natalChart - calculateNatal() の戻り値（内輪）
 * @param {Array} outerPlanets - 外輪の天体配列
 * @param {Array} crossAspects - calculateCrossAspects() の戻り値
 * @param {object} options - { outerColor: 外輪天体の色 }
 */
export function drawDoubleWheel(svg, natalChart, outerPlanets, crossAspects, options = {}) {
  svg.innerHTML = "";

  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  const ascLon = natalChart.angles.asc;

  const bg = createSvgElement("rect", {
    x: 0, y: 0, width: 600, height: 600,
    fill: "transparent",
  });
  svg.appendChild(bg);

  const layerBase    = createSvgElement("g", { class: "layer-base" });
  const layerSigns   = createSvgElement("g", { class: "layer-signs" });
  const layerHouses  = createSvgElement("g", { class: "layer-houses" });
  const layerAspects = createSvgElement("g", { class: "layer-aspects" });
  const layerOuter   = createSvgElement("g", { class: "layer-outer-planets" });
  const layerInner   = createSvgElement("g", { class: "layer-inner-planets" });
  const layerLabels  = createSvgElement("g", { class: "layer-labels" });

  drawDoubleBaseCircles(layerBase, isDark);
  drawSignBand(layerSigns, ascLon, isDark);   // サイン帯は同じ
  drawHousesDouble(layerHouses, natalChart.cusps, ascLon, isDark);
  drawCrossAspectLines(layerAspects, crossAspects, ascLon);

  // 外輪天体（トランジット/相手）
  drawPlanetsDouble(layerOuter, outerPlanets, ascLon, isDark,
    D_R_OUTER_PLANET, D_R_OUTER_DEGREE, D_R_SIGN_INNER - 3, true, options.outerColor);

  // 内輪天体（ネイタル）
  drawPlanetsDouble(layerInner, natalChart.planets, ascLon, isDark,
    D_R_INNER_PLANET, D_R_INNER_DEGREE, D_R_DIVIDER + 3, false);

  // アングルラベル
  drawAngleLabels(layerLabels, natalChart.angles, ascLon, isDark);

  svg.appendChild(layerBase);
  svg.appendChild(layerSigns);
  svg.appendChild(layerHouses);
  svg.appendChild(layerAspects);
  svg.appendChild(layerOuter);
  svg.appendChild(layerInner);
  svg.appendChild(layerLabels);
}
