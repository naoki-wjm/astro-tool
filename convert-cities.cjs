// convert-cities.js
const fs = require('fs');

const raw = require('./cities-raw.json'); // 元データ

const result = {};

for (const item of raw) {
  // 都道府県を抽出（北海道、東京都、大阪府、京都府、〜県）
  const match = item.name.match(/^(北海道|東京都|(?:大阪|京都)府|.+?県)(.+)$/);
  if (!match) continue;
  
  const [, pref, city] = match;
  
  if (!result[pref]) {
    result[pref] = [];
  }
  
  result[pref].push({
    name: city,
    lng: item.lnglat[0],
    lat: item.lnglat[1]
  });
}

fs.writeFileSync('cities.json', JSON.stringify(result, null, 2));
console.log('変換完了: cities.json');