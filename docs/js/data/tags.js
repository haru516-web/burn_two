export const TAG_GROUPS = {
  activity: ['ご飯', '朝ごはん', 'ランチ', 'ディナー', 'カフェ', '散歩', '買い物', 'ドライブ', '旅行', 'イベント'],
  mood: ['まったり', 'おしゃれ', '落ち着く', 'ロマンチック', 'ワクワク', 'にぎやか'],
  scene: ['初デート', '休日', '昼デート', '夜デート', '記念日', '雨の日'],
  budget: ['低予算', 'ふつう', 'ちょっと贅沢'],
  time: ['朝', '昼', '夕方', '夜'],
};

export const TAG_GROUP_LABELS = {
  activity: 'デート内容',
  mood: '雰囲気',
  scene: 'シーン',
  budget: '予算感',
  time: '時間帯',
};

export const ALL_FIXED_TAGS = Object.values(TAG_GROUPS).flat();
