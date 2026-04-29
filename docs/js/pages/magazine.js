import { getIcon } from '../components/icons.js';
import { formatDate } from '../utils/date.js';

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
