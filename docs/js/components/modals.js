import { formatDate, formatDateTime } from '../utils/date.js';
import { getIcon } from './icons.js';

export function renderPreviewModal(post, options = {}) {
  if (!post) return '';
  const { canDelete = false } = options;
  const tags = [...(post.fixedTags || []), ...(post.freeTags || [])];

  return `
    <div class="overlay" data-close-preview>
      <section class="modal modal--preview" role="dialog" aria-modal="true" aria-label="ページプレビュー" onclick="event.stopPropagation()">
        <button class="modal__close" data-close-preview aria-label="Close">${getIcon('close')}</button>
        <img class="modal__image" src="${post.imageData}" alt="ふたりのページ" />
        <div class="modal__body">
          <div class="modal__author-row">
            <div>
              <p class="modal__author">ページを見る</p>
              <p class="modal__date">${formatDate(post.createdAt)}</p>
            </div>
          </div>
          ${post.caption ? `<p class="modal__caption">${post.caption}</p>` : ''}
          ${tags.length ? `<div class="modal__tags">${tags.map((tag) => `<span class="chip chip--soft">${tag}</span>`).join('')}</div>` : ''}
          ${canDelete ? `
            <div class="modal__actions">
              <button class="button button--ghost modal__delete" type="button" data-delete-post="${post.id}" aria-label="Delete post">
                ${getIcon('trash')}
              </button>
            </div>
          ` : ''}
        </div>
      </section>
    </div>
  `;
}

export function renderCommentsModal(post) {
  if (!post) return '';
  return `
    <div class="overlay" data-close-comments>
      <section class="modal modal--comments" role="dialog" aria-modal="true" aria-label="Comments" onclick="event.stopPropagation()">
        <div class="modal__header">
          <h3 class="modal__title">Comments</h3>
          <button class="modal__close" data-close-comments aria-label="Close">${getIcon('close')}</button>
        </div>
        <div class="comments-list">
          ${post.comments?.length ? post.comments.map((comment) => `
            <article class="comment-item">
              <p class="comment-item__text">${comment.text}</p>
              <span class="comment-item__date">${formatDateTime(comment.createdAt)}</span>
            </article>
          `).join('') : '<p class="empty-copy">No comments yet.</p>'}
        </div>
        <form class="comment-form" data-comment-form="${post.id}">
          <input class="field__input" type="text" name="comment" maxlength="80" placeholder="Write a comment" required />
          <button class="button button--primary" type="submit">Post</button>
        </form>
      </section>
    </div>
  `;
}
