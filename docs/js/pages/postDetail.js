import { formatDate } from '../utils/date.js';
import { getIcon } from '../components/icons.js';
import { renderAvatarContent } from '../components/avatar.js';

function renderPostDetailCard(post, options = {}) {
  const {
    canDelete = false,
    canEdit = false,
    isActive = false,
    showActions = true,
    showOwnerMenu = false,
  } = options;
  const tags = [...(post.fixedTags || []), ...(post.freeTags || [])];

  return `
    <article class="post-detail-card" data-post-detail-card ${isActive ? 'data-post-detail-active' : ''}>
      <div class="post-detail-card__author-row">
        <div class="post-detail-card__author-main">
          <button class="avatar avatar-button" type="button" data-open-author="${post.authorName}" aria-label="Open ${post.authorName} profile">
            ${renderAvatarContent(post.authorAvatarData, post.authorIcon, `${post.authorName} avatar`)}
          </button>
          <div>
            <p class="post-card__author">${post.authorName}</p>
          </div>
        </div>
        ${(showOwnerMenu && canDelete) ? `
          <button class="post-detail-card__menu-button" type="button" data-post-owner-menu aria-label="Post options">
            ${getIcon('more')}
          </button>
        ` : ''}
      </div>

      <img class="post-detail-card__image" src="${post.imageData}" alt="${post.authorName} post image" />

      ${showActions ? `
        <div class="post-detail-card__action-row">
          <div class="post-detail-card__primary-actions">
            <button class="post-detail-card__icon ${post.liked ? 'is-active' : ''}" type="button" data-like="${post.id}" aria-label="Like post">
              ${getIcon('heart')}
            </button>
            <button class="post-detail-card__icon" type="button" data-comment="${post.id}" aria-label="Open comments">
              ${getIcon('comment')}
            </button>
          </div>
          <button class="post-detail-card__icon ${post.saved ? 'is-active' : ''}" type="button" data-save="${post.id}" aria-label="Save post">
            ${getIcon('save')}
          </button>
        </div>
      ` : ''}

      <div class="post-detail-card__content">
        <p class="post-detail-card__time">${formatDate(post.createdAt)}</p>
        ${tags.length ? `
          <div class="post-detail-card__tags">
            ${tags.map((tag) => `<button class="chip chip--soft post-detail-card__tag" type="button" data-post-tag="${tag}">${tag}</button>`).join('')}
          </div>
        ` : ''}
      </div>

      ${canDelete ? `
        <div class="post-detail-card__owner-actions" data-post-owner-actions hidden>
          <button class="post-detail-card__owner-button post-detail-card__owner-button--danger" type="button" data-delete-post="${post.id}">
            ${getIcon('trash')}
            <span>Delete</span>
          </button>
        </div>
      ` : ''}
    </article>
  `;
}

export function renderPostDetail(post, options = {}) {
  if (!post) {
    return `
      <section class="page page--post-detail">
        <header class="page-header page-header--with-back">
          <button class="button button--ghost page-back page-back--icon" type="button" data-close-post-detail aria-label="Back">
            ${getIcon('returnLeft')}
          </button>
          <div>
            <p class="page-header__mini">post view</p>
            <h2 class="page-header__title">Post</h2>
          </div>
        </header>
        <section class="empty-panel">
          <p class="empty-panel__title">Post not found</p>
        </section>
      </section>
    `;
  }

  const {
    posts = [post],
    currentUserName = '',
    title = post.authorName,
    showActions = true,
    showOwnerMenu = false,
  } = options;
  const feedPosts = posts.length ? posts : [post];

  return `
    <section class="page page--post-detail">
      <header class="post-detail-topbar">
        <button class="post-detail-topbar__button" type="button" data-close-post-detail aria-label="Back">
          ${getIcon('returnLeft')}
        </button>
        <strong class="post-detail-topbar__title">${title}</strong>
        <span class="post-detail-topbar__spacer" aria-hidden="true"></span>
      </header>

      <div class="post-detail-feed">
        ${feedPosts.map((feedPost) => {
          const ownsPost = feedPost.authorName === currentUserName;
          return renderPostDetailCard(feedPost, {
            canDelete: ownsPost,
            canEdit: ownsPost,
            isActive: feedPost.id === post.id,
            showActions,
            showOwnerMenu,
          });
        }).join('')}
      </div>
    </section>
  `;
}
