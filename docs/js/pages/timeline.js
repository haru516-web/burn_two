import { getIcon } from '../components/icons.js';

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
    .filter((post) => post.createdAt?.slice(0, 10) === dateString)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderSelectedDatePages(posts = []) {
  const post = posts[0];
  if (!post) {
    return '<div class="couple-selected-date__page couple-selected-date__page--empty"><span>pages</span></div>';
  }

  const title = getPostTitle(post);
  return `
    <button class="couple-selected-date__page" type="button" data-open-preview="${post.id}" aria-label="selected page">
      ${post.imageData ? `<img src="${post.imageData}" alt="${title}" />` : '<span>pages</span>'}
    </button>
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
    </article>
  `;
}
function renderCalendarDynamic(couple = {}, selectedDate = '') {
  const nextEntry = (couple.calendarEntries || []).find((entry) => entry.id === couple.nextDateId)
    || (couple.calendarEntries || [])[0];
  const monthDate = selectedDate || nextEntry?.date || getTodayDateKey();
  const calendarDays = buildCalendarDays(monthDate);
  const todayDate = getTodayDateKey();
  const markedDates = new Map((couple.calendarEntries || []).map((entry, index) => [
    entry.date,
    index % 2 === 0 ? 'rose' : 'sand',
  ]));
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
      <button class="couple-add-date-fab" type="button" aria-label="デートを追加" data-open-date-add>
        <span aria-hidden="true">+</span>
      </button>
    </section>
  `;
}

function renderSelectedDatePlan(state = {}, couple = {}, selectedDate = '') {
  const dateKey = selectedDate || getTodayDateKey();
  const posts = getPostsForDate(state, dateKey);

  return `
    <section class="couple-selected-date-row" aria-label="selected date and next date">
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
export function renderHome(state, uiState = {}) {
  const selectedDate = uiState.selectedCalendarDate || getTodayDateKey();
  return `
    <section class="page couple-home">
      <div class="couple-screen">
        ${renderBrand()}
        ${renderCalendarDynamic(state.couple || {}, selectedDate)}
        ${renderSelectedDatePlan(state, state.couple || {}, selectedDate)}
      </div>
    </section>
  `;
}

export function renderTimeline(state, uiState = {}) {
  return renderHome(state, uiState);
}
