import { getIcon } from '../components/icons.js';

function daysUntil(dateString) {
  const target = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.max(0, Math.ceil((target - today) / 86400000));
}

export function renderProfile(state, uiState = {}) {
  const posts = (state.posts || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const anniversaryDate = state.couple?.anniversaryDate || '2025-05-15';
  const partnerA = state.profile?.name || 'You';
  const partnerB = state.couple?.partnerBName || 'Partner';

  return `
    <section class="page page--profile page--futari">
      <div class="futari-shell">
        <header class="futari-hero">
          <p class="couple-brand__word">BURN</p>
          <div class="couple-brand__line" aria-hidden="true"><span></span><span></span></div>
          <h1>ふたり</h1>
          <p>${partnerA} と ${partnerB} の予定と記録</p>
        </header>

        <section class="futari-stats couple-card">
          <div>
            <span>記念日</span>
            <strong>${anniversaryDate.replace(/-/g, '.')}</strong>
          </div>
          <div>
            <span>記念日まで</span>
            <strong>${daysUntil(anniversaryDate)}日</strong>
          </div>
          <div>
            <span>総ページ</span>
            <strong>${posts.length}</strong>
          </div>
        </section>

        <section class="futari-section">
          <button class="futari-date-list-link" type="button" data-open-date-list>
            <span>デート一覧</span>
            ${getIcon('chevronRight')}
          </button>
          <button class="futari-date-list-link" type="button" data-open-draft-list>
            <span>draft</span>
            ${getIcon('chevronRight')}
          </button>
          <button class="futari-date-list-link" type="button" data-open-todo-list>
            <span>やりたいことリスト</span>
            ${getIcon('chevronRight')}
          </button>
        </section>

        <section class="futari-invite couple-card">
          <div>
            <p class="couple-kicker">招待</p>
            <h2>相手を追加</h2>
            <p>認証と招待リンクはMVPでは仮UIです。後でSupabaseなどに接続できます。</p>
          </div>
          <button type="button">招待リンクを作る</button>
        </section>
      </div>
    </section>
  `;
}
