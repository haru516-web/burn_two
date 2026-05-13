import { getIcon } from '../components/icons.js';
import compatibilitySource from '../../../love_mobby_compatibility_136.md?raw';
import compatibilityScoreSource from '../../../love_mobby_compatibility_100_scores.md?raw';

export const LOVE_MOBBY_STORAGE_KEY = 'love_mobby_diag_v1';
export const PAGE_SIZE = 5;

const GAMMA = 1.35;
const EXTREME_BONUS = 0.35;
const COHERENCE_SHRINK = 0.2;

export const ANSWER_OPTIONS = [
  { value: 1, label: 'めっちゃわかる' },
  { value: 2, label: 'わかる' },
  { value: 3, label: 'ちょっとわかる' },
  { value: 4, label: 'どっちでもない' },
  { value: 5, label: 'あんまりわからない' },
  { value: 6, label: 'わからない' },
  { value: 7, label: '全然違う' },
];

export const AXES = {
  A: {
    key: 'A',
    label: '恋愛での立ち位置',
    left: { code: 'H', english: 'Heroine', label: 'ヒロイン型' },
    right: { code: 'S', english: 'Support', label: '支え役型' },
  },
  B: {
    key: 'B',
    label: '恋人との距離感',
    left: { code: 'L', english: 'Lock', label: '離したくない型' },
    right: { code: 'F', english: 'Free', label: '自由もほしい型' },
  },
  C: {
    key: 'C',
    label: '恋に求める温度',
    left: { code: 'T', english: 'Tokimeki', label: 'ときめき重視型' },
    right: { code: 'A', english: 'Anshin', label: '安心重視型' },
  },
  D: {
    key: 'D',
    label: '恋の見せ方',
    left: { code: 'O', english: 'Open', label: '見せたい恋型' },
    right: { code: 'C', english: 'Close', label: '内にしまう恋型' },
  },
};

const questionGroups = {
  A: {
    left: [
      '恋愛では、自分がちゃんと特別に思われていると感じたい。',
      '好きな人には、少しだけでも自分を最優先にしてほしい。',
      '記念日や大事な日は、自分のために考えてくれた感じがあると嬉しい。',
      '恋人には、「自分だけを見てくれている」と感じさせてほしい。',
      '恋愛では、自分が物語の中心にいるような気持ちになると嬉しい。',
    ],
    right: [
      '恋愛では、相手に喜ばせてもらうより、自分が相手を喜ばせたい気持ちが強い。',
      '相手が疲れているとき、自然と支える側に回る。',
      '自分のわがままより、相手が楽でいられることを優先したい。',
      '恋人の目標や日常を、そばで応援する関係が理想だ。',
      '自分が目立つより、相手が幸せそうにしているのを見る方が満たされる。',
    ],
  },
  B: {
    left: [
      '好きな人とは、できるだけたくさん連絡を取りたい。',
      '会えない日も、相手が何をしているか少し知っていたい。',
      'デート中は、距離が近いほど安心する。',
      '休日はできれば恋人との予定を優先したい。',
      '寂しいときは、素直に「会いたい」「話したい」と思う。',
    ],
    right: [
      '恋人がいても、自分だけの時間はしっかり残したい。',
      '連絡頻度が高すぎると、少し窮屈に感じる。',
      '好きでも、毎回の予定を恋人中心にしたいわけではない。',
      'お互いに、一人の時間や友達との時間を尊重したい。',
      '会っていない時間まで干渉されると疲れやすい。',
    ],
  },
  C: {
    left: [
      '恋愛には、時々ドキッとするイベントやサプライズがほしい。',
      'いつもの日常より、特別感のあるデートにテンションが上がる。',
      '恋人には、少しロマンチックな演出をしてほしい。',
      '写真を見返したときに、「映画みたい」と思える瞬間が好き。',
      '恋愛では、キュンとする言葉や仕草が大事だと思う。',
    ],
    right: [
      '派手なデートより、落ち着いて一緒にいられる時間が好き。',
      'ドキドキよりも、「この人なら大丈夫」と思えることが大事だ。',
      '特別な演出がなくても、いつも通り優しい方が嬉しい。',
      '長く続く関係には、安心感や信頼感が一番必要だと思う。',
      '無理に盛り上げるより、自然体でいられる恋愛が理想だ。',
    ],
  },
  D: {
    left: [
      '恋人との思い出は、かわいく写真やページに残したくなる。',
      '周りから「仲良いね」と思われると嬉しい。',
      'おそろいのものや、カップル感のある写真に憧れる。',
      '好きな人との幸せは、少しだけ友達やSNSにも見せたくなる。',
      '二人の関係をかわいく表現することも、恋愛の楽しさだと思う。',
    ],
    right: [
      '恋愛は人に見せるより、二人だけで大事にしたい。',
      'SNSに載せなくても、二人が分かっていれば満たされる。',
      '人に知られていない思い出ほど、特別に感じる。',
      'カップル感を出しすぎるより、静かに深い関係でいたい。',
      '見せるための恋愛より、二人だけの空気を大切にしたい。',
    ],
  },
};

export const QUESTIONS = Object.entries(questionGroups).flatMap(([axis, sides]) => (
  ['left', 'right'].flatMap((side) => (
    sides[side].map((text, index) => ({
      id: `${axis}_${side === 'left' ? 'L' : 'R'}_${String(index + 1).padStart(2, '0')}`,
      axis,
      side,
      text,
    }))
  ))
));

export const RESULT_TYPES = {
  HLTO: { code: 'HLTO', typeName: '花束の主人公', characterName: '花束の主人公モビー', shortCopy: '恋の主役感と、ときめきと、見せたくなる幸せを持ったタイプ。' },
  HLTC: { code: 'HLTC', typeName: '秘密の星', characterName: '秘密の星モビー', shortCopy: '特別に愛されたいけど、その恋は二人だけで大切にしたいタイプ。' },
  HLAO: { code: 'HLAO', typeName: 'ひなたの愛され人', characterName: 'ひなたの愛され人モビー', shortCopy: '離したくない安心と、周りにも伝わる愛され感を求めやすいタイプ。' },
  HLAC: { code: 'HLAC', typeName: '雨宿りの待ち人', characterName: '雨宿りの待ち人モビー', shortCopy: '大切にされている実感を、静かに深く受け取りたいタイプ。' },
  HFTO: { code: 'HFTO', typeName: '風まかせの小悪魔', characterName: '風まかせの小悪魔モビー', shortCopy: '自由さとときめき、そして少し見せたくなる魅力を持つタイプ。' },
  HFTC: { code: 'HFTC', typeName: '月影のミューズ', characterName: '月影のミューズモビー', shortCopy: '自由でいたいけど、恋の特別感は二人だけで味わいたいタイプ。' },
  HFAO: { code: 'HFAO', typeName: '晴れ間の本命', characterName: '晴れ間の本命モビー', shortCopy: '自分の時間も大事にしながら、安心できる本命感を求めるタイプ。' },
  HFAC: { code: 'HFAC', typeName: '静かな灯', characterName: '静かな灯モビー', shortCopy: '自由と安心を大事にしながら、二人だけの深い愛情を育てるタイプ。' },
  SLTO: { code: 'SLTO', typeName: '恋に旗を振る人', characterName: '恋に旗を振る人モビー', shortCopy: '相手を支えながら、一緒にときめく時間を外にも残したいタイプ。' },
  SLTC: { code: 'SLTC', typeName: '胸奥のロマン', characterName: '胸奥のロマンモビー', shortCopy: '相手を支えながら、二人だけのロマンチックな世界を大切にするタイプ。' },
  SLAO: { code: 'SLAO', typeName: '陽だまりを分ける人', characterName: '陽だまりを分ける人モビー', shortCopy: '支え合う安心感を、周りにも伝わる形で残したいタイプ。' },
  SLAC: { code: 'SLAC', typeName: '毛布をかける守り人', characterName: '毛布をかける守り人モビー', shortCopy: '離したくない気持ちで支えながら、二人だけの安心できる関係を大事にするタイプ。' },
  SFTO: { code: 'SFTO', typeName: '地図を広げる冒険家', characterName: '地図を広げる冒険家モビー', shortCopy: '自由さとときめきを大切にしながら、楽しい恋を形に残したいタイプ。' },
  SFTC: { code: 'SFTC', typeName: '夜風のロマンチスト', characterName: '夜風のロマンチストモビー', shortCopy: '自由な距離感の中で、二人だけのロマンを静かに育てるタイプ。' },
  SFAO: { code: 'SFAO', typeName: '余白を飾る演出家', characterName: '余白を飾る演出家モビー', shortCopy: '自由で自然体だけど、関係性の見せ方にもセンスが出るタイプ。' },
  SFAC: { code: 'SFAC', typeName: '静かな港の相棒', characterName: '静かな港の相棒モビー', shortCopy: '自由と安心、そして二人だけの信頼を長く育てるタイプ。' },
};

const RESULT_TYPE_ORDER = Object.keys(RESULT_TYPES);

const axisDualCopy = {
  A: '愛されたい気持ちも、相手を支えたい気持ちも強いタイプ。恋の主役でいたいだけではなく、相手の幸せも自分の幸せとして感じやすいです。',
  B: '離したくない気持ちも、自分の時間を守りたい気持ちもあります。寂しがりだけど、ずっと近すぎると疲れることもあるタイプです。',
  C: 'ときめきも安心も、どちらも大事にしたいタイプ。特別感がないと寂しいけれど、落ち着けない恋も長くは続きにくいです。',
  D: '見せたい気持ちも、二人だけで大事にしたい気持ちもあります。公開用の思い出と、二人だけの思い出を分けると満たされやすいタイプです。',
};

const typeGuideRows = [
  {
    number: '1.',
    title: '恋愛での立ち位置',
    leftCode: 'H',
    leftLabel: 'Heroine / ヒロイン型',
    rightCode: 'S',
    rightLabel: 'Support / 支え役型',
  },
  {
    number: '2.',
    title: '恋人との距離感',
    leftCode: 'L',
    leftLabel: 'Lock / 離したくない型',
    rightCode: 'F',
    rightLabel: 'Free / 自由もほしい型',
  },
  {
    number: '3.',
    title: '恋に求める温度',
    leftCode: 'T',
    leftLabel: 'Tokimeki / ときめき重視型',
    rightCode: 'A',
    rightLabel: 'Anshin / 安心重視型',
  },
  {
    number: '4.',
    title: '恋の見せ方',
    leftCode: 'O',
    leftLabel: 'Open / 見せたい恋型',
    rightCode: 'C',
    rightLabel: 'Close / 内にしまう恋型',
  },
];

function normalizeCompatibilityPair(firstCode, secondCode) {
  const firstIndex = RESULT_TYPE_ORDER.indexOf(firstCode);
  const secondIndex = RESULT_TYPE_ORDER.indexOf(secondCode);
  if (firstIndex < 0 || secondIndex < 0) return '';
  return firstIndex <= secondIndex ? `${firstCode}|${secondCode}` : `${secondCode}|${firstCode}`;
}

function parseCompatibilitySource(source) {
  const entries = {};
  let currentCode = '';

  source.split(/\r?\n/).forEach((line) => {
    const sectionMatch = line.match(/^##\s+([A-Z]{4}):/);
    if (sectionMatch) {
      currentCode = sectionMatch[1];
      return;
    }

    const entryMatch = line.match(/^- \*\*([A-Z]{4}): ([^*]+)\*\*｜([^｜]+)｜良い: ([^｜]+)｜注意: ([^｜]+)｜改善: (.+)$/);
    if (!currentCode || !entryMatch) return;

    const [, partnerCode, partnerName, stars, good, caution, improvement] = entryMatch;
    entries[normalizeCompatibilityPair(currentCode, partnerCode)] = {
      firstCode: currentCode,
      secondCode: partnerCode,
      partnerName,
      stars,
      good: good.split('・').map((text) => text.trim()).filter(Boolean),
      caution: caution.split('・').map((text) => text.trim()).filter(Boolean),
      improvement: improvement.split('；').map((text) => text.trim()).filter(Boolean),
    };
  });

  return entries;
}

const COMPATIBILITY_TABLE = parseCompatibilitySource(compatibilitySource);

function parseCompatibilityScoreSource(source) {
  const entries = {};
  let currentCode = '';

  source.split(/\r?\n/).forEach((line) => {
    const sectionMatch = line.match(/^##\s+([A-Z]{4}):/);
    if (sectionMatch) {
      currentCode = sectionMatch[1];
      return;
    }

    const scoreMatch = line.match(/^- \*\*([A-Z]{4}): [^*]+\*\*｜\*\*(\d{1,3})点\*\*/);
    if (!currentCode || !scoreMatch) return;

    const [, partnerCode, score] = scoreMatch;
    entries[normalizeCompatibilityPair(currentCode, partnerCode)] = Number(score);
  });

  return entries;
}

const COMPATIBILITY_SCORE_TABLE = parseCompatibilityScoreSource(compatibilityScoreSource);

function getCompatibilityResult(firstCode, secondCode) {
  const pairKey = normalizeCompatibilityPair(firstCode, secondCode);
  const result = COMPATIBILITY_TABLE[pairKey] || null;
  if (!result) return null;
  return {
    ...result,
    score: COMPATIBILITY_SCORE_TABLE[pairKey] || null,
  };
}

const typeDetails = {
  heroine: {
    tendency: '恋の中で「ちゃんと大切にされている実感」を受け取るほど、自分らしく輝けます。',
    needs: '言葉にしてくれること、記念日を覚えてくれること、特別扱いしてくれる瞬間。',
    strain: '気持ちが見えないまま放っておかれること。後回しにされたように感じる場面。',
  },
  support: {
    tendency: '相手の毎日や気持ちをよく見て、自然に支える側へ回りやすい恋愛です。',
    needs: '自分のやさしさに気づいてくれること、無理していないか見てくれること。',
    strain: '支えることが当たり前になり、自分の本音を置いていく場面。',
  },
  lock: {
    tendency: '好きな人との距離が近いほど安心し、大切な関係を離したくない気持ちが強いタイプです。',
    needs: '短い連絡、会えない日の共有、寂しいときに受け止めてくれる空気。',
    strain: '連絡が急に減ること、予定や気持ちが見えない時間が長いこと。',
  },
  free: {
    tendency: '恋人を大事にしながら、自分の時間やペースも同じくらい守りたいタイプです。',
    needs: '一人時間への理解、急かされない距離感、強制されない関わり方。',
    strain: '連絡や予定が義務になり、自由に息ができないと感じる場面。',
  },
  tokimeki: {
    tendency: '恋の特別感や、思い出に残る一瞬が心の温度を上げてくれます。',
    needs: '少しのサプライズ、写真に残したくなるデート、言葉や演出のときめき。',
    strain: '毎日が作業のように流れて、恋らしい高まりがなくなること。',
  },
  anshin: {
    tendency: '派手さよりも、落ち着いて信じられる関係に深く満たされます。',
    needs: '変わらないやさしさ、自然体でいられる時間、長く続く安心感。',
    strain: '感情の波が大きい恋、無理に盛り上げ続ける関係。',
  },
  open: {
    tendency: '二人の幸せをかわいく形に残したり、少し外へ見せたりすることで満たされます。',
    needs: '写真やページ作りへの協力、周りにも伝わる仲良し感、思い出の共有。',
    strain: '思い出を残すことを軽く見られること、関係を隠されすぎること。',
  },
  close: {
    tendency: '恋を外へ見せるより、二人だけが知っている温度を大切にします。',
    needs: '非公開の思い出、静かな言葉、二人だけで完結する深い安心。',
    strain: '見せるための恋になりすぎること、外から関係を評価されること。',
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(numbers) {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function normalizeAnswer(answer) {
  const centered = (4 - answer) / 3;
  let value = Math.sign(centered) * Math.pow(Math.abs(centered), GAMMA);
  if (answer === 1 || answer === 7) value *= 1 + EXTREME_BONUS;
  return clamp(value, -1, 1);
}

function agreementScore(answer) {
  return (normalizeAnswer(answer) + 1) / 2;
}

export function computeAxisScore(axisKey, questions, answers) {
  const axisQuestions = questions.filter((question) => question.axis === axisKey);
  const leftScores = axisQuestions
    .filter((question) => question.side === 'left')
    .map((question) => answers[question.id])
    .filter((value) => typeof value === 'number')
    .map(agreementScore);
  const rightScores = axisQuestions
    .filter((question) => question.side === 'right')
    .map((question) => answers[question.id])
    .filter((value) => typeof value === 'number')
    .map(agreementScore);

  const leftAvg = average(leftScores);
  const rightAvg = average(rightScores);
  const rawDiff = leftAvg - rightAvg;
  const conflict = clamp((Math.min(leftAvg, rightAvg) - 0.62) / 0.38, 0, 1);
  const adjustedDiff = rawDiff * (1 - COHERENCE_SHRINK * conflict);
  const leftRatio = clamp(Math.round((0.5 + adjustedDiff / 2) * 100), 0, 100);
  const decisiveness = Math.abs(adjustedDiff);

  return {
    axis: axisKey,
    leftAvg,
    rightAvg,
    rawDiff,
    adjustedDiff,
    leftRatio,
    rightRatio: 100 - leftRatio,
    direction: adjustedDiff >= 0 ? 'left' : 'right',
    decisiveness,
    confidence: decisiveness >= 0.4 ? 'はっきり' : decisiveness >= 0.2 ? 'やや' : '場面による',
    dualMode: leftAvg >= 0.65 && rightAvg >= 0.65,
    lowMode: leftAvg <= 0.45 && rightAvg <= 0.45,
  };
}

export function buildResultCode(axisScores) {
  return ['A', 'B', 'C', 'D'].map((axisKey) => {
    const axis = AXES[axisKey];
    return axisScores[axisKey].direction === 'left' ? axis.left.code : axis.right.code;
  }).join('');
}

export function detectStraightAnswer(answers) {
  const values = Object.values(answers).filter((value) => typeof value === 'number');
  if (!values.length) return false;
  const counts = values.reduce((next, value) => ({ ...next, [value]: (next[value] || 0) + 1 }), {});
  return Math.max(...Object.values(counts)) / values.length >= 0.8;
}

export function computeResult(questions, answers) {
  const axisScores = {};
  ['A', 'B', 'C', 'D'].forEach((axisKey) => {
    axisScores[axisKey] = computeAxisScore(axisKey, questions, answers);
  });
  const resultCode = buildResultCode(axisScores);
  const overallDecisiveness = average(Object.values(axisScores).map((score) => score.decisiveness));

  return {
    resultCode,
    resultType: RESULT_TYPES[resultCode],
    axisScores,
    straightAnswerDetected: detectStraightAnswer(answers),
    overallDecisiveness,
    overallConfidence: overallDecisiveness >= 0.4 ? 'strong' : overallDecisiveness >= 0.2 ? 'moderate' : 'balanced',
    profileCardPayload: {
      diagnosisName: '恋愛モビー診断',
      resultCode,
      typeName: RESULT_TYPES[resultCode]?.typeName || '',
      characterName: RESULT_TYPES[resultCode]?.characterName || '',
      axisScores,
    },
  };
}

export function buildAxisDisplay(axisScores) {
  return ['A', 'B', 'C', 'D'].map((axisKey) => ({
    axis: axisKey,
    title: AXES[axisKey].label,
    leftLabel: AXES[axisKey].left.label,
    rightLabel: AXES[axisKey].right.label,
    leftRatio: axisScores[axisKey].leftRatio,
    rightRatio: axisScores[axisKey].rightRatio,
    confidence: axisScores[axisKey].confidence,
    dualMode: axisScores[axisKey].dualMode,
    lowMode: axisScores[axisKey].lowMode,
  }));
}

function shuffleQuestions() {
  const shuffled = QUESTIONS.map((question) => question.id);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[nextIndex]] = [shuffled[nextIndex], shuffled[index]];
  }

  for (let index = 2; index < shuffled.length; index += 1) {
    const current = QUESTIONS.find((question) => question.id === shuffled[index]);
    const prev = QUESTIONS.find((question) => question.id === shuffled[index - 1]);
    const beforePrev = QUESTIONS.find((question) => question.id === shuffled[index - 2]);
    if (!current || current.axis !== prev?.axis || current.axis !== beforePrev?.axis) continue;
    const swapIndex = shuffled.findIndex((questionId, candidateIndex) => (
      candidateIndex > index && QUESTIONS.find((question) => question.id === questionId)?.axis !== current.axis
    ));
    if (swapIndex > index) [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function createInitialDiagnosisState() {
  return {
    step: 'intro',
    page: 0,
    answers: {},
    questionOrder: shuffleQuestions(),
    resultCode: '',
    result: null,
    profile: { name: '', age: '', partnerName: '' },
  };
}

export function readDiagnosisState() {
  if (typeof window === 'undefined') return createInitialDiagnosisState();
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOVE_MOBBY_STORAGE_KEY) || '{}') || {};
    return {
      ...createInitialDiagnosisState(),
      ...saved,
      answers: saved.answers || {},
      questionOrder: Array.isArray(saved.questionOrder) && saved.questionOrder.length === QUESTIONS.length
        ? saved.questionOrder
        : shuffleQuestions(),
      profile: { name: '', age: '', partnerName: '', ...(saved.profile || {}) },
    };
  } catch (error) {
    return createInitialDiagnosisState();
  }
}

export function writeDiagnosisState(nextState) {
  window.localStorage.setItem(LOVE_MOBBY_STORAGE_KEY, JSON.stringify(nextState));
}

export function buildNextStateFromAnswer(currentState, questionId, answerValue) {
  return {
    ...currentState,
    answers: { ...currentState.answers, [questionId]: Number(answerValue) },
  };
}

export function buildCompletedState(currentState) {
  const result = computeResult(QUESTIONS, currentState.answers || {});
  return {
    ...currentState,
    step: 'result',
    resultCode: result.resultCode,
    result,
  };
}

function getOrderedQuestions(diagnosisState) {
  return diagnosisState.questionOrder
    .map((id) => QUESTIONS.find((question) => question.id === id))
    .filter(Boolean);
}

function getResultDetails(result) {
  const code = result.resultCode;
  const keys = [
    code[0] === 'H' ? 'heroine' : 'support',
    code[1] === 'L' ? 'lock' : 'free',
    code[2] === 'T' ? 'tokimeki' : 'anshin',
    code[3] === 'O' ? 'open' : 'close',
  ];
  return {
    tendency: keys.slice(0, 2).map((key) => typeDetails[key].tendency),
    needs: keys.map((key) => typeDetails[key].needs).slice(0, 3),
    strain: keys.map((key) => typeDetails[key].strain).slice(0, 3),
    match: code[1] === 'L'
      ? '連絡や会う時間を自然に大切にしてくれる相手。'
      : '自分の時間を尊重しながら、必要な時は近くにいてくれる相手。',
    burn: [
      code[3] === 'O' ? 'SNS共有向けテンプレ、プロフィール帳風ページ、診断結果画像。' : '二人だけの非公開ページ、手紙風テンプレ、静かな記念日号。',
      code[2] === 'T' ? '映画風テンプレ、旅行・イベント系ページ、特別感ある表紙。' : '日常記録テンプレ、家デートや何気ない会話のページ、落ち着いた雑誌デザイン。',
      code[1] === 'L' ? '一緒に作るプロフィール帳、カップルで回答するページ。' : '自分のペースで作れるページ、後から相手がリアクションできる記録。',
    ],
  };
}

export function getResultImageSrc(resultType) {
  const imageName = resultType?.typeName ? `${resultType.typeName}.webp` : '';
  if (!imageName) return '';
  const pathBase = window.location.pathname.includes('/burn_two')
    ? '/burn_two/'
    : '/';
  return `${pathBase}image/lovemobby/${encodeURIComponent(imageName)}`;
}

function renderIntro() {
  return `
    <section class="love-diagnosis love-diagnosis--intro">
      <div class="love-diagnosis__hero">
        <p class="love-diagnosis__eyebrow">love mobby diagnosis</p>
        <h3>恋愛モビー診断</h3>
        <p>40問で、あなたの恋愛傾向を4軸から読み取り、16タイプのモビーに分類します。</p>
      </div>
      <div class="love-diagnosis__intro-grid">
        ${Object.values(AXES).map((axis) => `
          <article class="love-axis-card">
            <span>${axis.label}</span>
            <strong>${axis.left.label} / ${axis.right.label}</strong>
          </article>
        `).join('')}
      </div>
      <button class="button button--primary button--full" type="button" data-love-diagnosis-start>診断をはじめる</button>
    </section>
  `;
}

function renderDiagnosisActions() {
  return `
    <nav class="love-diagnosis-tabs" aria-label="診断メニュー">
      <button class="love-diagnosis-tabs__item is-active" type="button" data-love-tab-diagnosis>診断</button>
      <button class="love-diagnosis-tabs__item" type="button" data-love-character-list>キャラ一覧</button>
      <button class="love-diagnosis-tabs__item" type="button" data-love-compatibility>相性を見る</button>
      <button class="love-diagnosis-tabs__item love-diagnosis-tabs__item--danger" type="button" data-love-reset>リセット</button>
      <button class="love-diagnosis-tabs__item" type="button" data-love-type-guide>タイプ解説</button>
    </nav>
  `;
}

function renderCharacterList() {
  return `
    <section class="love-character-list" data-love-character-panel hidden>
      <div class="love-character-list__head">
        <p class="love-diagnosis__eyebrow">16 type list</p>
        <h3>キャラ一覧</h3>
      </div>
      <div class="love-character-grid">
        ${Object.values(RESULT_TYPES).map((type) => `
          <button class="love-character-card" type="button" data-love-character-code="${type.code}">
            <img src="${getResultImageSrc(type)}" alt="${type.characterName}" loading="lazy" decoding="async" />
            <div class="love-character-card__copy">
              <span>${type.code}</span>
              <strong>${type.typeName}</strong>
            </div>
          </button>
        `).join('')}
      </div>
      ${renderCharacterDetail('HLTO')}
    </section>
  `;
}

export function renderCharacterDetail(code = 'HLTO') {
  const type = RESULT_TYPES[code] || RESULT_TYPES.HLTO;
  const details = getResultDetails({ resultCode: type.code });

  return `
    <article class="love-character-detail" data-love-character-detail>
      <div class="love-character-detail__head">
        <img src="${getResultImageSrc(type)}" alt="${type.characterName}" loading="lazy" decoding="async" />
        <div>
          <p class="love-diagnosis__eyebrow">character ${type.code}</p>
          <h4>${type.typeName}</h4>
          <p>${type.shortCopy}</p>
        </div>
      </div>
      <section>
        <h5>恋愛傾向</h5>
        ${details.tendency.map((copy) => `<p>${copy}</p>`).join('')}
      </section>
      <section>
        <h5>求めやすいこと</h5>
        <ul>${details.needs.map((copy) => `<li>${copy}</li>`).join('')}</ul>
      </section>
      <section>
        <h5>しんどくなりやすい場面</h5>
        <ul>${details.strain.map((copy) => `<li>${copy}</li>`).join('')}</ul>
      </section>
    </article>
  `;
}

export function renderCompatibilityResult(firstCode = 'HLTO', secondCode = 'HLTO') {
  const result = getCompatibilityResult(firstCode, secondCode);
  const firstType = RESULT_TYPES[firstCode];
  const secondType = RESULT_TYPES[secondCode];

  if (!result || !firstType || !secondType) {
    return '<p class="love-compatibility__empty">相性データが見つかりませんでした。</p>';
  }

  return `
    <article class="love-compatibility-result" data-love-compatibility-result>
      <div class="love-compatibility-result__head">
        <div class="love-compatibility-result__pair">
          <figure>
            <img src="${getResultImageSrc(firstType)}" alt="${firstType.characterName}" loading="lazy" decoding="async" />
            <figcaption><span>${firstType.code}</span>${firstType.typeName}</figcaption>
          </figure>
          <i>×</i>
          <figure>
            <img src="${getResultImageSrc(secondType)}" alt="${secondType.characterName}" loading="lazy" decoding="async" />
            <figcaption><span>${secondType.code}</span>${secondType.typeName}</figcaption>
          </figure>
        </div>
        <strong>${result.stars}${result.score ? `<span>${result.score} / 100点</span>` : ''}</strong>
      </div>
      <section>
        <h4>良いところ</h4>
        <ul>${result.good.map((copy) => `<li>${copy}</li>`).join('')}</ul>
      </section>
      <section>
        <h4>注意したいところ</h4>
        <ul>${result.caution.map((copy) => `<li>${copy}</li>`).join('')}</ul>
      </section>
      <section>
        <h4>仲良く続けるコツ</h4>
        <ul>${result.improvement.map((copy) => `<li>${copy}</li>`).join('')}</ul>
      </section>
    </article>
  `;
}

function renderTypeSelect(name, label, selectedCode = 'HLTO') {
  return `
    <label class="love-compatibility-select">
      <span>${label}</span>
      <select class="field__input" name="${name}" data-love-compatibility-select>
        ${Object.values(RESULT_TYPES).map((type) => `
          <option value="${type.code}" ${type.code === selectedCode ? 'selected' : ''}>${type.code} ${type.typeName}</option>
        `).join('')}
      </select>
    </label>
  `;
}

function getDiagnosisResultCode(diagnosisState) {
  const resultCode = diagnosisState?.resultCode || diagnosisState?.result?.resultCode || '';
  return RESULT_TYPES[resultCode] ? resultCode : 'HLTO';
}

function renderCompatibilityPanel(diagnosisState) {
  const ownTypeCode = getDiagnosisResultCode(diagnosisState);
  return `
    <section class="love-compatibility" data-love-compatibility-panel hidden>
      <div class="love-compatibility__head">
        <p class="love-diagnosis__eyebrow">compatibility</p>
        <h3>ふたりの相性を見る</h3>
        <p>自分と相手の恋愛モビータイプを選ぶと、136通りの相性表から結果を表示します。</p>
      </div>
      <div class="love-compatibility__form">
        ${renderTypeSelect('firstType', 'あなたのタイプ', ownTypeCode)}
        ${renderTypeSelect('secondType', '相手のタイプ')}
      </div>
      ${renderCompatibilityResult(ownTypeCode)}
    </section>
  `;
}

function renderTypeGuide() {
  return `
    <section class="love-type-guide" data-love-type-guide-panel hidden>
      <div class="love-type-guide__dialog">
        <button class="love-type-guide__close" type="button" data-love-type-guide-close aria-label="閉じる">×</button>
        <p class="love-diagnosis__eyebrow">16タイプランク</p>
        <h3>あなたの「code」を読む方法</h3>
        <p class="love-type-guide__lead">codeのルール：code = 【立ち位置】【距離感】【温度】【見せ方】各1文字</p>
        <div class="love-type-guide__rows">
          ${typeGuideRows.map((row) => `
            <article class="love-type-guide-row">
              <h4>${row.number} ${row.title}</h4>
              <div class="love-type-guide-row__body">
                <span class="love-type-guide-code love-type-guide-code--pink">${row.leftCode}</span>
                <p>${row.leftLabel}</p>
                <i>↔</i>
                <span class="love-type-guide-code love-type-guide-code--blue">${row.rightCode}</span>
                <p>${row.rightLabel}</p>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderQuiz(diagnosisState) {
  const orderedQuestions = getOrderedQuestions(diagnosisState);
  const page = clamp(Number(diagnosisState.page) || 0, 0, Math.ceil(orderedQuestions.length / PAGE_SIZE) - 1);
  const pageQuestions = orderedQuestions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const answeredCount = Object.keys(diagnosisState.answers || {}).length;
  const canGoNext = pageQuestions.every((question) => typeof diagnosisState.answers?.[question.id] === 'number');
  const isLastPage = page >= Math.ceil(orderedQuestions.length / PAGE_SIZE) - 1;

  return `
    <section class="love-diagnosis love-diagnosis--quiz">
      <div class="love-progress">
        <span>${page + 1} / ${Math.ceil(orderedQuestions.length / PAGE_SIZE)}</span>
        <div class="love-progress__track"><i style="width: ${(answeredCount / QUESTIONS.length) * 100}%"></i></div>
      </div>
      <div class="love-question-list">
        ${pageQuestions.map((question, index) => `
          <article class="love-question">
            <p class="love-question__count">Q${page * PAGE_SIZE + index + 1}</p>
            <h3>${question.text}</h3>
            <div class="love-answer-scale" aria-label="回答を選択">
              <span>そう思う</span>
              <span>そう思わない</span>
            </div>
            <div class="love-answer-grid love-answer-grid--scale">
              ${ANSWER_OPTIONS.map((option) => `
                <label class="love-answer-option love-answer-option--scale love-answer-option--${option.value} ${diagnosisState.answers?.[question.id] === option.value ? 'is-selected' : ''}" title="${option.label}">
                  <input type="radio" name="${question.id}" value="${option.value}" data-love-answer="${question.id}" ${diagnosisState.answers?.[question.id] === option.value ? 'checked' : ''} />
                  <span aria-hidden="true"></span>
                  <em>${option.label}</em>
                </label>
              `).join('')}
            </div>
          </article>
        `).join('')}
      </div>
      <div class="love-diagnosis__nav">
        <button class="button button--ghost" type="button" data-love-page-prev ${page <= 0 ? 'disabled' : ''}>前へ</button>
        <button class="button button--primary" type="button" data-love-page-next ${canGoNext ? '' : 'disabled'}>${isLastPage ? '結果を見る' : '次へ'}</button>
      </div>
    </section>
  `;
}

function renderAxisBars(result) {
  return `
    <div class="love-axis-bars">
      ${buildAxisDisplay(result.axisScores).map((axis) => `
        <article class="love-axis-bar">
          <div class="love-axis-bar__head">
            <strong>${axis.title}</strong>
            <span>${axis.confidence}</span>
          </div>
          <div class="love-axis-bar__labels">
            <span>${axis.leftLabel} ${axis.leftRatio}%</span>
            <span>${axis.rightLabel} ${axis.rightRatio}%</span>
          </div>
          <div class="love-axis-bar__track">
            <i style="width: ${axis.leftRatio}%"></i>
          </div>
          ${axis.dualMode ? `<p>${axisDualCopy[axis.axis]}</p>` : ''}
          ${axis.lowMode ? '<p>この軸はまだはっきり決まりきっていないタイプです。相手や状況によって、恋愛での出方が変わりやすいです。</p>' : ''}
        </article>
      `).join('')}
    </div>
  `;
}

function renderResult(diagnosisState) {
  const savedResult = diagnosisState.result || null;
  const result = savedResult?.resultCode && RESULT_TYPES[savedResult.resultCode]
    ? savedResult
    : computeResult(QUESTIONS, diagnosisState.answers || {});
  const resultType = result.resultType || RESULT_TYPES[result.resultCode];
  const details = getResultDetails(result);
  const resultImageSrc = getResultImageSrc(resultType);

  return `
    <section class="love-diagnosis love-diagnosis--result">
      <article class="love-result-hero">
        <div class="love-result-hero__image">
          ${resultImageSrc ? `<img src="${resultImageSrc}" alt="${resultType.characterName}" loading="lazy" decoding="async" />` : ''}
        </div>
        <div class="love-result-hero__copy">
          <p class="love-diagnosis__eyebrow">result ${result.resultCode}</p>
          <h3>${resultType.typeName}</h3>
          <p>${resultType.shortCopy}</p>
        </div>
      </article>
      ${result.straightAnswerDetected ? `
        <p class="love-diagnosis__notice">回答がかなり同じ方向に寄っています。より正確な結果を見るには、直感に近いものを選び直してみてください。</p>
      ` : ''}
      ${renderAxisBars(result)}
      <div class="love-result-sections">
        <section><h4>恋愛傾向</h4>${details.tendency.map((copy) => `<p>${copy}</p>`).join('')}</section>
        <section><h4>好きな人に求めやすいこと</h4><ul>${details.needs.map((copy) => `<li>${copy}</li>`).join('')}</ul></section>
        <section><h4>しんどくなりやすい場面</h4><ul>${details.strain.map((copy) => `<li>${copy}</li>`).join('')}</ul></section>
        <section><h4>相性がいい相手</h4><p>${details.match}</p></section>
        <section><h4>BURNでおすすめの残し方</h4><ul>${details.burn.map((copy) => `<li>${copy}</li>`).join('')}</ul></section>
      </div>
      <div class="love-diagnosis__nav">
        <button class="button button--ghost" type="button" data-love-open-compatibility>&#30456;&#24615;&#12434;&#35211;&#12427;</button>
      </div>
      <button class="button button--ghost button--full" type="button" data-love-reset>診断をリセット</button>
      <p class="couple-magazine__status" data-love-status></p>
    </section>
  `;
}

export function renderLoveMobbyDiagnosis() {
  const diagnosisState = readDiagnosisState();
  return `
    <section class="page page--magazine page--diagnosis">
      <header class="page-header">
        <div>
          <p class="page-header__mini">diagnosis</p>
          <h2 class="page-header__title">恋愛モビー診断</h2>
        </div>
      </header>
      ${renderDiagnosisActions()}
      ${renderCharacterList()}
      ${renderCompatibilityPanel(diagnosisState)}
      ${renderTypeGuide()}
      <div data-love-diagnosis-panel>
        ${diagnosisState.step === 'quiz' ? renderQuiz(diagnosisState) : diagnosisState.step === 'result' ? renderResult(diagnosisState) : renderIntro()}
      </div>
    </section>
  `;
}

