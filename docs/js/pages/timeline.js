import { getIcon } from '../components/icons.js';
import { getPostDateKey } from '../utils/date.js';
import { getCalendarEntriesWithSpecialDates, getEntriesForDateWithSpecialDates } from '../utils/specialDates.js';

function renderBrand() {
  return `
    <div class="couple-brand" aria-label="BURN">
      <p class="couple-brand__word">BURN</p>
      <div class="couple-brand__line" aria-hidden="true">
        <span></span><span></span>
      </div>
    </div>
  `;
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTodayDateKey() {
  const date = new Date();
  return formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
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

function buildCalendarDays(dateString) {
  const { year, month } = parseDateKey(dateString);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const leadingDays = (firstDay - 1 + 7) % 7;
  const startDate = new Date(year, month - 1, 1 - leadingDays);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date: formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate()),
      day: date.getDate(),
      inactive: date.getFullYear() !== year || date.getMonth() !== month - 1,
    };
  });
}

function getMonthLabel(dateString) {
  const { year, month } = parseDateKey(dateString);
  return `${year}年${month}月`;
}

function getPostTitle(post) {
  const headline = String(post.composeData?.headline || '').trim();
  if (headline && headline.toLowerCase() !== 'text') return headline;
  const caption = String(post.caption || '').split('/')[0].trim();
  return caption || 'ふたりのページ';
}

function getPostsForDate(state = {}, dateString = '') {
  return (state.posts || [])
    .filter((post) => getPostDateKey(post) === dateString)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function escapeCalendarText(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSelectedDatePages(posts = []) {
  const post = posts[0];
  if (!post) {
    return '<div class="couple-selected-date__page couple-selected-date__page--empty"><span>pages</span></div>';
  }

  const title = getPostTitle(post);
  return `
    <button class="couple-selected-date__page" type="button" data-open-preview="${post.id}" aria-label="${title}を開く">
      ${post.imageData ? `<img src="${post.imageData}" alt="${title}" />` : '<span>pages</span>'}
    </button>
  `;
}

function renderDateActions(entry) {
  if (!entry?.id || entry.isSpecialDate) return '';
  return `
    <div class="couple-list-actions couple-date-card-actions">
      <button type="button" data-home-edit-date-entry="${entry.id}" aria-label="予定を編集">
        ${getIcon('pencil')}
      </button>
      <button class="is-danger" type="button" data-home-delete-date-entry="${entry.id}" aria-label="予定を削除">
        ${getIcon('trash')}
      </button>
    </div>
  `;
}

function renderNextDateButton(couple = {}) {
  const nextEntry = (couple.calendarEntries || []).find((entry) => entry.id === couple.nextDateId)
    || (couple.calendarEntries || [])[0];

  if (!nextEntry) {
    return `
      <article class="couple-next-date-column couple-card">
        <p class="couple-kicker">次のデート</p>
        <h2>未定</h2>
        <p>予定はまだありません。</p>
      </article>
    `;
  }

  const date = nextEntry?.date ? new Date(`${nextEntry.date}T00:00:00`) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? `${date.getMonth() + 1}/${date.getDate()} ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}`
    : '';
  const title = nextEntry.title || 'ふたりの予定';
  const time = nextEntry.time || '時間未設定';
  const place = nextEntry.place || '場所未設定';

  return `
    <article class="couple-next-date-column couple-card" data-home-calendar-date="${nextEntry.date || getTodayDateKey()}">
      <p class="couple-kicker">次のデート</p>
      <h2>${dateLabel}</h2>
      <p>${title}</p>
      <p>${time}</p>
      <p>${place}</p>
      ${renderDateActions(nextEntry)}
    </article>
  `;
}

function renderSelectedDateInfo(couple = {}, selectedDate = '') {
  const dateKey = selectedDate || getTodayDateKey();
  const entry = (couple.calendarEntries || []).find((item) => item.date === dateKey);
  const date = new Date(`${dateKey}T00:00:00`);
  const dateLabel = !Number.isNaN(date.getTime())
    ? `${date.getMonth() + 1}/${date.getDate()} ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}`
    : dateKey;

  if (!entry) {
    return `
      <article class="couple-selected-date-info couple-card">
        <p class="couple-kicker">選択した日</p>
        <h2>${dateLabel}</h2>
        <p>予定はまだありません。</p>
      </article>
    `;
  }

  return `
    <article class="couple-selected-date-info couple-card">
      <p class="couple-kicker">選択した日</p>
      <h2>${dateLabel}</h2>
      <p>${entry.title || 'ふたりの予定'}</p>
      <p>${entry.time || '時間未設定'}</p>
      <p>${entry.place || '場所未設定'}</p>
      ${renderDateActions(entry)}
    </article>
  `;
}

function renderCalendarDynamic(state = {}, selectedDate = '') {
  const couple = state.couple || {};
  const displayEntries = getCalendarEntriesWithSpecialDates(state, selectedDate || getTodayDateKey());
  const nextEntry = displayEntries.find((entry) => entry.id === couple.nextDateId)
    || displayEntries[0];
  const monthDate = selectedDate || nextEntry?.date || getTodayDateKey();
  const calendarDays = buildCalendarDays(monthDate);
  const todayDate = getTodayDateKey();
  const markedDates = new Map();
  getCalendarEntriesWithSpecialDates(state, monthDate).forEach((entry, index) => {
    const current = markedDates.get(entry.date);
    if (entry.specialDateType === 'birthday') {
      markedDates.set(entry.date, 'birthday');
    } else if (entry.specialDateType === 'anniversary' && current !== 'birthday') {
      markedDates.set(entry.date, 'anniversary');
    } else if (!current) {
      markedDates.set(entry.date, index % 2 === 0 ? 'rose' : 'sand');
    }
  });
  return `
    <section class="couple-card couple-calendar-card" aria-label="カレンダー">
      <div class="couple-section-head">
        <h1>カレンダー</h1>
        <div class="couple-month">
          <button type="button" aria-label="前の月" data-home-calendar-month="-1">${getIcon('returnLeft')}</button>
          <span>${getMonthLabel(monthDate)}</span>
          <button type="button" aria-label="次の月" data-home-calendar-month="1">${getIcon('chevronRight')}</button>
        </div>
      </div>
      <div class="couple-calendar">
        ${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => `<span class="couple-calendar__dow">${day}</span>`).join('')}
        ${calendarDays.map((calendarDay) => {
          const mark = markedDates.get(calendarDay.date);
          const isTodayInActiveMonth = !calendarDay.inactive && calendarDay.date === todayDate;
          return `
            <button
              class="couple-calendar__day ${calendarDay.inactive ? 'is-muted' : ''} ${mark ? `has-date is-marked is-${mark}` : ''} ${isTodayInActiveMonth ? 'is-today' : ''} ${calendarDay.date === selectedDate ? 'is-selected' : ''}"
              type="button"
              data-home-calendar-date="${calendarDay.date}"
            >${calendarDay.day}</button>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderSelectedDatePlan(state = {}, couple = {}, selectedDate = '') {
  const dateKey = selectedDate || getTodayDateKey();
  const posts = getPostsForDate(state, dateKey);

  return `
    <section class="couple-selected-date-row" aria-label="選択した日と次のデート">
      <article class="couple-selected-date couple-card">
        ${renderSelectedDatePages(posts)}
      </article>
      <div class="couple-date-side-column">
        ${renderNextDateButton(couple)}
        ${renderSelectedDateInfo(couple, dateKey)}
      </div>
    </section>
  `;
}

function renderCalendarDatePopup(state = {}, uiState = {}) {
  const popupDate = uiState.calendarPopupDate || '';
  if (!popupDate) return '';
  const entries = getEntriesForDateWithSpecialDates(state, popupDate);
  const posts = getPostsForDate(state, popupDate);
  const date = new Date(`${popupDate}T00:00:00`);
  const dateLabel = !Number.isNaN(date.getTime())
    ? `${date.getMonth() + 1}/${date.getDate()} ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}`
    : popupDate;

  return `
    <div class="calendar-date-popover" role="dialog" aria-modal="false" aria-label="選択日の予定">
      <div class="calendar-date-popover__panel">
        <div class="calendar-date-popover__head">
          <div>
            <p class="couple-kicker">${dateLabel}</p>
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
                ${renderDateActions(entry)}
              </article>
            `).join('')}
          </div>
        ` : `
          <p class="calendar-date-popover__empty">予定はまだありません。</p>
        `}
        ${posts.length ? `
          <section class="calendar-date-popover__pages" aria-label="この日のページ">
            <h3>この日のページ</h3>
            <div class="calendar-date-popover__page-grid">
              ${posts.map((post) => {
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
          <span>作成済みページ ${posts.length}</span>
          ${entries.length ? '' : '<button type="button" data-open-date-add>予定を追加</button>'}
        </div>
      </div>
    </div>
  `;
}

function renderHomeTodoRows(todos = []) {
  const visibleTodos = todos
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 3);

  if (!visibleTodos.length) {
    return '<p class="futari-dashboard-todo__empty">やりたいことを追加してください</p>';
  }

  return visibleTodos.map((todo) => {
    const title = escapeCalendarText(todo.title || 'やりたいこと');
    const authorName = escapeCalendarText(todo.authorName || 'you');
    return `
      <button class="futari-dashboard-todo__row ${todo.done ? 'is-done' : ''}" type="button" data-profile-toggle-todo="${escapeCalendarText(todo.id)}">
        <span class="futari-dashboard-todo__check" aria-hidden="true">${todo.done ? getIcon('check') : ''}</span>
        <span class="futari-dashboard-todo__body">
          <span class="futari-dashboard-todo__title">${title}</span>
          <span class="futari-dashboard-todo__author">設定：${authorName}</span>
        </span>
      </button>
    `;
  }).join('');
}

function renderHomeQuickCards(couple = {}) {
  const todos = couple.todos || [];
  return `
    <section class="couple-home-quick">
      <section class="futari-dashboard-todo futari-dashboard-card couple-home-quick__todo">
        <div class="futari-dashboard-section-head">
          <h2>やりたいこと</h2>
          <button type="button" data-open-todo-list aria-label="やりたいことリストを開く">${getIcon('chevronRight')}</button>
        </div>
        <div class="futari-dashboard-todo__list">
          ${renderHomeTodoRows(todos)}
        </div>
        <button class="futari-dashboard-add" type="button" data-profile-open-todo-list>
          <span>+</span>
          追加する
        </button>
      </section>
      <section class="couple-card couple-home-actions-card" aria-label="ホーム操作">
        <button class="couple-home-action-button" type="button" data-home-open-camera>
          <span class="couple-home-action-button__icon">${getIcon('camera')}</span>
        </button>
      </section>
    </section>
  `;
}

export function renderHome(state, uiState = {}) {
  const selectedDate = uiState.selectedCalendarDate || getTodayDateKey();
  return `
    <section class="page couple-home">
      <div class="couple-screen">
        ${renderBrand()}
        ${renderCalendarDynamic(state, selectedDate)}
        ${renderHomeQuickCards(state.couple || {})}
        ${renderCalendarDatePopup(state, uiState)}
      </div>
    </section>
  `;
}

export function renderTimeline(state, uiState = {}) {
  return renderHome(state, uiState);
}
