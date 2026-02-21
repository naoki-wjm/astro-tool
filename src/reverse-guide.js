// ============================================================
// Reverse Horoscope Guide — 性格→サイン絞り込みウィザード
// ============================================================

// ============================================================
// Constants
// ============================================================
const SIGNS = [
  { name: '牡羊座', symbol: '♈', element: 'fire',  index: 0 },
  { name: '牡牛座', symbol: '♉', element: 'earth', index: 1 },
  { name: '双子座', symbol: '♊', element: 'air',   index: 2 },
  { name: '蟹座',   symbol: '♋', element: 'water', index: 3 },
  { name: '獅子座', symbol: '♌', element: 'fire',  index: 4 },
  { name: '乙女座', symbol: '♍', element: 'earth', index: 5 },
  { name: '天秤座', symbol: '♎', element: 'air',   index: 6 },
  { name: '蠍座',   symbol: '♏', element: 'water', index: 7 },
  { name: '射手座', symbol: '♐', element: 'fire',  index: 8 },
  { name: '山羊座', symbol: '♑', element: 'earth', index: 9 },
  { name: '水瓶座', symbol: '♒', element: 'air',   index: 10 },
  { name: '魚座',   symbol: '♓', element: 'water', index: 11 },
];

const ELEMENTS = {
  fire:  { name: '火', signs: [0, 4, 8],  color: 'var(--sign-fire)' },
  earth: { name: '地', signs: [1, 5, 9],  color: 'var(--sign-earth)' },
  air:   { name: '風', signs: [2, 6, 10], color: 'var(--sign-air)' },
  water: { name: '水', signs: [3, 7, 11], color: 'var(--sign-water)' },
};

const PLANET_INFO = {
  sun:     { id: 0, name: '太陽', symbol: '☉' },
  moon:    { id: 1, name: '月',   symbol: '☽' },
  mercury: { id: 2, name: '水星', symbol: '☿' },
  venus:   { id: 3, name: '金星', symbol: '♀' },
  mars:    { id: 4, name: '火星', symbol: '♂' },
};

// ============================================================
// Question data
// ============================================================
const QUESTIONS = {
  // --- Step 1: Sun sign ---
  q1: {
    label: 'STEP 1 — 太陽星座',
    text: 'このキャラクターが人生で最も大切にしていることは？',
    choices: [
      { text: '自分自身を貫くこと、挑戦すること',      element: 'fire',  next: 'q2_fire' },
      { text: '安定、快適さ、確かなものを守ること',      element: 'earth', next: 'q2_earth' },
      { text: '知ること、伝えること、繋がること',        element: 'air',   next: 'q2_air' },
      { text: '感じること、深く関わること、守ること',     element: 'water', next: 'q2_water' },
    ],
  },
  q2_fire: {
    label: 'STEP 1 — 太陽星座',
    text: 'その大切なもののために、どう動く？',
    choices: [
      { text: '考えるより先に動く。一番乗りでいたい',               sign: 0,  result: 'sun' },
      { text: '自分のやり方で堂々と。注目されることも厭わない',       sign: 4,  result: 'sun' },
      { text: 'もっと遠くへ、もっと広く。未知に飛び込む',             sign: 8,  result: 'sun' },
    ],
  },
  q2_earth: {
    label: 'STEP 1 — 太陽星座',
    text: 'その大切なもののために、どう動く？',
    choices: [
      { text: '五感を頼りに、じっくりと。急がない',                   sign: 1,  result: 'sun' },
      { text: '細部まで丁寧に、完璧を目指す。改善を怠らない',         sign: 5,  result: 'sun' },
      { text: '計画を立て、責任を負い、着実に積み上げる',             sign: 9,  result: 'sun' },
    ],
  },
  q2_air: {
    label: 'STEP 1 — 太陽星座',
    text: 'その大切なもののために、どう動く？',
    choices: [
      { text: '好奇心のままに。一つに絞るより色々つまみたい',         sign: 2,  result: 'sun' },
      { text: 'バランスを取り、公平さを重んじる。美しさも大事',       sign: 6,  result: 'sun' },
      { text: '常識に囚われない。独自の理想を追う',                   sign: 10, result: 'sun' },
    ],
  },
  q2_water: {
    label: 'STEP 1 — 太陽星座',
    text: 'その大切なもののために、どう動く？',
    choices: [
      { text: '大切な人を包み込むように守る。居場所を作る',           sign: 3,  result: 'sun' },
      { text: '深く深く潜る。一度掴んだものは絶対に離さない',         sign: 7,  result: 'sun' },
      { text: '境界なく溶け合う。全てを受け入れ、全てに共感する',     sign: 11, result: 'sun' },
    ],
  },

  // --- Step 2: Moon sign ---
  q3: {
    label: 'STEP 2 — 月星座',
    text: 'このキャラクターがストレスを受けた時、最初にどうなる？',
    choices: [
      { text: '怒る、焦る、とにかく動こうとする',       element: 'fire',  next: 'q4_fire' },
      { text: '黙る、耐える、現実的な対処を探す',       element: 'earth', next: 'q4_earth' },
      { text: '考え込む、誰かに話す、距離を置く',       element: 'air',   next: 'q4_air' },
      { text: '傷つく、引きこもる、感情に飲まれる',     element: 'water', next: 'q4_water' },
    ],
  },
  q4_fire: {
    label: 'STEP 2 — 月星座',
    text: '安心できる状態はどれに近い？',
    choices: [
      { text: '自分のペースで自由に動けること',       sign: 0,  result: 'moon' },
      { text: '認められること、特別扱いされること',   sign: 4,  result: 'moon' },
      { text: '笑っていられること、希望があること',   sign: 8,  result: 'moon' },
    ],
  },
  q4_earth: {
    label: 'STEP 2 — 月星座',
    text: '安心できる状態はどれに近い？',
    choices: [
      { text: '物理的な心地良さ。美味しいもの、肌触りの良いもの', sign: 1,  result: 'moon' },
      { text: '整理整頓されていること。やるべきことが明確なこと', sign: 5,  result: 'moon' },
      { text: '社会的な立場があること。頼られていること',         sign: 9,  result: 'moon' },
    ],
  },
  q4_air: {
    label: 'STEP 2 — 月星座',
    text: '安心できる状態はどれに近い？',
    choices: [
      { text: '新しい情報や刺激があること',                         sign: 2,  result: 'moon' },
      { text: '穏やかで美しい空間にいること。争いがないこと',       sign: 6,  result: 'moon' },
      { text: '誰にも干渉されない自分だけの時間があること',         sign: 10, result: 'moon' },
    ],
  },
  q4_water: {
    label: 'STEP 2 — 月星座',
    text: '安心できる状態はどれに近い？',
    choices: [
      { text: '安心できる人がそばにいること。居場所があること', sign: 3,  result: 'moon' },
      { text: '信頼できる人と深く繋がっていること',             sign: 7,  result: 'moon' },
      { text: '何も考えなくていい状態。ぼんやりできること',     sign: 11, result: 'moon' },
    ],
  },

  // --- Step 3: Extra planet selection ---
  q5: {
    label: 'STEP 3 — 追加天体',
    text: 'このキャラクターの一番の「個性」は、何に現れている？',
    choices: [
      { text: '恋愛・愛情表現・好きなものとの関わり方',   planet: 'venus',   next: 'q6a' },
      { text: '話し方・考え方・コミュニケーションの仕方', planet: 'mercury', next: 'q6b' },
      { text: '行動力・怒った時の振る舞い・戦い方',       planet: 'mars',    next: 'q6c' },
    ],
  },

  // --- Step 4: Extra planet sign ---
  // Venus
  q6a: {
    label: 'STEP 4 — 金星（愛し方）',
    text: 'このキャラクターの愛情表現は？',
    choices: [
      { text: '情熱的、直球、追いかける',           element: 'fire',  next: 'q6a_fire' },
      { text: '堅実、献身的、行動で示す',           element: 'earth', next: 'q6a_earth' },
      { text: '言葉で伝える、対等な関係を好む',     element: 'air',   next: 'q6a_air' },
      { text: '深く感じる、尽くす、一体化したがる', element: 'water', next: 'q6a_water' },
    ],
  },
  q6a_fire: {
    label: 'STEP 4 — 金星（愛し方）',
    text: '愛し方をもう少し詳しく。',
    choices: [
      { text: '好きになったら即行動。駆け引きはしない',                 sign: 0, result: 'venus' },
      { text: '惜しみなく与える。相手を特別扱いする',                   sign: 4, result: 'venus' },
      { text: '自由な関係を好む。束縛しないし、されたくない',           sign: 8, result: 'venus' },
    ],
  },
  q6a_earth: {
    label: 'STEP 4 — 金星（愛し方）',
    text: '愛し方をもう少し詳しく。',
    choices: [
      { text: '五感で愛する。触れる、味わう、そばにいる',               sign: 1, result: 'venus' },
      { text: '相手のために細かく気を配る。実用的な愛',                 sign: 5, result: 'venus' },
      { text: '責任を持つ。時間を掛けて信頼を築く',                     sign: 9, result: 'venus' },
    ],
  },
  q6a_air: {
    label: 'STEP 4 — 金星（愛し方）',
    text: '愛し方をもう少し詳しく。',
    choices: [
      { text: '会話が楽しい相手が好き。軽やかな関係',                   sign: 2, result: 'venus' },
      { text: '美しい関係を望む。相手の意思を尊重し、距離を保つ',       sign: 6, result: 'venus' },
      { text: '友情の延長のような愛。型にはまらない関係',               sign: 10, result: 'venus' },
    ],
  },
  q6a_water: {
    label: 'STEP 4 — 金星（愛し方）',
    text: '愛し方をもう少し詳しく。',
    choices: [
      { text: '守る、包む、世話を焼く。家庭的な愛',                     sign: 3, result: 'venus' },
      { text: '深く執着する。全てを共有したい。秘密の関係',             sign: 7, result: 'venus' },
      { text: '境界なく溶け合う。相手の痛みも喜びも自分のもの',         sign: 11, result: 'venus' },
    ],
  },

  // Mercury
  q6b: {
    label: 'STEP 4 — 水星（思考・言葉）',
    text: 'このキャラクターの話し方や考え方は？',
    choices: [
      { text: '率直、短い、結論が先',       element: 'fire',  next: 'q6b_fire' },
      { text: '正確、慎重、具体的',         element: 'earth', next: 'q6b_earth' },
      { text: '論理的、客観的、多角的',     element: 'air',   next: 'q6b_air' },
      { text: '直感的、婉曲、空気を読む',   element: 'water', next: 'q6b_water' },
    ],
  },
  q6b_fire: {
    label: 'STEP 4 — 水星（思考・言葉）',
    text: '話し方をもう少し詳しく。',
    choices: [
      { text: '思ったことをそのまま言う。遠回しにできない',             sign: 0, result: 'mercury' },
      { text: '堂々と、ドラマチックに語る。物語のように話す',           sign: 4, result: 'mercury' },
      { text: '大きなビジョンを語る。細かいことは気にしない',           sign: 8, result: 'mercury' },
    ],
  },
  q6b_earth: {
    label: 'STEP 4 — 水星（思考・言葉）',
    text: '話し方をもう少し詳しく。',
    choices: [
      { text: 'ゆっくり、じっくり。一度決めたら変えない',               sign: 1, result: 'mercury' },
      { text: '精密、分析的。正確に言えないなら言わない',               sign: 5, result: 'mercury' },
      { text: '端的、無駄がない。結論と事実だけ',                       sign: 9, result: 'mercury' },
    ],
  },
  q6b_air: {
    label: 'STEP 4 — 水星（思考・言葉）',
    text: '話し方をもう少し詳しく。',
    choices: [
      { text: '話題がコロコロ変わる。好奇心旺盛。早口',                 sign: 2, result: 'mercury' },
      { text: '相手に合わせる。公平に、丁寧に。外交的',                 sign: 6, result: 'mercury' },
      { text: '独自の視点。常識とは違う角度から物を見る',               sign: 10, result: 'mercury' },
    ],
  },
  q6b_water: {
    label: 'STEP 4 — 水星（思考・言葉）',
    text: '話し方をもう少し詳しく。',
    choices: [
      { text: '感情を込めて話す。相手を気遣う言葉選び',                 sign: 3, result: 'mercury' },
      { text: '言葉の裏を読む。核心を突く。秘密主義',                   sign: 7, result: 'mercury' },
      { text: '詩的、抽象的。感覚で伝える',                             sign: 11, result: 'mercury' },
    ],
  },

  // Mars
  q6c: {
    label: 'STEP 4 — 火星（行動力・怒り方）',
    text: 'このキャラクターが怒ったり、本気で動く時は？',
    choices: [
      { text: '即座に爆発する、または即座に行動する',   element: 'fire',  next: 'q6c_fire' },
      { text: '静かに、でも確実に手を打つ',             element: 'earth', next: 'q6c_earth' },
      { text: '言葉で戦う、または距離を取る',           element: 'air',   next: 'q6c_air' },
      { text: '感情で動く。大切なもののためなら命懸け', element: 'water', next: 'q6c_water' },
    ],
  },
  q6c_fire: {
    label: 'STEP 4 — 火星（行動力・怒り方）',
    text: '怒り方をもう少し詳しく。',
    choices: [
      { text: '瞬間湯沸かし器。でも後を引かない',                       sign: 0, result: 'mars' },
      { text: '怒ると威圧的。プライドが原動力',                         sign: 4, result: 'mars' },
      { text: '正義のために戦う。大義がないと動かない',                 sign: 8, result: 'mars' },
    ],
  },
  q6c_earth: {
    label: 'STEP 4 — 火星（行動力・怒り方）',
    text: '怒り方をもう少し詳しく。',
    choices: [
      { text: 'なかなか怒らないが、限界を超えたら頑固に動かない',       sign: 1, result: 'mars' },
      { text: '問題を分析して、最も効率的な一点を突く',                 sign: 5, result: 'mars' },
      { text: '戦略的に忍耐する。ここぞで全力を出す',                   sign: 9, result: 'mars' },
    ],
  },
  q6c_air: {
    label: 'STEP 4 — 火星（行動力・怒り方）',
    text: '怒り方をもう少し詳しく。',
    choices: [
      { text: '皮肉や機転で切り返す。正面衝突は避ける',                 sign: 2, result: 'mars' },
      { text: '冷静に論破する。感情的にならない',                       sign: 6, result: 'mars' },
      { text: '反体制的な怒り。システムそのものに噛みつく',             sign: 10, result: 'mars' },
    ],
  },
  q6c_water: {
    label: 'STEP 4 — 火星（行動力・怒り方）',
    text: '怒り方をもう少し詳しく。',
    choices: [
      { text: '大切な人が傷つけられた時だけ、爆発的に動く',             sign: 3, result: 'mars' },
      { text: '執念深い。一度敵と認めたら容赦しない',                   sign: 7, result: 'mars' },
      { text: '怒りが分散する。自分を犠牲にしてでも収めようとする',     sign: 11, result: 'mars' },
    ],
  },
};

// Question flow: the order of "steps" for progress dots
// Actual flow is dynamic based on branching, but we track 6 logical steps
const TOTAL_STEPS = 6;

// ============================================================
// Astronomical constraints
// ============================================================

/**
 * Get allowed sign indices for a planet given the sun sign.
 * Mercury: sun ± 1 sign (3 candidates)
 * Venus:   sun ± 2 signs (5 candidates)
 * Mars+:   no constraint (all 12)
 */
function getAllowedSigns(planetKey, sunSignIndex) {
  if (planetKey === 'mercury') {
    return [
      (sunSignIndex + 11) % 12, // -1
      sunSignIndex,
      (sunSignIndex + 1) % 12,  // +1
    ];
  }
  if (planetKey === 'venus') {
    return [
      (sunSignIndex + 10) % 12, // -2
      (sunSignIndex + 11) % 12, // -1
      sunSignIndex,
      (sunSignIndex + 1) % 12,  // +1
      (sunSignIndex + 2) % 12,  // +2
    ];
  }
  // Mars and beyond: no constraint
  return SIGNS.map((_, i) => i);
}

function checkConstraint(planetKey, signIndex, sunSignIndex) {
  const allowed = getAllowedSigns(planetKey, sunSignIndex);
  return allowed.includes(signIndex);
}

// ============================================================
// LLM Prompt (Route A)
// ============================================================
const LLM_PROMPT = `あなたは西洋占星術に精通したアシスタントです。
これから提示する小説の本文を読み、登場するキャラクターごとに、ネイタルチャート（出生図）の天体サインを推測してください。

### 手順（必ずこの順番で進めてください）

#### ステップ1：太陽星座と月星座を決める

キャラクターごとに、以下の2つを推測してください。

- **太陽星座**：そのキャラクターの生き方の核、アイデンティティ、人生の目的
  - 判断材料：行動原理、価値観、人生で何を重視しているか、周囲からどう認識されているか
- **月星座**：感情の出方、安心できる状態、プライベートでの素の姿
  - 判断材料：ストレス時の反応、甘え方、怒り方、何に安らぎを感じるか、無意識の癖

それぞれ、「なぜその星座と判断したか」の根拠を、作中の具体的な描写を引用して示してください。

#### ステップ2：最も特徴的な天体を1〜2個追加する

太陽と月が決まったら、そのキャラクターの個性が最も強く現れている領域を判断し、対応する天体のサインを追加で推測してください。

- 恋愛・愛情表現・美意識が特徴的 → **金星**
- 思考パターン・話し方・コミュニケーションが特徴的 → **水星**
- 行動力・怒り方・戦い方が特徴的 → **火星**

こちらも同様に、根拠となる描写を引用してください。

### 天文学的制約（必ず守ってください）

太陽系の天体には、太陽との位置関係に物理的な制約があります。以下のルールに反する組み合わせは、現実の空に存在しません。

- **水星**は、太陽と同じ星座、またはその前後1つの星座にしか位置できません。
  - 例：太陽が乙女座なら、水星は獅子座・乙女座・天秤座のいずれか
- **金星**は、太陽と同じ星座、またはその前後2つの星座にしか位置できません。
  - 例：太陽が乙女座なら、金星は蟹座・獅子座・乙女座・天秤座・蠍座のいずれか
- **火星以遠**の天体には、このような制約はありません。

この制約に違反する組み合わせは絶対に提案しないでください。
もし物語の描写から対向星座（180°反対の星座）が最もふさわしいように感じても、上記の制約で不可能な場合は、制約内で最も近い解釈を探してください。

### 出力フォーマット

キャラクターごとに、以下の形式で出力してください。

【キャラクター名】
☉太陽：○○座 — 根拠：「～～」（該当する描写の要約や引用）
☽月：○○座 — 根拠：「～～」
追加天体（1〜2個）：
☿/♀/♂ ○○座 — 根拠：「～～」

### 注意事項

- 推測に自信がない場合は、候補を2つ挙げてそれぞれの根拠を示してください。
- キャラクターの描写が少なく判断材料が不足する場合は、無理に推測せず「情報不足」と明記してください。
- 天体サインの推測は、キャラクターの「設定上の誕生日」ではなく、性格描写や行動パターンから導いてください。

---

以下が小説の本文です。

（ここに本文を貼り付けてください）`;

// ============================================================
// State
// ============================================================
let wizardState = {
  currentQuestion: null,
  history: [],      // stack of { questionId, choiceIndex } for back navigation
  stepCount: 0,
  results: {},      // { sun: signIndex, moon: signIndex, venus/mercury/mars: signIndex }
  extraPlanet: null, // 'venus' | 'mercury' | 'mars'
};

// ============================================================
// DOM helpers
// ============================================================
const $ = (id) => document.getElementById(id);

// ============================================================
// Route choice
// ============================================================
function initRouteChoice() {
  $('cardRouteA').addEventListener('click', () => showRouteA());
  $('cardRouteB').addEventListener('click', () => showRouteB());
  $('routeABack').addEventListener('click', () => showRouteChoice());
}

function showRouteChoice() {
  $('routeChoice').style.display = 'block';
  $('routeA').style.display = 'none';
  $('routeB').style.display = 'none';
  $('wizardResult').style.display = 'none';
}

function showRouteA() {
  $('routeChoice').style.display = 'none';
  $('routeA').style.display = 'block';
  $('routeB').style.display = 'none';
  $('wizardResult').style.display = 'none';
  renderPrompt();
}

function showRouteB() {
  $('routeChoice').style.display = 'none';
  $('routeA').style.display = 'none';
  $('routeB').style.display = 'block';
  $('wizardResult').style.display = 'none';
  resetWizard();
  showQuestion('q1');
}

// ============================================================
// Route A: Prompt display
// ============================================================
function renderPrompt() {
  $('promptText').textContent = LLM_PROMPT;

  const copyBtn = $('copyBtn');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(LLM_PROMPT);
      copyBtn.textContent = '✓ コピーしました';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = '📋 プロンプトをコピー';
        copyBtn.classList.remove('copied');
      }, 2000);
    } catch (e) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = LLM_PROMPT;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      copyBtn.textContent = '✓ コピーしました';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = '📋 プロンプトをコピー';
        copyBtn.classList.remove('copied');
      }, 2000);
    }
  });
}

// ============================================================
// Route B: Wizard
// ============================================================
function resetWizard() {
  wizardState = {
    currentQuestion: null,
    history: [],
    stepCount: 0,
    results: {},
    extraPlanet: null,
  };
}

function getLogicalStep(questionId) {
  if (questionId === 'q1') return 0;
  if (questionId.startsWith('q2')) return 1;
  if (questionId === 'q3') return 2;
  if (questionId.startsWith('q4')) return 3;
  if (questionId === 'q5') return 4;
  if (questionId.startsWith('q6')) return 5;
  return 0;
}

function renderProgress(currentStep) {
  const container = $('wizardProgress');
  container.innerHTML = '';
  for (let i = 0; i < TOTAL_STEPS; i++) {
    const dot = document.createElement('div');
    dot.className = 'wizard-dot';
    if (i === currentStep) dot.classList.add('active');
    else if (i < currentStep) dot.classList.add('done');
    container.appendChild(dot);
  }
}

function showQuestion(questionId) {
  wizardState.currentQuestion = questionId;
  const q = QUESTIONS[questionId];
  if (!q) return;

  const logicalStep = getLogicalStep(questionId);
  wizardState.stepCount = logicalStep;
  renderProgress(logicalStep);

  const stepsContainer = $('wizardSteps');
  stepsContainer.innerHTML = '';

  const stepDiv = document.createElement('div');
  stepDiv.className = 'wizard-step active';

  const label = document.createElement('div');
  label.className = 'question-label';
  label.textContent = q.label;

  const text = document.createElement('div');
  text.className = 'question-text';
  text.textContent = q.text;

  const choiceGrid = document.createElement('div');
  choiceGrid.className = 'choice-grid';

  q.choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.type = 'button';
    if (choice.element) {
      btn.dataset.element = choice.element;
    }
    btn.textContent = choice.text;

    btn.addEventListener('click', () => handleChoice(questionId, idx));
    choiceGrid.appendChild(btn);
  });

  stepDiv.appendChild(label);
  stepDiv.appendChild(text);
  stepDiv.appendChild(choiceGrid);
  stepsContainer.appendChild(stepDiv);

  // Show/hide back button
  const nav = $('wizardNav');
  if (wizardState.history.length > 0) {
    nav.style.display = 'flex';
  } else {
    nav.style.display = 'none';
  }
}

function handleChoice(questionId, choiceIndex) {
  const q = QUESTIONS[questionId];
  const choice = q.choices[choiceIndex];

  // Save to history for back navigation
  wizardState.history.push({ questionId, choiceIndex });

  // If this choice determines a result (sign for a planet)
  if (choice.result && choice.sign !== undefined) {
    wizardState.results[choice.result] = choice.sign;

    // Determine next question
    if (choice.result === 'sun') {
      showQuestion('q3');
      return;
    }
    if (choice.result === 'moon') {
      showQuestion('q5');
      return;
    }
    // Extra planet result → done, show result
    if (['venus', 'mercury', 'mars'].includes(choice.result)) {
      wizardState.extraPlanet = choice.result;
      showResult();
      return;
    }
  }

  // If this choice selects an extra planet
  if (choice.planet) {
    wizardState.extraPlanet = choice.planet;
  }

  // Go to next question
  if (choice.next) {
    showQuestion(choice.next);
  }
}

function initWizardBack() {
  $('wizardBack').addEventListener('click', () => {
    if (wizardState.history.length === 0) return;

    // Pop the last choice
    wizardState.history.pop();

    if (wizardState.history.length === 0) {
      // Go back to first question
      showQuestion('q1');
      // Clear results
      wizardState.results = {};
      wizardState.extraPlanet = null;
      return;
    }

    // Replay all choices up to the previous state
    const savedHistory = [...wizardState.history];
    resetWizard();

    // Replay up to the second-to-last entry to reach the previous question
    for (let i = 0; i < savedHistory.length - 1; i++) {
      const entry = savedHistory[i];
      const q = QUESTIONS[entry.questionId];
      const choice = q.choices[entry.choiceIndex];

      wizardState.history.push(entry);

      if (choice.result && choice.sign !== undefined) {
        wizardState.results[choice.result] = choice.sign;
      }
      if (choice.planet) {
        wizardState.extraPlanet = choice.planet;
      }
    }

    // Show the last question in history (the one we want to re-answer)
    const lastEntry = savedHistory[savedHistory.length - 1];
    showQuestion(lastEntry.questionId);
  });
}

// ============================================================
// Result display
// ============================================================
function showResult() {
  $('routeB').style.display = 'none';
  $('wizardResult').style.display = 'block';

  const sunSign = wizardState.results.sun;
  const moonSign = wizardState.results.moon;
  const extraPlanet = wizardState.extraPlanet;
  const extraSign = wizardState.results[extraPlanet];

  // Check astronomical constraint
  const needsConstraintCheck = (extraPlanet === 'mercury' || extraPlanet === 'venus');
  const constraintOk = needsConstraintCheck
    ? checkConstraint(extraPlanet, extraSign, sunSign)
    : true;

  const resultDiv = $('wizardResult');
  resultDiv.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = '推測結果';
  resultDiv.appendChild(title);

  // Summary card
  const card = document.createElement('div');
  card.className = 'result-summary-card';

  const rows = [
    { planet: PLANET_INFO.sun,  sign: sunSign,  priority: '必須' },
    { planet: PLANET_INFO.moon, sign: moonSign, priority: '必須' },
  ];

  if (constraintOk) {
    rows.push({
      planet: PLANET_INFO[extraPlanet],
      sign: extraSign,
      priority: 'できれば',
    });
  }

  rows.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'result-sign-row';
    row.innerHTML = `
      <span class="result-planet-label">${r.planet.symbol} ${r.planet.name}</span>
      <span class="result-sign-value">${SIGNS[r.sign].symbol} ${SIGNS[r.sign].name}</span>
      <span class="result-priority">${r.priority}</span>
    `;
    card.appendChild(row);
  });

  resultDiv.appendChild(card);

  // Constraint warning if needed
  if (!constraintOk) {
    const warning = document.createElement('div');
    warning.className = 'constraint-warning';

    const planetName = PLANET_INFO[extraPlanet].name;
    const planetSymbol = PLANET_INFO[extraPlanet].symbol;
    const chosenSignName = SIGNS[extraSign].name;
    const sunSignName = SIGNS[sunSign].name;

    const allowed = getAllowedSigns(extraPlanet, sunSign);
    const range = extraPlanet === 'mercury' ? '前後1つ' : '前後2つ';

    warning.innerHTML = `
      <div class="constraint-warning-title">⚠ 天文学的制約</div>
      <div>
        ${planetSymbol}${planetName}（${chosenSignName}）は、☉太陽（${sunSignName}）との組み合わせでは天文学的に成立しません。<br>
        ${planetName}は太陽と同じか${range}の星座にしか位置できないためです。<br>
        以下の候補から、最もキャラクターに近いものを選んでください。
      </div>
    `;

    const choices = document.createElement('div');
    choices.className = 'constraint-choices';

    allowed.forEach((si) => {
      const btn = document.createElement('button');
      btn.className = 'constraint-choice-btn';
      btn.type = 'button';
      btn.textContent = `${SIGNS[si].symbol} ${SIGNS[si].name}`;
      btn.addEventListener('click', () => {
        wizardState.results[extraPlanet] = si;
        showResult(); // re-render with corrected sign
      });
      choices.appendChild(btn);
    });

    warning.appendChild(choices);
    resultDiv.appendChild(warning);
  }

  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'result-actions';

  if (constraintOk) {
    const searchLink = document.createElement('a');
    searchLink.className = 'search-link-btn';
    searchLink.href = buildReverseUrl();
    searchLink.textContent = 'この条件で逆引き検索する →';
    actions.appendChild(searchLink);
  }

  const restartBtn = document.createElement('button');
  restartBtn.className = 'restart-btn';
  restartBtn.type = 'button';
  restartBtn.textContent = '↺ もう一度やり直す';
  restartBtn.addEventListener('click', () => {
    showRouteChoice();
  });
  actions.appendChild(restartBtn);

  resultDiv.appendChild(actions);
}

// ============================================================
// URL building for reverse.html
// ============================================================
function buildReverseUrl() {
  const params = new URLSearchParams();

  // sun and moon (required)
  params.set('sun', wizardState.results.sun);
  params.set('moon', wizardState.results.moon);

  // extra planet
  const extraPlanet = wizardState.extraPlanet;
  if (extraPlanet && wizardState.results[extraPlanet] !== undefined) {
    params.set(extraPlanet, wizardState.results[extraPlanet]);
  }

  // Priority info: sun and moon are required, extra is optional
  params.set('p_sun', 'required');
  params.set('p_moon', 'required');
  if (extraPlanet) {
    params.set('p_' + extraPlanet, 'optional');
  }

  return `./reverse.html?${params.toString()}`;
}

// ============================================================
// Boot
// ============================================================
function init() {
  initRouteChoice();
  initWizardBack();
}

init();
