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
  const name = String(profile.name || 'you').trim() || 'you';
  return `
    <section class="futari-dashboard-profile-book futari-dashboard-card">
      <button class="futari-dashboard-profile-book__button" type="button" data-profile-book-open>
        <img src="./image/profile_sheets/profile_sheet1.png" alt="" />
        <strong>${escapeHtml(name)}の記録</strong>
      </button>
    </section>
  `;
}

function renderInviteLinkCard(invite = {}) {
  const hasCode = Boolean(invite.code);
  const status = invite.error || invite.message || '';
  return `
    <section class="futari-dashboard-invite futari-dashboard-card">
      <div class="futari-dashboard-invite__copy">
        <p>Invitation</p>
        <h2>招待コード</h2>
        <small>相手にコードを伝えるか、相手から届いたコードを入力して共有スペースに参加します。</small>
      </div>
      <button class="futari-dashboard-invite__button" type="button" data-create-invite-link ${invite.busy ? 'disabled' : ''}>
        ${invite.busy ? '発行中' : '招待コードを発行'}
      </button>
      ${hasCode ? `
        <div class="futari-dashboard-invite__result">
          <input type="text" readonly value="${escapeHtml(invite.code)}" data-invite-link-output aria-label="招待コード" />
          <button type="button" data-copy-invite-link aria-label="招待コードをコピー">
            ${getIcon('copy')}
          </button>
        </div>
      ` : ''}
      <form class="futari-dashboard-invite__result" data-settings-invite-code-form>
        <input type="text" name="inviteCode" value="${escapeHtml(invite.acceptCode || '')}" placeholder="招待コードを入力" autocomplete="off" />
        <button type="submit" ${invite.acceptBusy ? 'disabled' : ''}>${invite.acceptBusy ? '確認中' : '決定'}</button>
      </form>
      ${status ? `<p class="futari-dashboard-invite__status ${invite.error ? 'is-error' : ''}">${escapeHtml(status)}</p>` : ''}
    </section>
  `;
}

function maskPassword() {
  return '********';
}

function renderSettingsList() {
  const items = [
    ['account', 'アカウント情報'],
    ['partner', '相手'],
    ['disconnect', '共有解除'],
    ['logout', 'ログアウト'],
    ['delete', 'アカウント削除'],
  ];
  return `
    <section class="futari-settings-panel futari-dashboard-card">
      <div class="futari-settings-panel__head">
        <button type="button" data-profile-settings-close aria-label="戻る">${getIcon('arrowLeft')}</button>
        <h1>設定</h1>
      </div>
      <div class="futari-settings-list">
        ${items.map(([key, label]) => `
          <button class="futari-settings-list__item ${key === 'delete' ? 'is-danger' : ''}" type="button" data-profile-settings-view="${key}">
            <span>${label}</span>
            ${getIcon('chevronRight')}
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function renderAccountSettings(state = {}, uiState = {}) {
  const profile = state.profile || {};
  const couple = state.couple || {};
  const email = uiState.authUser?.email || '';
  return `
    <section class="futari-settings-panel futari-dashboard-card">
      <div class="futari-settings-panel__head">
        <button type="button" data-profile-settings-back aria-label="戻る">${getIcon('arrowLeft')}</button>
        <h1>アカウント情報</h1>
      </div>
      <form class="futari-settings-form" data-account-settings-form>
        <label>
          <span>名前</span>
          <input type="text" name="name" value="${escapeHtml(profile.name || '')}" maxlength="24" />
        </label>
        <label>
          <span>登録メール</span>
          <input type="email" value="${escapeHtml(email)}" readonly />
        </label>
        <label>
          <span>パスワード</span>
          <input type="text" value="${maskPassword()}" readonly />
        </label>
        <label>
          <span>記念日</span>
          <input type="date" name="anniversaryDate" value="${escapeHtml(couple.anniversaryDate || '')}" />
        </label>
        <label>
          <span>誕生日</span>
          <input type="date" name="birthday" value="${escapeHtml(profile.birthday || '')}" />
        </label>
        <button class="futari-settings-save" type="submit">保存</button>
      </form>
    </section>
  `;
}

function renderPartnerSettings(state = {}, uiState = {}) {
  const partner = uiState.partnerProfile || {};
  const hasPartner = Boolean(partner.hasPartner);
  const name = hasPartner ? partner.name : '';
  const birthday = hasPartner ? partner.birthday : '';
  return `
    <section class="futari-settings-panel futari-dashboard-card">
      <div class="futari-settings-panel__head">
        <button type="button" data-profile-settings-back aria-label="戻る">${getIcon('arrowLeft')}</button>
        <h1>相手</h1>
      </div>
      ${partner.loading ? `<p class="futari-settings-note">相手情報を読み込んでいます。</p>` : ''}
      <div class="futari-settings-partner ${hasPartner ? '' : 'is-pending'}">
        <div class="futari-settings-form futari-settings-form--readonly">
          <label>
            <span>名前</span>
            <input type="text" value="${escapeHtml(name)}" placeholder="名前" readonly disabled />
          </label>
          <label>
            <span>誕生日</span>
            <input type="date" value="${escapeHtml(birthday)}" readonly disabled />
          </label>
          <button class="futari-settings-save" type="button" disabled>保存</button>
        </div>
        ${hasPartner ? '' : '<div class="futari-settings-partner__veil">登録前</div>'}
      </div>
      ${hasPartner ? '' : renderInviteLinkCard(uiState.inviteLink || {})}
      ${partner.error ? `<p class="futari-settings-note is-error">${escapeHtml(partner.error)}</p>` : ''}
    </section>
  `;
}

function renderConfirmSettings(kind = 'logout', step = 1) {
  const isDelete = kind === 'delete';
  const isDisconnect = kind === 'disconnect';
  const total = isDelete ? 5 : 2;
  const title = isDelete ? 'アカウント削除' : isDisconnect ? '共有解除' : 'ログアウト';
  const body = isDelete
    ? 'アカウントと保存データを削除します。この操作は取り消せません。'
    : isDisconnect
      ? '相手との共有状態を解除して、自分だけの新しいスペースに切り替えます。共有済みの記録は相手側に残ります。'
      : 'この端末からログアウトします。';
  return `
    <section class="futari-settings-panel futari-dashboard-card">
      <div class="futari-settings-panel__head">
        <button type="button" data-profile-settings-back aria-label="戻る">${getIcon('arrowLeft')}</button>
        <h1>${title}</h1>
      </div>
      <div class="futari-settings-confirm">
        <p>${body}</p>
        <strong>${step} / ${total}</strong>
        <button class="${isDelete ? 'is-danger' : ''}" type="button" data-profile-confirm-action="${kind}">
          ${step >= total ? `${title}する` : '次へ'}
        </button>
      </div>
    </section>
  `;
}

function renderSettingsScreen(state = {}, uiState = {}) {
  switch (uiState.profileSection) {
    case 'settingsAccount':
      return renderAccountSettings(state, uiState);
    case 'settingsPartner':
      return renderPartnerSettings(state, uiState);
    case 'settingsDisconnect':
      return renderConfirmSettings('disconnect', uiState.settingsConfirmStep || 1);
    case 'settingsLogout':
      return renderConfirmSettings('logout', uiState.settingsConfirmStep || 1);
    case 'settingsDelete':
      return renderConfirmSettings('delete', uiState.settingsConfirmStep || 1);
    default:
      return renderSettingsList();
  }
}

function renderSettingsButtonIcon() {
  return `
    <svg class="futari-dashboard-settings__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M9.59 3.94c.09-.54.56-.94 1.11-.94h2.6c.55 0 1.02.4 1.11.94l.22 1.31c.06.38.32.69.66.85.08.04.16.08.24.13.33.19.73.21 1.09.08l1.24-.46c.52-.19 1.1.02 1.38.5l1.3 2.25c.27.48.17 1.09-.25 1.44l-1.02.85c-.3.25-.45.62-.42 1.01a5.7 5.7 0 0 1 0 .28c-.03.39.12.76.42 1.01l1.02.85c.42.35.52.96.25 1.44l-1.3 2.25c-.28.48-.86.69-1.38.5l-1.24-.46c-.36-.13-.76-.11-1.09.08-.08.05-.16.09-.24.13-.34.16-.6.47-.66.85l-.22 1.31c-.09.54-.56.94-1.11.94h-2.6c-.55 0-1.02-.4-1.11-.94l-.22-1.31c-.06-.38-.32-.69-.66-.85a5.49 5.49 0 0 1-.24-.13c-.33-.19-.73-.21-1.09-.08l-1.24.46c-.52.19-1.1-.02-1.38-.5l-1.3-2.25c-.27-.48-.17-1.09.25-1.44l1.02-.85c.3-.25.45-.62.42-1.01a5.7 5.7 0 0 1 0-.28c.03-.39-.12-.76-.42-1.01l-1.02-.85c-.42-.35-.52-.96-.25-1.44l1.3-2.25c.28-.48.86-.69 1.38-.5l1.24.46c.36.13.76.11 1.09-.08.08-.05.16-.09.24-.13.34-.16.6-.47.66-.85l.22-1.31Z"/>
      <circle cx="12" cy="12" r="3.05"/>
    </svg>
  `;
}

export function renderProfile(state, uiState = {}) {
  const posts = (state.posts || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const anniversaryDate = state.couple?.anniversaryDate || '2025-05-15';
  const totalDates = (state.couple?.calendarEntries || []).length;
  const todos = state.couple?.todos || [];
  const isSettings = String(uiState.profileSection || '').startsWith('settings');

  return `
    <section class="page page--profile page--futari page--futari-dashboard">
      <div class="futari-dashboard-shell">
        <header class="futari-dashboard-hero">
          <button class="futari-dashboard-settings" type="button" data-profile-open-settings aria-label="settings">
            ${renderSettingsButtonIcon()}
          </button>
          <button class="futari-dashboard-bell" type="button" aria-label="notifications">
            ${getIcon('bell')}
            <span></span>
          </button>
          <p class="couple-brand__word">BURN</p>
          <div class="couple-brand__line" aria-hidden="true"><span></span><span></span></div>
        </header>

        ${isSettings ? renderSettingsScreen(state, uiState) : `
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
          <button type="button" data-open-plus-plan>
            &#12503;&#12521;&#12531;&#12434;&#35211;&#12427;
            ${getIcon('chevronRight')}
          </button>
        </section>
        ${renderInviteLinkCard(uiState.inviteLink || {})}
        `}
      </div>
    </section>
  `;
}
