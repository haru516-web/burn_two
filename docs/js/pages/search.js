import { getIcon } from '../components/icons.js';
import { getPostDateKey } from '../utils/date.js';
import { getCalendarEntriesWithSpecialDates, getEntriesForDateWithSpecialDates } from '../utils/specialDates.js';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const COUPLE_QUESTIONS = [
  {
    id: 'mood',
    title: '次のデート、どんな気分？',
    options: [
      { value: 'relax', label: 'まったり', icon: 'issue' },
      { value: 'cafe', label: 'カフェ', icon: 'save' },
      { value: 'dinner', label: '夜ごはん', icon: 'timeline' },
      { value: 'walk', label: '外を歩きたい', icon: 'follow' },
      { value: 'home', label: 'おうち', icon: 'home' },
      { value: 'photo', label: '写真を撮りたい', icon: 'image' },
    ],
  },
  {
    id: 'budget',
    title: '予算はどのくらい？',
    options: [
      { value: '3000', label: '〜3,000円' },
      { value: '5000', label: '〜5,000円' },
      { value: 'special', label: '少し特別に' },
    ],
  },
  {
    id: 'pace',
    title: '過ごし方の近さは？',
    options: [
      { value: 'quiet', label: '静かに話したい' },
      { value: 'active', label: '少し動きたい' },
      { value: 'memory', label: '記録に残したい' },
    ],
  },
];

export const DATE_PLANS = [
  {
    id: 'daikanyama-cafe',
    title: '代官山カフェ',
    place: '代官山',
    copy: '静かな空間で、ゆっくり話せるカフェ。',
    time: '11:00〜13:30',
    date: '2025-05-03',
    tags: ['静か', '〜3,000円', 'カフェ'],
    image: 'assets/5-CEZXb3Sg.webp',
    weights: { cafe: 5, relax: 3, quiet: 3, 3000: 2, 5000: 2 },
  },
  {
    id: 'ebisu-night-cafe',
    title: '恵比寿 夜カフェ',
    place: '恵比寿',
    copy: '夜景を楽しみながら、落ち着いた時間を。',
    time: '19:00〜21:00',
    date: '2025-05-10',
    tags: ['夜', '写真映え'],
    image: 'assets/10-CNvd6Y-G.webp',
    weights: { dinner: 4, photo: 3, memory: 3, special: 3, quiet: 1 },
  },
  {
    id: 'nakameguro-walk',
    title: '中目黒さんぽ',
    place: '中目黒',
    copy: '川沿いをのんびり歩いてリフレッシュ。',
    time: '14:00〜16:30',
    date: '2025-05-24',
    tags: ['外', 'ゆっくり'],
    image: 'assets/8-Byay75Vc.webp',
    weights: { walk: 5, active: 3, relax: 2, 3000: 1 },
  },
  {
    id: 'home-page-making',
    title: 'おうちでページ作り',
    place: 'おうち',
    copy: '撮りためた写真を選んで、ふたりの一枚に整える時間。',
    time: '15:00〜17:00',
    date: '2025-05-31',
    tags: ['おうち', '記録'],
    image: 'assets/11-Dxtb6Ugd.webp',
    weights: { home: 5, memory: 4, photo: 2, relax: 2, 3000: 2 },
  },
];

function renderBrand() {
  return `
    <div class="couple-brand" aria-label="BURN">
      <p class="couple-brand__word">BURN</p>
      <div class="couple-brand__line" aria-hidden="true"><span></span><span></span></div>
    </div>
  `;
}

function getTodayDateKey() {
  const date = new Date();
  return formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateKey(dateString, fallback = getTodayDateKey()) {
  const match = String(dateString || fallback).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return parseDateKey(fallback, '2025-05-03');
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function getMonthLabel(dateString) {
  const { year, month } = parseDateKey(dateString);
  return `${year}年${month}月`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function buildCalendarDays(dateString, weekStartsOn = 1) {
  const { year, month } = parseDateKey(dateString);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const leadingDays = (firstDay - weekStartsOn + 7) % 7;
  const startDate = new Date(year, month - 1, 1 - leadingDays);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const dateKey = formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return {
      date: dateKey,
      day: date.getDate(),
      inactive: date.getFullYear() !== year || date.getMonth() !== month - 1,
    };
  });
}

function formatDateLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '5/3 Sat';
  return `${date.getMonth() + 1}/${date.getDate()} ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}`;
}

function getPostTitle(post) {
  const headline = String(post.composeData?.headline || '').trim();
  if (headline && headline.toLowerCase() !== 'text') return headline;
  const caption = String(post.caption || '').split('/')[0].trim();
  return caption || 'ふたりのページ';
}

function getEntriesForDate(state, dateString) {
  return getEntriesForDateWithSpecialDates(state, dateString);
}

function getPostsForDate(state, dateString) {
  return (state.posts || []).filter((post) => getPostDateKey(post) === dateString);
}

function escapeCalendarText(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getCoupleRecommendations(couple = {}) {
  const values = [
    ...Object.values(couple.answers?.you || {}),
    ...Object.values(couple.answers?.partner || {}),
  ].filter(Boolean);

  return DATE_PLANS
    .map((plan) => ({
      ...plan,
      score: values.reduce((sum, value) => sum + (plan.weights[value] || 0), 0),
    }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ja'))
    .slice(0, 3);
}

function getQuestionProgress(couple = {}) {
  const answers = couple.answers?.you || {};
  const answeredCount = COUPLE_QUESTIONS.filter((question) => answers[question.id]).length;
  const nextQuestion = COUPLE_QUESTIONS.find((question) => !answers[question.id]) || null;
  return { answeredCount, nextQuestion };
}

function renderCalendarGrid(state, uiState) {
  const selectedDate = uiState.selectedCalendarDate || getTodayDateKey();
  const entries = getCalendarEntriesWithSpecialDates(state, selectedDate);
  const postDates = new Set((state.posts || []).map((post) => getPostDateKey(post)).filter(Boolean));
  const markedDates = new Map();
  entries.forEach((entry) => {
    const current = markedDates.get(entry.date);
    if (entry.specialDateType === 'birthday') {
      markedDates.set(entry.date, 'birthday');
    } else if (entry.specialDateType === 'anniversary' && current !== 'birthday') {
      markedDates.set(entry.date, 'anniversary');
    } else if (!current) {
      markedDates.set(entry.date, 'rose');
    }
  });
  const todayDate = getTodayDateKey();
  const calendarDays = buildCalendarDays(selectedDate, 1);

  return `
    <section class="couple-card couple-calendar-card couple-calendar-card--full">
      <div class="couple-section-head">
        <h1>カレンダー</h1>
        <div class="couple-month">
          <button type="button" aria-label="前の月" data-calendar-month="-1">${getIcon('returnLeft')}</button>
          <span>${getMonthLabel(selectedDate)}</span>
          <button type="button" aria-label="次の月" data-calendar-month="1">${getIcon('chevronRight')}</button>
        </div>
      </div>
      <div class="couple-calendar">
        ${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => `<span class="couple-calendar__dow">${day}</span>`).join('')}
        ${calendarDays.map((calendarDay) => {
          const date = calendarDay.date;
          const mark = markedDates.get(date);
          const hasPage = postDates.has(date);
          const isTodayInActiveMonth = !calendarDay.inactive && date === todayDate;
          return `
            <button
              class="couple-calendar__day ${calendarDay.inactive ? 'is-muted' : ''} ${mark ? `is-marked is-${mark}` : ''} ${hasPage ? 'has-page' : ''} ${isTodayInActiveMonth ? 'is-today' : ''} ${date === selectedDate ? 'is-selected' : ''}"
              type="button"
              data-calendar-date="${date}"
            >${calendarDay.day}</button>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function getDateAddDraft(uiState = {}) {
  return {
    date: uiState.selectedCalendarDate || getTodayDateKey(),
    timeOfDay: 'noon',
    startTime: '11:00',
    endTime: '13:30',
    type: 'cafe',
    title: '',
    place: '',
    note: '',
    ...(uiState.dateAddDraft || {}),
  };
}

function escapeDateAddText(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderDateAddProgress(step) {
  return `
    <div class="date-add-progress" aria-label="追加ステップ">
      <span class="${step >= 1 ? 'is-active' : ''}"></span>
      <span class="${step >= 2 ? 'is-active' : ''}"></span>
    </div>
  `;
}

function renderCalendarDatePopup(state, uiState) {
  const popupDate = uiState.calendarPopupDate || '';
  if (!popupDate) return '';
  const entries = getEntriesForDate(state, popupDate);
  const pages = getPostsForDate(state, popupDate);

  return `
    <div class="calendar-date-popover" role="dialog" aria-modal="false" aria-label="選択日の予定">
      <div class="calendar-date-popover__panel">
        <div class="calendar-date-popover__head">
          <div>
            <p class="couple-kicker">${formatDateLabel(popupDate)}</p>
          </div>
          <button type="button" data-calendar-popup-close aria-label="閉じる">×</button>
        </div>
        ${entries.length ? `
          <div class="calendar-date-popover__list">
            ${entries.map((entry) => `
              <article class="calendar-date-popover__entry">
                <h3>${escapeCalendarText(entry.place || '場所未設定')}</h3>
                <dl>
                  <div><dt>時間</dt><dd>${escapeCalendarText(entry.time || '未設定')}</dd></div>
                  <div><dt>メモ</dt><dd>${escapeCalendarText(entry.note || '未設定')}</dd></div>
                </dl>
                <div class="calendar-date-popover__actions">
                  ${entry.isSpecialDate ? '' : `
                    <button class="calendar-date-popover__icon-button" type="button" data-edit-date-entry="${entry.id}" aria-label="編集">${getIcon('pencil')}</button>
                    <button class="calendar-date-popover__icon-button is-danger" type="button" data-delete-date-entry="${entry.id}" aria-label="削除">${getIcon('trash')}</button>
                  `}
                </div>
              </article>
            `).join('')}
          </div>
        ` : `
          <p class="calendar-date-popover__empty">予定はまだありません。</p>
        `}
        ${pages.length ? `
          <section class="calendar-date-popover__pages" aria-label="この日のページ">
            <h3>この日のページ</h3>
            <div class="calendar-date-popover__page-grid">
              ${pages.map((post) => {
                const title = escapeCalendarText(getPostTitle(post));
                return `
                  <button class="calendar-date-popover__page" type="button" data-open-preview="${post.id}" aria-label="${title}を開く">
                    ${post.imageData ? `<img src="${post.imageData}" alt="${title}" />` : '<span>pages</span>'}
                  </button>
                `;
              }).join('')}
            </div>
          </section>
        ` : ''}
        <div class="calendar-date-popover__footer">
          <span>作成済みページ ${pages.length}</span>
          ${entries.length ? '' : '<button type="button" data-open-date-add>予定を追加</button>'}
        </div>
      </div>
    </div>
  `;
}

function renderDateAddCalendar(uiState) {
  const draft = getDateAddDraft(uiState);
  const calendarDays = buildCalendarDays(draft.date, 0);
  const todayDate = getTodayDateKey();
  return `
    ${renderBrand()}
    <header class="date-add-title">
      <p>STEP 1</p>
      <h1>日付を選ぶ</h1>
    </header>
    ${renderDateAddProgress(1)}
    <section class="couple-card date-add-card">
      <h2>デートの日を選ぶ</h2>
      <div class="couple-month date-add-month">
        <button type="button" aria-label="前の月" data-date-add-month="-1">${getIcon('returnLeft')}</button>
        <span>${getMonthLabel(draft.date)}</span>
        <button type="button" aria-label="次の月" data-date-add-month="1">${getIcon('chevronRight')}</button>
      </div>
      <div class="couple-calendar date-add-calendar">
        ${['日', '月', '火', '水', '木', '金', '土'].map((day) => `<span class="couple-calendar__dow">${day}</span>`).join('')}
        ${calendarDays.map((calendarDay) => {
          const isTodayInActiveMonth = !calendarDay.inactive && calendarDay.date === todayDate;
          return `
            <button
              class="couple-calendar__day ${calendarDay.inactive ? 'is-muted' : ''} ${isTodayInActiveMonth ? 'is-today' : ''} ${calendarDay.date === draft.date ? 'is-marked is-rose is-selected' : ''}"
              type="button"
              data-date-add-date="${calendarDay.date}"
            >${calendarDay.day}</button>
          `;
        }).join('')}
      </div>
    </section>
    <button class="date-add-primary" type="button" data-date-add-next>次へ ${getIcon('chevronRight')}</button>
    <button class="date-add-text-button" type="button" data-date-add-cancel>ホームに戻る</button>
  `;
}

function renderDateAddDetails(uiState) {
  const draft = getDateAddDraft(uiState);
  const dateLabel = formatDateLabel(draft.date);
  return `
    ${renderBrand()}
    <header class="date-add-title">
      <p>${dateLabel}</p>
      <h1>予定を追加</h1>
    </header>
    <form class="date-add-form" data-date-add-form>
      <section class="couple-card date-add-field-card">
        <label>
          <span>開始時間</span>
          <select name="startTime">${renderTimeOptions(draft.startTime)}</select>
        </label>
      </section>
      <section class="couple-card date-add-field-card">
        <label>
          <span>終了時間</span>
          <select name="endTime">${renderTimeOptions(draft.endTime)}</select>
        </label>
      </section>
      <section class="couple-card date-add-field-card">
        <label>
          <span>場所</span>
          <input name="place" value="${escapeDateAddText(draft.place)}" maxlength="40" placeholder="代官山カフェ" />
        </label>
      </section>
      <section class="couple-card date-add-field-card">
        <label>
          <span>メモ</span>
          <textarea name="note" maxlength="120" placeholder="待ち合わせや持ち物など">${escapeDateAddText(draft.note)}</textarea>
        </label>
      </section>
      <div class="date-add-actions">
        <button type="button" data-date-add-cancel>戻る</button>
        <button type="submit">完了</button>
      </div>
    </form>
  `;
}

function renderTimeOptions(selected) {
  const times = ['未定', '09:00', '10:00', '11:00', '12:00', '13:30', '15:00', '17:00', '19:00', '21:00'];
  return times.map((time) => `<option value="${time}" ${selected === time ? 'selected' : ''}>${time}</option>`).join('');
}

function renderDateAddText(uiState) {
  const draft = getDateAddDraft(uiState);
  const isEditing = Boolean(uiState.dateEditingId);
  return `
    ${renderBrand()}
    <header class="date-add-title">
      <p>STEP 3</p>
      <h1>タイトルと場所</h1>
    </header>
    ${renderDateAddProgress(3)}
    <form class="date-add-form" data-date-add-form>
      <section class="couple-card date-add-field-card">
        <label>
          <span>タイトル</span>
          <input name="title" value="${escapeDateAddText(draft.title)}" maxlength="40" placeholder="代官山カフェデート" required />
        </label>
      </section>
      <section class="couple-card date-add-field-card">
        <label>
          <span>場所</span>
          <input name="place" value="${escapeDateAddText(draft.place)}" maxlength="40" placeholder="代官山カフェ" />
        </label>
      </section>
      <section class="couple-card date-add-field-card">
        <label>
          <span>メモ</span>
          <textarea name="note" maxlength="120" placeholder="お気に入りのカフェで、ゆっくり話す。">${escapeDateAddText(draft.note)}</textarea>
        </label>
      </section>
      <div class="date-add-actions">
        <button type="button" data-date-add-back>戻る</button>
        <button type="submit">カレンダーに追加</button>
      </div>
    </form>
  `;
}

function renderDateAdd(state, uiState) {
  return renderDateAddDetails(uiState);
}

function renderDateDetail(state, uiState) {
  const selectedDate = uiState.selectedCalendarDate || getTodayDateKey();
  const entries = getEntriesForDate(state, selectedDate);
  const pages = getPostsForDate(state, selectedDate);
  const entry = entries[0] || null;

  if (!entry) {
    return `
      <section class="couple-card couple-date-detail">
        <p class="couple-kicker">${formatDateLabel(selectedDate)}</p>
        <h2>予定はまだありません</h2>
        <p>この日にデートの予定を追加すると、ここにタイトル・場所・時間が表示されます。</p>
        <div class="couple-date-detail__pages">
          <span>作成済みページ</span>
          <strong>${pages.length}</strong>
        </div>
        <div class="couple-date-detail__actions">
          <button type="button" data-home-nav="compose">ページを作る</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="couple-card couple-date-detail">
      <p class="couple-kicker">${formatDateLabel(selectedDate)}</p>
      <h2>${entry.title}</h2>
      <dl>
        <div><dt>場所</dt><dd>${entry.place || '未設定'}</dd></div>
        <div><dt>時間</dt><dd>${entry.time || '未設定'}</dd></div>
      </dl>
      <p>${entry.note || 'この日の予定をふたりで整えます。'}</p>
      <div class="couple-date-detail__pages">
        <span>作成済みページ</span>
        <strong>${pages.length}</strong>
      </div>
      <div class="couple-date-detail__actions">
        <button type="button" data-edit-date-entry="${entry.id}">編集</button>
        <button class="is-danger" type="button" data-delete-date-entry="${entry.id}">削除</button>
        <button type="button" data-home-nav="compose">ページを作る</button>
        <button type="button" data-couple-view="question">質問を送る</button>
      </div>
    </section>
  `;
}

function renderDateListEntry(entry, isPast = false) {
  return `
    <article class="couple-date-list-card couple-card ${isPast ? 'is-past' : ''}">
      <div>
        <p class="couple-kicker">${formatDateLabel(entry.date)}</p>
        <h2>${entry.title || 'ふたりのデート'}</h2>
        <dl>
          <div><dt>場所</dt><dd>${entry.place || '未設定'}</dd></div>
          <div><dt>時間</dt><dd>${entry.time || '未設定'}</dd></div>
        </dl>
        <p>${entry.note || 'この日の予定をふたりで整えます。'}</p>
      </div>
      <div class="couple-list-actions">
        <button type="button" data-home-calendar-target="${entry.date}">カレンダーで見る ${getIcon('chevronRight')}</button>
        <button type="button" data-edit-date-entry="${entry.id}">編集</button>
        <button class="is-danger" type="button" data-delete-date-entry="${entry.id}">削除</button>
      </div>
    </article>
  `;
}

function isPastDate(dateString) {
  const target = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(target.getTime())) return false;
  return target < today;
}

function renderDateList(state, uiState = {}) {
  const activeTab = uiState.dateListTab === 'past' ? 'past' : 'upcoming';
  const allEntries = (state.couple?.calendarEntries || []);
  const entries = allEntries
    .filter((entry) => activeTab === 'past' ? isPastDate(entry.date) : !isPastDate(entry.date))
    .slice()
    .sort((a, b) => activeTab === 'past'
      ? String(b.date || '').localeCompare(String(a.date || ''))
      : String(a.date || '').localeCompare(String(b.date || '')));

  return `
    ${renderBrand()}
    <header class="couple-page-title">
      <h1>デート予定一覧</h1>
      <p>カレンダーに追加した予定をまとめて確認できます。</p>
    </header>
    <div class="couple-date-tabs" role="tablist" aria-label="予定の表示切り替え">
      <button class="${activeTab === 'upcoming' ? 'is-active' : ''}" type="button" data-date-list-tab="upcoming" role="tab" aria-selected="${activeTab === 'upcoming'}">これから</button>
      <button class="${activeTab === 'past' ? 'is-active' : ''}" type="button" data-date-list-tab="past" role="tab" aria-selected="${activeTab === 'past'}">済み</button>
    </div>
    <section class="couple-date-list-page">
      ${entries.length
        ? entries.map((entry) => renderDateListEntry(entry, activeTab === 'past')).join('')
        : `
          <section class="couple-card couple-date-detail">
            <p class="couple-kicker">予定一覧</p>
            <h2>${activeTab === 'past' ? '済みの予定はまだありません' : 'これからの予定はまだありません'}</h2>
            <p>${activeTab === 'past' ? '日付が過ぎた予定がここに表示されます。' : 'デートを追加すると、ここに一覧で表示されます。'}</p>
          </section>
        `}
    </section>
  `;
}

function renderPageListEntry(post, activePageScope = 'shared') {
  const title = getPostTitle(post);
  const dateText = getPostDateKey(post).replace(/-/g, '.');
  const tags = [
    ...(post.composeData?.recordPhotoTags || []),
    ...(post.recordPhotoTags || []),
    ...(post.freeTags || []),
    ...(post.fixedTags || []),
  ]
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .filter((tag) => !['record', 'completed'].includes(tag.toLowerCase()))
    .filter((tag, index, list) => list.indexOf(tag) === index)
    .slice(0, 5);
  const isCompleted = String(post.id || '').startsWith('completed_');
  const moveTarget = activePageScope === 'personal' ? 'shared' : 'personal';
  const moveLabel = moveTarget === 'personal' ? '個人に表示' : '共有に表示';
  return `
    <article class="couple-album-page">
      <button class="couple-album-page__image" type="button" data-open-preview="${post.id}" aria-label="${title}を開く">
        ${post.imageData ? `<img src="${post.imageData}" alt="${title}" />` : '<span>pages</span>'}
      </button>
      <div class="couple-album-page__meta">
        <p class="couple-kicker">${dateText}</p>
        <h2>${title}</h2>
        <p>${String(post.caption || '作成済みページ').split('/').slice(1).join(' / ') || 'ふたりの記録ページ'}</p>
        <div class="couple-list-actions">
          <button type="button" data-open-preview="${post.id}">ページを見る ${getIcon('chevronRight')}</button>
          ${isCompleted ? `<button type="button" data-move-page-scope="${post.id}" data-move-page-target="${moveTarget}">${moveLabel}</button>` : ''}
          <button class="is-danger" type="button" data-delete-page-entry="${post.id}">削除</button>
        </div>
      </div>
    </article>
  `;
}

function renderPhotoListEntry(memory) {
  const dateText = new Date(memory.createdAt || Date.now()).toLocaleDateString('ja-JP').replace(/\//g, '.');
  const photoId = String(memory.id || '');
  const tags = Array.isArray(memory.tags) ? memory.tags.slice(0, 5) : [];
  return `
    <article class="couple-album-page couple-album-page--photo">
      <button class="couple-album-page__image" type="button" data-open-photo-preview="${photoId}" aria-label="写真を開く">
        ${memory.imageData ? `<img src="${memory.imageData}" alt="" />` : '<span>photo</span>'}
      </button>
      <div class="couple-album-page__meta">
        <p class="couple-kicker">${dateText}</p>
        ${tags.length ? `<div class="couple-album-page__tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      </div>
    </article>
  `;
}

function renderAlbumEmpty(type = 'pages') {
  const isPhoto = type === 'photo';
  return `
    <section class="couple-card couple-date-detail">
      <p class="couple-kicker">${isPhoto ? 'photo' : 'pages'}</p>
      <h2>${isPhoto ? '写真はまだありません' : 'ページはまだありません'}</h2>
      <p>${isPhoto ? '記録で写真を残すと、ここに一覧で表示されます。' : 'ページを作ると、ここに一覧で表示されます。'}</p>
      ${isPhoto ? '' : `
        <div class="couple-date-detail__actions">
          <button type="button" data-home-nav="compose">ページを作る</button>
        </div>
      `}
    </section>
  `;
}

function renderPageList(state, uiState = {}) {
  const activeAlbumTab = uiState.albumTab === 'photo' ? 'photo' : 'pages';
  const hasPartner = Boolean(uiState.partnerProfile?.hasPartner);
  const activePageScope = !hasPartner || uiState.albumPageScope === 'personal' ? 'personal' : 'shared';
  const activePhotoScope = !hasPartner || uiState.albumPhotoScope === 'personal' ? 'personal' : 'shared';
  const albumTagQuery = String(uiState.albumTagQuery || '').trim().toLowerCase();
  const posts = (state.posts || [])
    .filter((post) => {
      if (activeAlbumTab !== 'pages') return true;
      if (!hasPartner) return true;
      if (!String(post.id || '').startsWith('completed_')) return activePageScope === 'shared';
      return (post.storageScope || 'shared') === activePageScope;
    })
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const photos = (state.recordMemories || [])
    .filter((memory) => memory.imageData || memory.storagePath || memory.thumbnailPath)
    .filter((memory) => {
      const fallbackScope = hasPartner ? 'shared' : 'personal';
      const memoryScope = memory.storageScope === 'personal' || memory.saveScope === 'personal' ? 'personal' : fallbackScope;
      return memoryScope === activePhotoScope;
    })
    .filter((memory) => {
      if (!albumTagQuery) return true;
      const haystack = [
        memory.place,
        memory.price,
        memory.timeOfDay,
        memory.atmosphere,
        memory.weather,
        memory.mood,
        ...(Array.isArray(memory.tags) ? memory.tags : []),
      ].join(' ').toLowerCase();
      return haystack.includes(albumTagQuery);
    })
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const items = activeAlbumTab === 'photo' ? photos : posts;

  return `
    ${renderBrand()}
    <header class="couple-page-title">
      <h1>pages</h1>
      <p>作成済みページを一覧で確認できます。</p>
    </header>
    <div class="couple-album-tabs" role="tablist" aria-label="アルバム表示">
      <button class="${activeAlbumTab === 'pages' ? 'is-active' : ''}" type="button" data-album-tab="pages" role="tab" aria-selected="${activeAlbumTab === 'pages'}">pages</button>
      <button class="${activeAlbumTab === 'photo' ? 'is-active' : ''}" type="button" data-album-tab="photo" role="tab" aria-selected="${activeAlbumTab === 'photo'}">photos</button>
    </div>
    ${activeAlbumTab === 'pages' ? `
      <div class="couple-album-tabs" role="tablist" aria-label="ページ保存先">
        <button class="${activePageScope === 'shared' ? 'is-active' : ''}${!hasPartner ? ' is-disabled' : ''}" type="button" data-album-page-scope="shared" role="tab" aria-selected="${activePageScope === 'shared'}" ${!hasPartner ? 'disabled aria-disabled="true"' : ''}>共有ページ</button>
        <button class="${activePageScope === 'personal' ? 'is-active' : ''}" type="button" data-album-page-scope="personal" role="tab" aria-selected="${activePageScope === 'personal'}">個人ページ</button>
      </div>
    ` : ''}
    ${activeAlbumTab === 'photo' ? `
      <div class="couple-album-tabs" role="tablist" aria-label="photo scope">
        <button class="${activePhotoScope === 'shared' ? 'is-active' : ''}${!hasPartner ? ' is-disabled' : ''}" type="button" data-album-photo-scope="shared" role="tab" aria-selected="${activePhotoScope === 'shared'}" ${!hasPartner ? 'disabled aria-disabled="true"' : ''}>共有写真</button>
        <button class="${activePhotoScope === 'personal' ? 'is-active' : ''}" type="button" data-album-photo-scope="personal" role="tab" aria-selected="${activePhotoScope === 'personal'}">個人写真</button>
      </div>
    ` : ''}
    ${activeAlbumTab === 'photo' ? `
      <label class="couple-album-tag-search">
        <span>タグ検索</span>
        <input type="search" data-album-tag-search value="${escapeHtml(uiState.albumTagQuery || '')}" placeholder="場所・値段・雰囲気・天気・気分" />
      </label>
    ` : ''}
    <section class="couple-date-list-page couple-album-grid">
      ${items.length
        ? (activeAlbumTab === 'photo' ? photos.map(renderPhotoListEntry).join('') : posts.map((post) => renderPageListEntry(post, activePageScope)).join(''))
        : `
          <section class="couple-card couple-date-detail">
            <p class="couple-kicker">pages</p>
            <h2>ページはまだありません</h2>
            <p>ページを作ると、ここに一覧で表示されます。</p>
            <div class="couple-date-detail__actions">
              <button type="button" data-home-nav="compose">ページを作る</button>
            </div>
          </section>
        `}
    </section>
  `;
}

function getDraftTitle(draft) {
  const title = String(draft.title || draft.composeData?.headline || '').trim();
  return title && title.toLowerCase() !== 'text' ? title : '下書きページ';
}

function renderDraftListEntry(draft) {
  const title = getDraftTitle(draft);
  const dateText = new Date(draft.updatedAt || draft.createdAt || Date.now()).toLocaleDateString('ja-JP').replace(/\//g, '.');
  return `
    <article class="couple-page-list-card couple-card">
      <button class="couple-page-list-card__media" type="button" data-open-draft="${draft.id}" aria-label="${title}を開く">
        ${draft.imageData ? `<img src="${draft.imageData}" alt="${title}" />` : '<span>draft</span>'}
      </button>
      <div>
        <p class="couple-kicker">${dateText}</p>
        <h2>${title}</h2>
        <p>編集中のページ</p>
        <div class="couple-list-actions">
          <button type="button" data-open-draft="${draft.id}">編集する ${getIcon('chevronRight')}</button>
          <button class="is-danger" type="button" data-delete-draft-entry="${draft.id}">削除</button>
        </div>
      </div>
    </article>
  `;
}

function renderDraftList(state) {
  const drafts = (state.drafts || [])
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  return `
    ${renderBrand()}
    <button class="couple-list-back" type="button" data-list-back>${getIcon('returnLeft')} 戻る</button>
    <header class="couple-page-title">
      <h1>draft</h1>
      <p>編集中のページを一覧で確認できます。</p>
    </header>
    <section class="couple-date-list-page">
      ${drafts.length
        ? drafts.map(renderDraftListEntry).join('')
        : `
          <section class="couple-card couple-date-detail">
            <p class="couple-kicker">draft</p>
            <h2>下書きはまだありません</h2>
            <p>保存した下書きが、ここに一覧で表示されます。</p>
            <div class="couple-date-detail__actions">
              <button type="button" data-home-nav="compose">ページを作る</button>
            </div>
          </section>
        `}
    </section>
  `;
}

function renderTodoListEntry(todo) {
  const title = escapeCalendarText(todo.title || 'やりたいこと');
  const authorName = escapeCalendarText(todo.authorName || 'you');
  return `
    <article class="couple-todo-list-card couple-card ${todo.done ? 'is-done' : ''}">
      <div>
        <h2>${title}</h2>
        <p class="couple-todo-list-card__author">設定：${authorName}</p>
      </div>
      <div class="couple-todo-controls">
        <button
          class="couple-todo-check"
          type="button"
          data-toggle-couple-todo="${todo.id}"
          aria-label="${title}を${todo.done ? '未完了' : '完了'}にする"
          aria-pressed="${todo.done}"
        >
          ${todo.done ? '✓' : ''}
        </button>
        <button class="couple-todo-delete" type="button" data-delete-todo-entry="${todo.id}">削除</button>
      </div>
    </article>
  `;
}

function renderTodoInputCard() {
  return `
    <form class="couple-todo-input-card couple-card" data-todo-form>
      <input name="todoTitle" type="text" maxlength="50" placeholder="" autocomplete="off" required />
      <div>
        <button type="button" data-todo-input-cancel>キャンセル</button>
        <button type="submit">決定</button>
      </div>
    </form>
  `;
}

function renderTodoList(state, uiState = {}) {
  const todos = state.couple?.todos || [];
  const activeTodoTab = uiState.todoListTab === 'done' ? 'done' : 'pending';
  const filteredTodos = todos.filter((todo) => activeTodoTab === 'done' ? todo.done : !todo.done);
  const emptyTitle = activeTodoTab === 'done' ? '済のやりたいことはまだありません' : '未のやりたいことはまだありません';
  const emptyCopy = activeTodoTab === 'done'
    ? 'チェックをつけたものがここに表示されます。'
    : 'これからやりたいことを追加してください。';

  return `
    ${renderBrand()}
    <button class="couple-list-back" type="button" data-list-back>${getIcon('returnLeft')} 戻る</button>
    <header class="couple-page-title">
      <h1>やりたいことリスト</h1>
    </header>
    <div class="couple-todo-tabs" role="tablist" aria-label="やりたいこと表示">
      <button class="${activeTodoTab === 'pending' ? 'is-active' : ''}" type="button" data-todo-list-tab="pending" role="tab" aria-selected="${activeTodoTab === 'pending'}">未</button>
      <button class="${activeTodoTab === 'done' ? 'is-active' : ''}" type="button" data-todo-list-tab="done" role="tab" aria-selected="${activeTodoTab === 'done'}">済</button>
    </div>
    <section class="couple-date-list-page">
      ${uiState.todoInputOpen ? renderTodoInputCard() : ''}
      ${filteredTodos.length
        ? filteredTodos.map(renderTodoListEntry).join('')
        : `
          <section class="couple-card couple-date-detail">
            <p class="couple-kicker">todo</p>
            <h2>${emptyTitle}</h2>
            <p>${emptyCopy}</p>
          </section>
        `}
    </section>
    <button class="couple-todo-fab" type="button" data-open-todo-input aria-label="やりたいことを追加">+</button>
  `;
}

const PROFILE_SHEET_FIELDS = [
  ['name', 'name', 24.8, 11.2, 24.4, 1.8],
  ['nickname', 'nickname', 27.0, 15.2, 22.4, 1.8],
  ['birthdayYear', 'birthday year', 26.4, 18.9, 3.2, 1.5],
  ['birthdayMonth', 'birthday month', 33.8, 18.9, 2.6, 1.5],
  ['birthdayDay', 'birthday day', 40.9, 18.9, 2.6, 1.5],
  ['zodiac', 'zodiac', 24.0, 24.0, 10.8, 1.8],
  ['bloodType', 'blood type', 70.0, 11.2, 18.0, 1.8],
  ['favoriteColor', 'favorite color', 70.0, 15.2, 18.0, 1.8],
  ['favoriteThing', 'favorite thing', 70.0, 19.2, 18.0, 1.8],
  ['x', 'X', 21.2, 29.8, 16.0, 1.8],
  ['instagram', 'Instagram', 47.3, 29.8, 16.8, 1.8],
  ['otherSns', 'other SNS', 73.0, 29.8, 17.5, 1.8],
  ['favoriteFood', 'favorite food', 5.5, 44.2, 10.8, 4.1, 'textarea'],
  ['favoriteDrink', 'favorite drink', 20.2, 44.2, 10.8, 4.1, 'textarea'],
  ['favoriteAnimal', 'favorite animal', 35.0, 44.2, 10.8, 4.1, 'textarea'],
  ['favoriteGame', 'favorite game', 5.5, 55.1, 10.8, 4.1, 'textarea'],
  ['favoriteAnime', 'favorite anime', 20.2, 55.1, 10.8, 4.1, 'textarea'],
  ['favoriteCharacter', 'favorite character', 35.0, 55.1, 10.8, 4.1, 'textarea'],
  ['favoriteSong', 'favorite song', 5.5, 66.5, 10.8, 4.1, 'textarea'],
  ['favoriteArtist', 'favorite artist', 20.2, 66.5, 10.8, 4.1, 'textarea'],
  ['favoriteCelebrity', 'favorite celebrity', 35.0, 66.5, 10.8, 4.1, 'textarea'],
  ['bestTitle', 'MY BEST 3 title', 15.0, 82.7, 26.5, 1.8],
  ['best1', 'best 1', 14.4, 86.9, 27.5, 1.9],
  ['best2', 'best 2', 14.4, 91.0, 27.5, 1.9],
  ['best3', 'best 3', 14.4, 95.0, 27.5, 1.9],
  ['dateSpot', 'date spot', 60.0, 43.2, 32.8, 2.5, 'textarea'],
  ['freeTime', 'free time', 60.0, 50.6, 32.8, 2.5, 'textarea'],
  ['admiredPerson', 'admired person', 60.0, 58.1, 32.8, 2.5, 'textarea'],
  ['oshiPerson', 'oshi person', 60.0, 65.6, 32.8, 2.5, 'textarea'],
  ['recentHappy', 'recent happy', 60.0, 73.1, 32.8, 2.5, 'textarea'],
  ['freeSpace', 'free space', 53.2, 84.2, 42.0, 11.5, 'textarea'],
];

export { PROFILE_SHEET_FIELDS };

function renderProfileBook(state) {
  const profile = state.profile || {};
  const sheet = profile.profileSheet || {};
  const profileName = String(profile.name || 'you').trim() || 'you';
  const birthdayParts = String(profile.birthday || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const fields = PROFILE_SHEET_FIELDS;
  const legacyFields = [
    ['name', 'なまえ', 18.3, 11.5, 31.0, 2.7],
    ['nickname', 'ニックネーム', 18.3, 15.5, 31.0, 2.7],
    ['birthdayYear', '生まれた年', 31.0, 19.5, 8.4, 2.7],
    ['birthdayMonth', '月', 42.8, 19.5, 6.2, 2.7],
    ['birthdayDay', '日', 53.0, 19.5, 6.2, 2.7],
    ['zodiac', 'せいざ', 18.3, 23.4, 16.2, 2.7],
    ['bloodType', 'けつえきがた', 60.0, 11.5, 31.0, 2.7],
    ['favoriteColor', 'すきないろ', 60.0, 15.5, 31.0, 2.7],
    ['favoriteThing', 'すきなもの', 60.0, 19.5, 31.0, 2.7],
    ['x', 'X', 20.0, 29.1, 18.0, 2.4],
    ['instagram', 'Instagram', 46.2, 29.1, 18.6, 2.4],
    ['otherSns', 'その他', 72.0, 29.1, 18.6, 2.4],
    ['favoriteFood', '食べ物', 7.8, 43.3, 10.8, 4.4],
    ['favoriteDrink', '飲み物', 22.8, 43.3, 10.8, 4.4],
    ['favoriteAnimal', '動物', 37.9, 43.3, 10.8, 4.4],
    ['favoriteGame', 'ゲーム', 7.8, 53.6, 10.8, 4.4],
    ['favoriteAnime', 'アニメ・漫画', 22.8, 53.6, 10.8, 4.4],
    ['favoriteCharacter', 'キャラクター', 37.9, 53.6, 10.8, 4.4],
    ['favoriteSong', '歌', 7.8, 64.0, 10.8, 4.4],
    ['favoriteArtist', 'アーティスト', 22.8, 64.0, 10.8, 4.4],
    ['favoriteCelebrity', '有名人', 37.9, 64.0, 10.8, 4.4],
    ['bestTitle', 'MY BEST 3 title', 9.8, 81.3, 32.0, 2.5],
    ['best1', '1位', 13.2, 85.1, 27.5, 2.5],
    ['best2', '2位', 13.2, 89.3, 27.5, 2.5],
    ['best3', '3位', 13.2, 93.5, 27.5, 2.5],
    ['dateSpot', '一番好きなデートスポット', 60.2, 41.5, 32.0, 4.4, 'textarea'],
    ['freeTime', 'ヒマなときなにしてる？', 60.2, 50.2, 32.0, 4.4, 'textarea'],
    ['admiredPerson', '憧れてる人は？', 60.2, 58.9, 32.0, 4.4, 'textarea'],
    ['oshiPerson', '好きな人、推してる人は？', 60.2, 67.6, 32.0, 4.4, 'textarea'],
    ['recentHappy', '最近うれしかったことは？', 60.2, 76.3, 32.0, 4.4, 'textarea'],
    ['freeSpace', 'FREE SPACE', 55.5, 86.6, 36.5, 9.0, 'textarea'],
  ];
  const renderField = ([name, label, left, top, width, height, type = 'input']) => {
    const style = `--x:${left}%;--y:${top}%;--w:${width}%;--h:${height}%;`;
    const fallbackValues = {
      name: profileName,
      birthdayYear: birthdayParts?.[1] || '',
      birthdayMonth: birthdayParts?.[2] || '',
      birthdayDay: birthdayParts?.[3] || '',
    };
    const value = escapeDateAddText(sheet[name] || fallbackValues[name] || '');
    const numericAttrs = name.startsWith('birthday')
      ? ' inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off"'
      : ' autocomplete="off"';
    if (type === 'textarea') {
      return `<textarea class="couple-profile-sheet-field" style="${style}" name="${name}" aria-label="${label}">${value}</textarea>`;
    }
    return `<input class="couple-profile-sheet-field" style="${style}" name="${name}" value="${value}" aria-label="${label}"${numericAttrs} />`;
  };
  return `
    ${renderBrand()}
    <button class="couple-list-back" type="button" data-list-back>${getIcon('returnLeft')} 戻る</button>
    <header class="couple-page-title">
      <h1>${escapeDateAddText(profileName)}の記録</h1>
    </header>
    <section class="couple-date-list-page">
      <form class="couple-profile-sheet-form" data-profile-book-form>
        <div class="couple-profile-sheet">
          <img src="./image/profile_sheets/profile_sheet1.png" alt="" />
          ${fields.map(renderField).join('')}
        </div>
        <div class="couple-profile-sheet-actions">
          <button class="couple-profile-sheet-save" type="submit">保存</button>
          <button class="couple-profile-sheet-save" type="button" data-profile-sheet-save-image>端末に保存</button>
        </div>
      </form>
    </section>
  `;
}

const MISSION_PATTERN_ONE = [
  '&#12484;&#12540;&#12471;&#12519;&#12483;&#12488;&#20889;&#30495;&#12434;&#25774;&#12427;',
  '&#20889;&#30495;&#12434;5&#26522;&#20197;&#19978;&#25774;&#12427;',
  '&#30456;&#25163;&#12398;&#22909;&#12365;&#12394;&#12392;&#12371;&#12429;&#12434;&#19977;&#12388;&#20253;&#12360;&#12427;',
];

function renderMissionListPage() {
  return `
    ${renderBrand()}
    <button class="couple-list-back" type="button" data-list-back>${getIcon('returnLeft')} &#25147;&#12427;</button>
    <header class="couple-page-title">
      <h1>&#12511;&#12483;&#12471;&#12519;&#12531;&#12522;&#12473;&#12488;</h1>
    </header>
    <section class="couple-date-list-page couple-mission-page">
      <div class="couple-card couple-mission-card">
        ${MISSION_PATTERN_ONE.map((mission, index) => `
          <div class="couple-mission-card__row">
            <span>${index + 1}</span>
            <p>${mission}</p>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderQuestionOption(question, option, selectedValue) {
  return `
    <button
      class="couple-answer-option ${selectedValue === option.value ? 'is-selected' : ''}"
      type="button"
      data-couple-answer="${question.id}"
      data-couple-answer-value="${option.value}"
    >
      ${option.icon ? `<span class="couple-answer-option__icon">${getIcon(option.icon)}</span>` : ''}
      <span>${option.label}</span>
      ${selectedValue === option.value ? '<i aria-hidden="true">✓</i>' : ''}
    </button>
  `;
}

function renderQuestion(state) {
  const couple = state.couple || {};
  const { answeredCount, nextQuestion } = getQuestionProgress(couple);
  if (!nextQuestion) return renderRecommendations(state);
  const selectedValue = couple.answers?.you?.[nextQuestion.id] || '';

  return `
    ${renderBrand()}
    <div class="couple-progress">
      <strong>${answeredCount + 1}</strong><span>/ ${COUPLE_QUESTIONS.length}</span>
      <div><span style="width: ${((answeredCount + 1) / COUPLE_QUESTIONS.length) * 100}%"></span></div>
    </div>
    <section class="couple-card couple-question-card">
      <h1>${nextQuestion.title}</h1>
      <div class="couple-answer-grid ${nextQuestion.options.length <= 3 ? 'couple-answer-grid--compact' : ''}">
        ${nextQuestion.options.map((option) => renderQuestionOption(nextQuestion, option, selectedValue)).join('')}
      </div>
    </section>
    <section class="couple-card couple-wait-card">
      <span aria-hidden="true">${getIcon('heart')}</span>
      <p>相手の回答が届くと、おすすめが表示されます</p>
    </section>
  `;
}

function renderMoodSummary(couple = {}) {
  const labelByValue = Object.fromEntries(COUPLE_QUESTIONS.flatMap((question) => question.options.map((option) => [option.value, option.label])));
  return `
    <section class="couple-card couple-mood-summary">
      <p>ふたりの気分</p>
      <div>
        <span>${labelByValue[couple.answers?.you?.mood] || '未回答'}</span>
        <strong aria-hidden="true">♥</strong>
        <span>${labelByValue[couple.answers?.partner?.mood] || '未回答'}</span>
      </div>
    </section>
  `;
}

function renderPlan(plan, calendarEntries = []) {
  const added = calendarEntries.some((entry) => entry.planId === plan.id);
  return `
    <article class="couple-plan-card couple-card">
      <img src="${plan.image}" alt="${plan.title}" />
      <div>
        <h3>${plan.title}</h3>
        <p>${plan.copy}</p>
        <div class="couple-plan-card__tags">${plan.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
        <button type="button" data-add-date-plan="${plan.id}" ${added ? 'disabled' : ''}>
          ${added ? '追加済み' : 'この日に追加'} ${getIcon('chevronRight')}
        </button>
      </div>
    </article>
  `;
}

function renderRecommendations(state) {
  const couple = state.couple || {};
  const plans = getCoupleRecommendations(couple);
  return `
    ${renderBrand()}
    <header class="couple-page-title">
      <h1>おすすめデート</h1>
      <p>ふたりの気分から、ぴったりのプランを選びました。</p>
    </header>
    ${renderMoodSummary(couple)}
    <section class="couple-plan-list">
      <h2>ふたりに合うプラン</h2>
      ${plans.map((plan) => renderPlan(plan, couple.calendarEntries || [])).join('')}
      <button class="couple-refresh" type="button" data-reset-couple-answers>別のプランを探す</button>
    </section>
  `;
}

function renderCalendar(state, uiState) {
  return `
    ${renderBrand()}
    ${renderCalendarGrid(state, uiState)}
    ${renderCalendarDatePopup(state, uiState)}
    ${renderDateDetail(state, uiState)}
    <section class="couple-card couple-question-entry">
      <div>
        <p class="couple-kicker">デートの種</p>
        <h2>次の予定の前に、ふたりの気分を合わせる</h2>
      </div>
      <button type="button" data-couple-view="question">質問をはじめる</button>
    </section>
  `;
}

export function renderSearch(state, uiState = {}) {
  const view = uiState.coupleView || 'calendar';
  const body = view === 'question'
    ? renderQuestion(state)
    : view === 'recommend'
      ? renderRecommendations(state)
      : view === 'dateAdd'
        ? renderDateAdd(state, uiState)
        : view === 'dateList'
          ? renderDateList(state, uiState)
          : view === 'pageList'
            ? renderPageList(state, uiState)
            : view === 'draftList'
              ? renderDraftList(state)
              : view === 'todoList'
                ? renderTodoList(state, uiState)
                : view === 'profileBook'
                  ? renderProfileBook(state)
                  : view === 'missionList'
                    ? renderMissionListPage()
                    : renderCalendar(state, uiState);

  return `
    <section class="page page--search couple-calendar-page ${view === 'profileBook' ? 'couple-calendar-page--profile-book' : ''}">
      <div class="couple-screen">${body}</div>
    </section>
  `;
}
