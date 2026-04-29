import { formatDate, timeAgo } from '../utils/date.js';
import { getIcon } from './icons.js';
import { renderAvatarContent } from './avatar.js';

function renderTagList(post) {
  const tags = [...(post.fixedTags || []), ...(post.freeTags || [])];
  if (!tags.length) {
    return '<div class="post-card__tags-empty">No tags yet</div>';
  }
  return tags.map((tag) => `<span class="chip chip--soft">${tag}</span>`).join('');
}

export function renderPostCard(post, options = {}) {
  const { mode = 'full' } = options;
  const showHead = mode !== 'compact';
  const showCaption = mode === 'full';
  const showDate = mode !== 'minimal';

  return `
    <article class="post-card post-card--${mode}" data-post-id="${post.id}">
      ${showHead ? `
        <div class="post-card__head">
          <button class="avatar avatar-button" type="button" data-open-author="${post.authorName}" aria-label="Open ${post.authorName} profile">
            ${renderAvatarContent(post.authorAvatarData, post.authorIcon, `${post.authorName} avatar`)}
          </button>
          <div class="post-card__author-wrap">
            <p class="post-card__author">${post.authorName}</p>
            <p class="post-card__time">${timeAgo(post.createdAt)}</p>
          </div>
        </div>
      ` : ''}

      <button class="post-card__image-button" data-open-preview="${post.id}" aria-label="Open post image">
        <img class="post-card__image" src="${post.imageData}" alt="${post.authorName} post" />
      </button>

      ${showCaption ? `
        <div class="post-card__caption-row">
          <button class="tag-toggle" data-toggle-tags="${post.id}">${getIcon('tag')} tags</button>
          ${post.caption ? `<p class="post-card__caption">${post.caption}</p>` : '<p class="post-card__caption post-card__caption--empty">No caption</p>'}
        </div>

        <div class="post-card__tags" data-tags-panel="${post.id}" hidden>
          ${renderTagList(post)}
        </div>
      ` : ''}

      <div class="post-card__meta">
        ${showDate ? `<span class="post-card__date">${formatDate(post.createdAt)}</span>` : '<span></span>'}
        <div class="post-card__actions">
          <button class="icon-button ${post.liked ? 'is-active' : ''}" data-like="${post.id}" aria-label="Like post">
            ${getIcon('heart')}
            <span>${post.likes}</span>
          </button>
          <button class="icon-button" data-comment="${post.id}" aria-label="Open comments">
            ${getIcon('comment')}
            <span>${post.comments?.length || 0}</span>
          </button>
          <button class="icon-button ${post.saved ? 'is-active' : ''}" data-save="${post.id}" aria-label="Save post">
            ${getIcon('save')}
            <span>${post.saves}</span>
          </button>
        </div>
      </div>
    </article>
  `;
}
