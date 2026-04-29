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

function renderCalendar(couple = {}) {
  const nextEntry = (couple.calendarEntries || []).find((entry) => entry.id === couple.nextDateId)
    || (couple.calendarEntries || [])[0];
  const monthDate = nextEntry?.date || getTodayDateKey();
  const calendarDays = buildCalendarDays(monthDate);
  const markedDates = new Map((couple.calendarEntries || []).map((entry, index) => [
    entry.date,
    index % 2 === 0 ? 'rose' : 'sand',
  ]));
  return `
    <section class="couple-card couple-calendar-card" aria-label="カレンダー">
      <div class="couple-section-head">
        <h1>カレンダー</h1>
        <div class="couple-month">
          <span>2025年5月</span>
          <span>${getIcon('chevronRight')}</span>
        </div>
      </div>
      <div class="couple-calendar">
        ${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => `<span class="couple-calendar__dow">${day}</span>`).join('')}
        ${calendarWeeks.flatMap((week, weekIndex) => week.map((day, dayIndex) => {
          const inactive = (weekIndex === 0 && dayIndex < 3) || (weekIndex === 4 && dayIndex === 6);
          const mark = markedDays.get(day) || ({ 3: 'rose', 10: 'sand', 24: 'rose' })[day];
          return `<span class="couple-calendar__day ${inactive ? 'is-muted' : ''} ${mark ? `is-marked is-${mark}` : ''}">${day}</span>`;
        })).join('')}
      </div>
    </section>
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
    </section>
  `;
}

function renderNextDate(couple = {}) {
  const nextEntry = (couple.calendarEntries || []).find((entry) => entry.id === couple.nextDateId)
    || (couple.calendarEntries || [])[0];
  const date = nextEntry?.date ? new Date(`${nextEntry.date}T00:00:00`) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? `${date.getMonth() + 1}/${date.getDate()} ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}`
    : '5/3 Sat';
  const title = nextEntry?.title || '代官山カフェ';
  const time = nextEntry?.time || '11:00〜13:30';
  const note = nextEntry?.note || 'お気に入りのカフェで、ゆっくりおしゃべり。';
  return `
    <section class="couple-next-date-row" aria-label="次のデートと予定追加">
      <article class="couple-next-date couple-card">
        <div class="couple-next-date__body">
          <p class="couple-kicker">次のデート</p>
          <h2>${dateLabel}　${title}</h2>
          <p>${time}</p>
          <p>${note}</p>
        </div>
      </article>
      <button class="couple-add-date-card couple-card" type="button" data-open-date-add>
        デートを追加
        ${getIcon('chevronRight')}
      </button>
    </section>
  `;
}

function renderSelectedDatePlan(couple = {}, selectedDate = '') {
  const dateKey = selectedDate || getTodayDateKey();
  const entry = (couple.calendarEntries || []).find((item) => item.date === dateKey);
  const date = new Date(`${dateKey}T00:00:00`);
  const dateLabel = !Number.isNaN(date.getTime())
    ? `${date.getMonth() + 1}/${date.getDate()} ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}`
    : dateKey;

  if (!entry) {
    return `
      <section class="couple-selected-date couple-card">
        <p class="couple-kicker">選択した日</p>
        <h2>${dateLabel}</h2>
        <p>この日の予定はまだありません。</p>
      </section>
    `;
  }

  return `
    <section class="couple-selected-date couple-card">
      <p class="couple-kicker">選択した日</p>
      <h2>${dateLabel}　${entry.title}</h2>
      <p>${entry.time || '時間未設定'}</p>
      <p>${entry.place || '場所未設定'}</p>
      <p>${entry.note || 'この日の予定をふたりで整えます。'}</p>
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
        ${renderNextDate(state.couple || {})}
        ${renderSelectedDatePlan(state.couple || {}, selectedDate)}
      </div>
    </section>
  `;
}

export function renderTimeline(state, uiState = {}) {
  return renderHome(state, uiState);
}
