import { getIcon } from '../components/icons.js';
import { formatDate } from '../utils/date.js';

const COUPLE_MAGAZINE_STORAGE_KEY = 'couple-magazine-mvp-v1';

function readCoupleMagazineMvpState() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(COUPLE_MAGAZINE_STORAGE_KEY) || '{}') || {};
  } catch (error) {
    return {};
  }
}

function renderSelectablePosts(posts) {
  if (!posts.length) {
    return `
      <section class="empty-panel">
        <p class="empty-panel__title">まだまとめる投稿がありません</p>
        <p class="empty-panel__copy">先に投稿を作ると、ここで選んで一冊の下書きにできます。</p>
      </section>
    `;
  }

  return posts.map((post) => `
    <label class="issue-post-option">
      <input type="checkbox" name="issuePostIds" value="${post.id}" />
      <img src="${post.imageData}" alt="${post.authorName}の投稿画像" />
      <div class="issue-post-option__meta">
        <strong>${post.authorName}</strong>
        <span>${formatDate(post.createdAt)}</span>
      </div>
    </label>
  `).join('');
}

function renderIssues(issues, posts) {
  if (!issues.length) {
    return '<p class="empty-copy">まだ雑誌の下書きはありません。</p>';
  }

  return issues.map((issue) => {
    const selectedPosts = posts.filter((post) => issue.postIds.includes(post.id));
    return `
      <article class="issue-card issue-card--${issue.tone}">
        <p class="issue-card__eyebrow">memories issue</p>
        <h3 class="issue-card__title">${issue.title}</h3>
        <p class="issue-card__subtitle">${issue.subtitle || 'sub title free'}</p>
        <div class="issue-card__count">${selectedPosts.length} posts selected</div>
        <div class="issue-card__thumbs">
          ${selectedPosts.slice(0, 3).map((post) => `<img src="${post.imageData}" alt="${post.authorName}の投稿画像" />`).join('')}
        </div>
      </article>
    `;
  }).join('');
}

export function renderMagazine(state) {
  const mvpState = readCoupleMagazineMvpState();
  const memories = Array.isArray(state.recordMemories) ? state.recordMemories : [];
  const selectedMemoryIds = Array.isArray(mvpState.selectedMemoryIds) ? mvpState.selectedMemoryIds : [];
  const selectedMemories = memories.filter((memory) => selectedMemoryIds.includes(memory.id));
  const hasGeneratedCover = Boolean(mvpState.generatedAt) && selectedMemories.length > 0;
  return `
    <section class="page page--magazine">
      <header class="page-header page-header--with-back">
        <button class="button button--ghost page-back page-back--icon" type="button" data-home-nav="home" aria-label="Back">
          ${getIcon('returnLeft')}
        </button>
        <div>
          <p class="page-header__mini">issue builder</p>
          <h2 class="page-header__title">Magazine</h2>
        </div>
      </header>

      <section class="couple-magazine">
        <div class="section-head">
          <h3>ふたりの雑誌を作る</h3>
        </div>
        <p class="couple-magazine__lead">アプリ内で無料で見返せる、ふたりだけの小さな一冊を作ります。</p>

        <section class="couple-step">
          <h4>1. デート写真を選ぶ</h4>
          <div class="couple-photo-grid">
            ${memories.length ? memories.map((memory) => `
              <label class="couple-photo-option">
                <input type="checkbox" data-couple-memory value="${memory.id}" ${selectedMemoryIds.includes(memory.id) ? 'checked' : ''} />
                <img src="${memory.imageData}" alt="デート写真 ${formatDate(memory.createdAt)}" />
                <span>${memory.place || formatDate(memory.createdAt)}</span>
              </label>
            `).join('') : '<p class="empty-copy">先にrecordで写真を保存すると、ここで選べます。</p>'}
          </div>
        </section>

        <section class="couple-step">
          <h4>2. 表紙を自動作成</h4>
          <button class="button button--primary" type="button" data-couple-generate ${selectedMemories.length ? '' : 'disabled'}>表紙を作る</button>
          ${hasGeneratedCover ? '<p class="couple-badge">表紙ができました</p>' : ''}
          ${hasGeneratedCover ? `
            <article class="couple-cover-preview">
              <img src="${selectedMemories[0].imageData}" alt="雑誌表紙プレビュー" />
              <div>
                <p class="couple-cover-preview__eyebrow">couple issue</p>
                <h4>${mvpState.coverTitle || 'Our Date Issue'}</h4>
                <p>${mvpState.coverSubtitle || 'ふたりの時間を、静かに一冊へ。'}</p>
              </div>
            </article>
          ` : ''}
        </section>

        <section class="couple-step">
          <h4>3. 相手に一言を残す</h4>
          <textarea class="field__input couple-message" data-couple-message rows="3" maxlength="120" placeholder="いつもありがとう。次のデートも楽しみ。">${mvpState.partnerMessage || ''}</textarea>
        </section>

        <section class="couple-step couple-actions">
          <button class="button button--ghost" type="button" data-couple-open ${hasGeneratedCover ? '' : 'disabled'}>ふたりで開封する</button>
          <button class="button button--ghost" type="button" data-couple-paper ${hasGeneratedCover ? '' : 'disabled'}>紙で残す</button>
          <p class="couple-magazine__status" data-couple-status>${mvpState.statusText || ''}</p>
        </section>
      </section>

      <form class="issue-form" id="issueForm">
        <label class="field">
          <span class="field__label">表紙タイトル</span>
          <input class="field__input" type="text" name="title" maxlength="30" placeholder="例: april date issue" required />
        </label>

        <label class="field">
          <span class="field__label">サブタイトル</span>
          <input class="field__input" type="text" name="subtitle" maxlength="40" placeholder="例: cafe & calm sunday" />
        </label>

        <label class="field">
          <span class="field__label">雰囲気</span>
          <select class="field__input" name="tone">
            <option value="soft">soft pink</option>
            <option value="cream">cream beige</option>
            <option value="rose">dusty rose</option>
          </select>
        </label>

        <section class="issue-form__posts">
          <div class="section-head">
            <h3>まとめたい投稿を選ぶ</h3>
          </div>
          <div class="issue-post-grid">
            ${renderSelectablePosts(state.posts || [])}
          </div>
        </section>

        <button class="button button--primary button--full" type="submit">下書きを保存</button>
      </form>

      <section class="section-block">
        <div class="section-head">
          <h3>保存済みの雑誌下書き</h3>
        </div>
        <div class="issue-list">
          ${renderIssues(state.issues || [], state.posts || [])}
        </div>
      </section>
    </section>
  `;
}
