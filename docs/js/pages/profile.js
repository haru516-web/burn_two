import { getIcon } from '../components/icons.js';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDateAtStart(dateString) {
  const target = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  return target;
}

function daysSince(dateString) {
  const target = getDateAtStart(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!target) return 0;
  return Math.max(0, Math.floor((today - target) / 86400000));
}

function formatAnniversary(dateString) {
  return String(dateString || '2025-05-15').replace(/-/g, '.');
}

function renderCalendarIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4.5" y="5.8" width="15" height="13.2" rx="2.2"/>
      <path d="M8.2 4.2v3.2M15.8 4.2v3.2M4.5 9.4h15"/>
      <path d="M8 12.4h.1M12 12.4h.1M16 12.4h.1M8 15.6h.1M12 15.6h.1M16 15.6h.1"/>
    </svg>
  `;
}

function renderTodoRows(todos) {
  const visibleTodos = todos
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 3);
  if (!visibleTodos.length) {
    return '<p class="futari-dashboard-todo__empty">&#12420;&#12426;&#12383;&#12356;&#12371;&#12392;&#12434;&#36861;&#21152;&#12375;&#12390;&#12367;&#12384;&#12373;&#12356;</p>';
  }

  return visibleTodos.map((todo, index) => {
    const title = todo.title ? escapeHtml(todo.title) : '&#12420;&#12426;&#12383;&#12356;&#12371;&#12392;';
    return `
    <button class="futari-dashboard-todo__row ${todo.done ? 'is-done' : ''}" type="button" data-profile-toggle-todo="${escapeHtml(todo.id)}">
      <span class="futari-dashboard-todo__check" aria-hidden="true">${todo.done ? getIcon('check') : ''}</span>
      <span class="futari-dashboard-todo__title">${title}</span>
    </button>
  `;
  }).join('');
}

function renderProfileBook(profile = {}, isOpen = false) {
  const bio = escapeHtml(profile.bio || '');
  return `
    <section class="futari-dashboard-profile-book futari-dashboard-card">
      <button class="futari-dashboard-profile-book__button" type="button" data-profile-book-open>
        <img src="./image/profile_sheets/profile_sheet1.png" alt="" />
        <strong>&#12503;&#12525;&#12501;&#12451;&#12540;&#12523;&#24115;</strong>
        <small>${bio || '&#33258;&#20998;&#12398;&#12371;&#12392;&#12434;&#20837;&#21147;'}</small>
      </button>
    </section>
  `;
}

export function renderProfile(state, uiState = {}) {
  const posts = (state.posts || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const anniversaryDate = state.couple?.anniversaryDate || '2025-05-15';
  const totalDates = (state.couple?.calendarEntries || []).length;
  const todos = state.couple?.todos || [];

  return `
    <section class="page page--profile page--futari page--futari-dashboard">
      <div class="futari-dashboard-shell">
        <header class="futari-dashboard-hero">
          <button class="futari-dashboard-bell" type="button" aria-label="notifications">
            ${getIcon('bell')}
            <span></span>
          </button>
          <p class="couple-brand__word">BURN</p>
          <div class="couple-brand__line" aria-hidden="true"><span></span><span></span></div>
        </header>

        <section class="futari-dashboard-top">
          <article class="futari-dashboard-card futari-dashboard-card--anniversary">
            <div>
              <p>&#35352;&#24565;&#26085;</p>
              <strong>${escapeHtml(formatAnniversary(anniversaryDate))}</strong>
            </div>
            <i aria-hidden="true">&#9825;</i>
          </article>

          <article class="futari-dashboard-card futari-dashboard-card--days">
            <p>&#20184;&#12365;&#21512;&#12387;&#12390;&#12363;&#12425;</p>
            <strong>${daysSince(anniversaryDate)} <span>&#26085;</span></strong>
            <i aria-hidden="true">&#9829;</i>
          </article>
        </section>

        <section class="futari-dashboard-stats">
          <article class="futari-dashboard-card futari-dashboard-card--pages">
            <span class="futari-dashboard-soft-icon">${getIcon('bookOpen')}</span>
            <div>
              <p>&#32207;&#12506;&#12540;&#12472;</p>
              <strong>${posts.length}</strong>
            </div>
          </article>
          <article class="futari-dashboard-card futari-dashboard-card--dates">
            <div>
              <p>&#32207;&#12487;&#12540;&#12488;&#22238;&#25968;</p>
              <strong>${totalDates}<span>&#22238;</span></strong>
            </div>
            <span class="futari-dashboard-soft-icon">${renderCalendarIcon()}</span>
          </article>
        </section>

        <section class="futari-dashboard-mid">
          <section class="futari-dashboard-todo futari-dashboard-card">
            <div class="futari-dashboard-section-head">
              <h2>&#12420;&#12426;&#12383;&#12356;&#12371;&#12392;</h2>
              <button type="button" data-open-todo-list aria-label="todo list">${getIcon('chevronRight')}</button>
            </div>
            <div class="futari-dashboard-todo__list">
              ${renderTodoRows(todos)}
            </div>
            <button class="futari-dashboard-add" type="button" data-profile-open-todo-list>
              <span>+</span>
              &#36861;&#21152;&#12377;&#12427;
            </button>
          </section>
          ${renderProfileBook(state.profile || {})}
        </section>

        <section class="futari-dashboard-plus futari-dashboard-card">
          <div>
            <h2>BURN Plus <span>&#10022;</span></h2>
            <p>&#12486;&#12531;&#12503;&#12524;&#35299;&#25918;&#12539;&#24605;&#12356;&#20986;&#20445;&#23384;&#12539;&#29305;&#21029;&#12487;&#12470;&#12452;&#12531;</p>
            <small>&#12405;&#12383;&#12426;&#12398;&#26178;&#38291;&#12434;&#12289;&#12418;&#12387;&#12392;&#29305;&#21029;&#12395;&#12290;</small>
          </div>
          <button type="button">
            &#12503;&#12521;&#12531;&#12434;&#35211;&#12427;
            ${getIcon('chevronRight')}
          </button>
        </section>
      </div>
    </section>
  `;
}
