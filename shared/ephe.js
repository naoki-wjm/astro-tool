/**
 * 天文暦ファイル（Swiss Ephemeris .se1）の読み込み
 *
 * 各ツールの計算は SEFLG_MOSEPH（Moshier 方式）で暦ファイル不要だが、キロン・小惑星
 * （seas_18.se1）だけは暦ファイルが要る。sweph-wasm の swe_set_ephe_path() は引数なしだと
 * ライブラリ作者の GitHub Pages から取りに行く仕様で、そこが落ちると初期化ごと失敗していた。
 *
 * ここでは 自前配置（../sweph/ephe/）→ 作者サイト の順に試し、両方ダメでも例外にせず続行する
 * （その場合はキロン等の計算時にだけエラーになる）。
 */

/** 自前配置の暦フォルダ。このファイルの場所基準なので、どのページから呼んでも同じ場所を指す */
export const LOCAL_EPHE_PATH = new URL("../sweph/ephe/", import.meta.url).href;

/** 読み込むファイル。1800〜2400 年をカバーする3本（約 2MB） */
export const EPHE_FILES = ["seas_18.se1", "sepl_18.se1", "semo_18.se1"];

/**
 * @param {object} swe - SwissEPH.init() の戻り値
 * @returns {Promise<"local"|"remote"|"none">} どこから読めたか
 */
export async function loadEphemeris(swe) {
  try {
    await swe.swe_set_ephe_path(LOCAL_EPHE_PATH, EPHE_FILES);
    return "local";
  } catch (e) {
    console.warn("自前の天文暦が読めませんでした。作者サイトに退避します:", e.message);
  }
  try {
    await swe.swe_set_ephe_path();
    return "remote";
  } catch (e) {
    console.warn("天文暦を読み込めませんでした（惑星計算は暦ファイル不要なので続行）:", e.message);
    return "none";
  }
}
